use tauri::State;
use crate::error::ApiError;
use crate::models::live_game::{BannedChampion, LiveGame, ParticipantRank};
use crate::models::summoner::ComprehensivePlayerData;
use crate::AppState;

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

    let participant_puuids: Vec<String> = game["participants"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|p| p["puuid"].as_str().map(|s| s.to_string()))
        .collect();

    let regional_url = state.riot_client.regional_url().to_string();
    let now = chrono::Utc::now().timestamp();
    let mut participant_ranks: Vec<ParticipantRank> = Vec::new();

    for p_puuid in &participant_puuids {
        // Cache hit: reuse ranked stats if fresher than 2 hours
        if let Ok(Some((cached_data, cached_at))) = crate::db::player_cache::get(&state.db, p_puuid) {
            if now - cached_at < 7200 {
                participant_ranks.push(rank_from_player_data(&cached_data, p_puuid));
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
    }))
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
