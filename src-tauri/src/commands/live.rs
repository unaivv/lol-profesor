use tauri::State;
use crate::error::ApiError;
use crate::models::live_game::{BannedChampion, LiveGame, ParticipantChampStats, ParticipantRank};
use crate::models::summoner::ComprehensivePlayerData;
use crate::AppState;
use crate::api::champions::get_champion_name;
use crate::api::groq_client::GroqApiClient;

#[tauri::command]
pub async fn get_live_game(
    puuid: String,
    state: State<'_, AppState>,
) -> Result<Option<LiveGame>, ApiError> {
    let url = format!(
        "{}/lol/spectator/v5/active-games/by-summoner/{}",
        state.riot_client.regional_url(),
        puuid
    );

    match state.riot_client.get::<serde_json::Value>(&url).await {
        Ok(game) => {
            let live = LiveGame {
                game_id: game["gameId"].clone(),
                game_mode: game["gameMode"].as_str().unwrap_or("").to_string(),
                game_type: game["gameType"].as_str().unwrap_or("").to_string(),
                game_start_time: game["gameStartTime"].as_i64().unwrap_or(0),
                map_id: game["mapId"].as_i64().unwrap_or(0),
                game_length: game["gameLength"].as_i64().unwrap_or(0),
                platform_id: game["platformId"].as_str().unwrap_or("").to_string(),
                game_queue_config_id: game["gameQueueConfigId"].as_i64().unwrap_or(0),
                participants: game["participants"].as_array().cloned().unwrap_or_default(),
                banned_champions: game["bannedChampions"].as_array().map(|arr| {
                    arr.iter().filter_map(|b| {
                        Some(BannedChampion {
                            champion_id: b["championId"].as_i64()?,
                            team_id: b["teamId"].as_i64()?,
                            pick_turn: b["pickTurn"].as_i64()?,
                        })
                    }).collect()
                }),
                participant_ranks: None,
                participant_champ_stats: None,
            };
            Ok(Some(live))
        }
        Err(ApiError::NotFound { .. }) => Ok(None),
        Err(e) => Err(e),
    }
}

#[tauri::command]
pub async fn get_live_game_with_ranks(
    puuid: String,
    state: State<'_, AppState>,
) -> Result<Option<LiveGame>, ApiError> {
    let spectator_url = format!(
        "{}/lol/spectator/v5/active-games/by-summoner/{}",
        state.riot_client.regional_url(),
        puuid
    );

    let game = match state.riot_client.get::<serde_json::Value>(&spectator_url).await {
        Ok(g) => g,
        Err(ApiError::NotFound { .. }) => return Ok(None),
        Err(e) => return Err(e),
    };

    let banned_champions = game["bannedChampions"].as_array().map(|arr| {
        arr.iter().filter_map(|b| {
            Some(BannedChampion {
                champion_id: b["championId"].as_i64()?,
                team_id: b["teamId"].as_i64()?,
                pick_turn: b["pickTurn"].as_i64()?,
            })
        }).collect()
    });

    let participant_infos: Vec<(String, i64)> = game["participants"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|p| {
            let puuid = p["puuid"].as_str()?.to_string();
            let champ_id = p["championId"].as_i64().unwrap_or(0);
            Some((puuid, champ_id))
        })
        .collect();

    let regional_url = state.riot_client.regional_url().to_string();
    let now = chrono::Utc::now().timestamp();
    let mut participant_ranks: Vec<ParticipantRank> = Vec::new();
    let mut participant_champ_stats: Vec<ParticipantChampStats> = Vec::new();

    for (p_puuid, champ_id) in &participant_infos {
        // Cache hit: reuse ranked stats and compute champ stats if fresher than 2 hours
        if let Ok(Some((cached_data, cached_at))) = crate::db::player_cache::get(&state.db, p_puuid) {
            if now - cached_at < 7200 {
                participant_ranks.push(rank_from_player_data(&cached_data, p_puuid));
                if let Some(stats) = champ_stats_from_matches(&cached_data.matches, p_puuid, *champ_id) {
                    participant_champ_stats.push(stats);
                }
                continue;
            }
        }

        // Cache miss: fetch ranked endpoint only, with delay to respect rate limits
        tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;

        let ranked_url = format!("{}/lol/league/v4/entries/by-puuid/{}", regional_url, p_puuid);
        let rank = match state.riot_client.get::<serde_json::Value>(&ranked_url).await {
            Ok(entries) => rank_from_entries(&entries, p_puuid),
            Err(_) => ParticipantRank {
                puuid: p_puuid.clone(),
                tier: "UNRANKED".to_string(),
                rank: "".to_string(),
                lp: 0,
                wins: 0,
                losses: 0,
            },
        };
        participant_ranks.push(rank);
    }

    Ok(Some(LiveGame {
        game_id: game["gameId"].clone(),
        game_mode: game["gameMode"].as_str().unwrap_or("").to_string(),
        game_type: game["gameType"].as_str().unwrap_or("").to_string(),
        game_start_time: game["gameStartTime"].as_i64().unwrap_or(0),
        map_id: game["mapId"].as_i64().unwrap_or(0),
        game_length: game["gameLength"].as_i64().unwrap_or(0),
        platform_id: game["platformId"].as_str().unwrap_or("").to_string(),
        game_queue_config_id: game["gameQueueConfigId"].as_i64().unwrap_or(0),
        participants: game["participants"].as_array().cloned().unwrap_or_default(),
        banned_champions,
        participant_ranks: Some(participant_ranks),
        participant_champ_stats: if participant_champ_stats.is_empty() { None } else { Some(participant_champ_stats) },
    }))
}

fn champ_stats_from_matches(
    matches: &[crate::models::match_::Match],
    puuid: &str,
    champion_id: i64,
) -> Option<ParticipantChampStats> {
    let champ: Vec<_> = matches.iter()
        .filter(|m| m.champion_id == Some(champion_id))
        .collect();
    if champ.is_empty() { return None; }
    let games = champ.len() as i64;
    let wins = champ.iter().filter(|m| m.win == Some(true)).count() as i64;
    let avg_kills   = champ.iter().filter_map(|m| m.kills).sum::<i64>() as f64 / games as f64;
    let avg_deaths  = champ.iter().filter_map(|m| m.deaths).sum::<i64>() as f64 / games as f64;
    let avg_assists = champ.iter().filter_map(|m| m.assists).sum::<i64>() as f64 / games as f64;
    Some(ParticipantChampStats { puuid: puuid.to_string(), games, wins, avg_kills, avg_deaths, avg_assists })
}

fn rank_from_player_data(data: &ComprehensivePlayerData, puuid: &str) -> ParticipantRank {
    let solo = data.ranked_stats.as_ref().and_then(|rs| rs.solo.as_ref());
    match solo {
        Some(s) => ParticipantRank {
            puuid: puuid.to_string(),
            tier: s.tier.clone(),
            rank: s.rank.clone(),
            lp: s.league_points,
            wins: s.wins,
            losses: s.losses,
        },
        None => ParticipantRank {
            puuid: puuid.to_string(),
            tier: "UNRANKED".to_string(),
            rank: "".to_string(),
            lp: 0,
            wins: 0,
            losses: 0,
        },
    }
}

fn rank_from_entries(entries: &serde_json::Value, puuid: &str) -> ParticipantRank {
    let solo = entries.as_array().and_then(|arr| {
        arr.iter().find(|e| e["queueType"].as_str() == Some("RANKED_SOLO_5x5"))
    });
    match solo {
        Some(e) => ParticipantRank {
            puuid: puuid.to_string(),
            tier: e["tier"].as_str().unwrap_or("UNRANKED").to_string(),
            rank: e["rank"].as_str().unwrap_or("").to_string(),
            lp: e["leaguePoints"].as_i64().unwrap_or(0),
            wins: e["wins"].as_i64().unwrap_or(0),
            losses: e["losses"].as_i64().unwrap_or(0),
        },
        None => ParticipantRank {
            puuid: puuid.to_string(),
            tier: "UNRANKED".to_string(),
            rank: "".to_string(),
            lp: 0,
            wins: 0,
            losses: 0,
        },
    }
}

/// Returns the role label inferred from a participant's position in their team array (0-4 = top/jg/mid/bot/sup).
fn role_from_index(idx: usize) -> &'static str {
    match idx {
        0 => "Top",
        1 => "Jungle",
        2 => "Mid",
        3 => "ADC/Bot",
        4 => "Support",
        _ => "Unknown",
    }
}

#[tauri::command]
pub async fn get_live_build_advice(
    my_puuid: String,
    participants: Vec<serde_json::Value>,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, ApiError> {
    let groq_api_key = state.groq_api_key.clone().ok_or_else(|| ApiError::NotConfigured {
        feature: "GROQ_API_KEY".to_string(),
    })?;

    // Find the user's participant entry and their team
    let me = participants.iter().find(|p| p["puuid"].as_str() == Some(&my_puuid))
        .ok_or_else(|| ApiError::NotFound { message: "Player not found in participants".to_string() })?;

    let my_team_id = me["teamId"].as_i64().unwrap_or(100);
    let my_champ_id = me["championId"].as_i64().unwrap_or(0) as u32;
    let my_champ = get_champion_name(my_champ_id);

    // Split teams, preserving original order (approximates role order: top/jg/mid/bot/sup)
    let my_team: Vec<&serde_json::Value> = participants.iter()
        .filter(|p| p["teamId"].as_i64().unwrap_or(0) == my_team_id)
        .collect();
    let enemy_team: Vec<&serde_json::Value> = participants.iter()
        .filter(|p| p["teamId"].as_i64().unwrap_or(0) != my_team_id)
        .collect();

    // My position index in my team → infer role and lane opponent
    let my_idx = my_team.iter().position(|p| p["puuid"].as_str() == Some(&my_puuid)).unwrap_or(0);
    let my_role = role_from_index(my_idx);

    let lane_opponent_champ = enemy_team.get(my_idx)
        .map(|p| get_champion_name(p["championId"].as_i64().unwrap_or(0) as u32))
        .unwrap_or_else(|| "Unknown".to_string());

    let my_team_names: Vec<String> = my_team.iter()
        .enumerate()
        .map(|(i, p)| format!("{} ({})", get_champion_name(p["championId"].as_i64().unwrap_or(0) as u32), role_from_index(i)))
        .collect();

    let enemy_team_names: Vec<String> = enemy_team.iter()
        .enumerate()
        .map(|(i, p)| format!("{} ({})", get_champion_name(p["championId"].as_i64().unwrap_or(0) as u32), role_from_index(i)))
        .collect();

    let prompt = format!(
        r#"You are an expert League of Legends coach. Generate build advice for the following live game situation.

PLAYER: {} playing as {} (role: {})
MY TEAM: {}
ENEMY TEAM: {}
LANE OPPONENT: {} ({})

Generate 3 build scenarios. Respond ONLY with valid JSON in this exact format:
{{
  "champion": "{champion}",
  "role": "{role}",
  "optimal": {{
    "keystone": "Name of the keystone rune",
    "secondary_tree": "Name of secondary rune tree",
    "core_items": ["Item1", "Item2", "Item3"],
    "boots": "Boots name",
    "situational": ["SituationalItem1", "SituationalItem2"],
    "tips": "2-3 sentence playstyle tip for this champion in this role"
  }},
  "vs_lane": {{
    "opponent": "{lane_opp}",
    "keystone": "Adjusted keystone if different, else same",
    "item_changes": ["Item to prioritize or swap", "Reason why"],
    "tips": "2-3 sentences on how to play vs this specific lane opponent"
  }},
  "vs_comp": {{
    "comp_type": "Brief label e.g. 'Heavy CC', 'Poke heavy', 'Dive comp'",
    "item_changes": ["Item against this comp", "Reason why"],
    "tips": "2-3 sentences on how to adapt to the full enemy team composition"
  }}
}}"#,
        my_champ, my_champ, my_role,
        my_team_names.join(", "),
        enemy_team_names.join(", "),
        lane_opponent_champ, my_role,
        champion = my_champ,
        role = my_role,
        lane_opp = lane_opponent_champ,
    );

    let groq = GroqApiClient::new(groq_api_key);
    let response_text = tokio::time::timeout(
        std::time::Duration::from_secs(30),
        groq.chat_completion(&prompt),
    )
    .await
    .map_err(|_| ApiError::Timeout)??;

    let parsed: serde_json::Value = serde_json::from_str(&response_text)
        .map_err(|e| ApiError::Unknown { message: format!("Failed to parse build advice: {}", e) })?;

    Ok(parsed)
}
