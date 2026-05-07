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

/// Translates a summoner spell ID to its Spanish name for the Groq prompt.
fn spell_es(id: i64) -> &'static str {
    match id {
        1  => "Purificar",
        3  => "Agotar",
        4  => "Flash",
        6  => "Fantasmal",
        7  => "Curar",
        11 => "Castigar",   // Smite
        12 => "Teletransportar",
        14 => "Encender",
        21 => "Barrera",
        32 => "Bola de nieve",
        _  => "Hechizo",
    }
}

/// Formats a participant as "ChampionName (Hechizo1/Hechizo2)" for the Groq prompt.
fn format_participant(p: &serde_json::Value, champ_name: &str) -> String {
    let s1 = p["spell1Id"].as_i64().unwrap_or(4);
    let s2 = p["spell2Id"].as_i64().unwrap_or(4);
    format!("{} ({}/{})", champ_name, spell_es(s1), spell_es(s2))
}

#[tauri::command]
pub async fn get_live_build_advice(
    my_puuid: String,
    my_champion_name: String,
    participants: Vec<serde_json::Value>,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, ApiError> {
    let groq_api_key = state.groq_api_key.clone().ok_or_else(|| ApiError::NotConfigured {
        feature: "GROQ_API_KEY".to_string(),
    })?;

    // Find user's team using puuid; fall back to team 100 if not found
    let my_team_id = participants.iter()
        .find(|p| p["puuid"].as_str() == Some(&my_puuid))
        .and_then(|p| p["teamId"].as_i64())
        .unwrap_or(100);

    // Split teams (order in the array is NOT guaranteed to match roles)
    let my_team: Vec<&serde_json::Value> = participants.iter()
        .filter(|p| p["teamId"].as_i64().unwrap_or(0) == my_team_id)
        .collect();
    let enemy_team: Vec<&serde_json::Value> = participants.iter()
        .filter(|p| p["teamId"].as_i64().unwrap_or(0) != my_team_id)
        .collect();

    // Use championName field enriched by the frontend (correct DDragon names)
    let champ_name_from = |p: &&serde_json::Value| -> String {
        p["championName"].as_str()
            .filter(|n| !n.is_empty() && !n.starts_with("Champion"))
            .map(|n| n.to_string())
            .unwrap_or_else(|| get_champion_name(p["championId"].as_i64().unwrap_or(0) as u32))
    };

    // My participant entry (for spell-based role hint)
    let me = my_team.iter().find(|p| p["puuid"].as_str() == Some(&my_puuid));
    let my_entry = format_participant(
        me.copied().unwrap_or(&serde_json::Value::Null),
        &my_champion_name,
    );

    let my_team_fmt: Vec<String> = my_team.iter()
        .map(|p| format_participant(p, &champ_name_from(p)))
        .collect();

    let enemy_team_fmt: Vec<String> = enemy_team.iter()
        .map(|p| format_participant(p, &champ_name_from(p)))
        .collect();

    let prompt = format!(
        r#"Eres un coach experto de League of Legends. Genera consejos de build para la siguiente situación de partida en vivo.

JUGADOR: {}
IMPORTANTE: El orden de los jugadores en el array NO refleja su rol. Usa los hechizos de invocador y el campeón para deducir el rol del jugador y su rival de línea más probable.
  - Castigar (Smite) → Jungla
  - Curar (Heal) → ADC o Support
  - Teletransportar → Top o Mid
  - Encender → Mid, Support o Top agresivo
  - Flash es universal y no determina rol

MI EQUIPO (Campeón + Hechizos):
{}

EQUIPO ENEMIGO (Campeón + Hechizos):
{}

Genera 3 escenarios de build. Responde SOLO con JSON válido en este formato exacto. TODOS los textos en español:
{{
  "champion": "{}",
  "role": "rol inferido en español (Top/Jungla/Mid/ADC/Support/ARAM)",
  "optimal": {{
    "keystone": "Nombre de la runa primaria",
    "secondary_tree": "Nombre del árbol de runas secundario",
    "core_items": ["Objeto1", "Objeto2", "Objeto3"],
    "boots": "Nombre de las botas",
    "situational": ["ObjetoSituacional1", "ObjetoSituacional2"],
    "tips": "2-3 frases en español sobre el estilo de juego de este campeón en su rol"
  }},
  "vs_lane": {{
    "opponent": "campeón rival de línea inferido, o vacío si es ARAM",
    "keystone": "Runa ajustada si es diferente, si no la misma",
    "item_changes": ["Objeto a priorizar o cambiar y por qué"],
    "tips": "2-3 frases en español sobre cómo jugar contra este rival de línea específico"
  }},
  "vs_comp": {{
    "comp_type": "Etiqueta breve en español ej: 'Composición de CC', 'Poke', 'Dive'",
    "item_changes": ["Objeto contra esta composición y motivo"],
    "tips": "2-3 frases en español sobre cómo adaptarse a la composición enemiga"
  }}
}}"#,
        my_entry,
        my_team_fmt.join("\n"),
        enemy_team_fmt.join("\n"),
        my_champion_name,
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
