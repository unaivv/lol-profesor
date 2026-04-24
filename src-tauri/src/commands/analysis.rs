use tauri::State;
use crate::error::ApiError;
use crate::models::analysis::{MatchAnalysis, MatchInsight, PlayerStats};
use crate::AppState;
use crate::db::{match_cache, analysis_cache};
use crate::api::groq_client::GroqApiClient;

fn detect_player_role(player: &serde_json::Value) -> String {
    let lane = player["lane"].as_str().unwrap_or("UNKNOWN");
    let role = player["role"].as_str().unwrap_or("");

    match lane {
        "TOP" => return "top".to_string(),
        "JUNGLE" => return "jungle".to_string(),
        "MIDDLE" => return "mid".to_string(),
        "BOTTOM" => {
            if role == "SUPPORT" {
                return "support".to_string();
            }
            return "adc".to_string();
        }
        "UTILITY" => return "support".to_string(),
        _ => {}
    }

    // Fallback: guess from champion name
    let champ = player["championName"]
        .as_str()
        .unwrap_or("")
        .to_lowercase();

    let supports = [
        "nami", "leona", "thresh", "blitzcrank", "lulu", "soraka", "janna", "karma", "braum",
        "tahm", "renata", "milio", "rakan", "xayah",
    ];
    let adcs = [
        "jinx",
        "kai sa",
        "vayne",
        "lucian",
        "ezreal",
        "jhin",
        "ashe",
        "tristana",
        "caitlyn",
        "miss fortune",
        "draven",
        "sivir",
        "varus",
        "kaisa",
    ];

    if supports.iter().any(|s| champ.contains(s)) {
        return "support".to_string();
    }
    if adcs.iter().any(|a| champ.contains(a)) {
        return "adc".to_string();
    }

    "mid".to_string()
}

fn format_duration(seconds: f64) -> String {
    let mins = (seconds / 60.0).floor() as i64;
    let secs = (seconds % 60.0) as i64;
    format!("{}:{:02}", mins, secs)
}

fn build_timeline_analysis(match_data: &serde_json::Value, player: &serde_json::Value) -> String {
    let events = match match_data["events"].as_array() {
        Some(e) => e,
        None => return "No eventos significativos".to_string(),
    };

    let player_participant_id = player["participantId"].as_i64().unwrap_or(-1);
    let player_puuid = player["puuid"].as_str().unwrap_or("");
    let participants = match_data["participants"].as_array();

    let mut highlights: Vec<String> = vec![];

    // Early deaths (before 4 minutes = 240000ms)
    for event in events.iter() {
        if highlights.len() >= 10 {
            break;
        }
        if event["type"].as_str() != Some("CHAMPION_KILL") {
            continue;
        }
        let victim_id = event["victimId"].as_i64().unwrap_or(-1);
        let timestamp = event["timestamp"].as_i64().unwrap_or(0);

        if victim_id == player_participant_id && timestamp < 240000 {
            let killer_id = event["killerId"].as_i64().unwrap_or(-1);
            let killer_name = participants
                .and_then(|parts| {
                    parts
                        .iter()
                        .find(|p| p["participantId"].as_i64() == Some(killer_id))
                })
                .and_then(|p| p["championName"].as_str())
                .unwrap_or("enemigo");
            let x = event["position"]["x"].as_i64().unwrap_or(0);
            let y = event["position"]["y"].as_i64().unwrap_or(0);
            let location = if x < 5000 && y < 5000 {
                "BASE"
            } else if x > 10000 || y > 10000 {
                "enemy jungle"
            } else {
                "lane"
            };
            highlights.push(format!(
                "[{}] Muerte temprana en {} contra {}",
                format_duration(timestamp as f64 / 1000.0),
                location,
                killer_name
            ));
        }
    }

    // Deaths in base after 5 minutes
    for event in events.iter() {
        if highlights.len() >= 10 {
            break;
        }
        if event["type"].as_str() != Some("CHAMPION_KILL") {
            continue;
        }
        let victim_id = event["victimId"].as_i64().unwrap_or(-1);
        let timestamp = event["timestamp"].as_i64().unwrap_or(0);
        let x = event["position"]["x"].as_i64().unwrap_or(0);
        let y = event["position"]["y"].as_i64().unwrap_or(0);

        if victim_id == player_participant_id && timestamp > 300000 && x < 5000 && y < 5000 {
            highlights.push(format!(
                "[{}] Muerte en BASE (posible dive o backdoor enemigo)",
                format_duration(timestamp as f64 / 1000.0)
            ));
        }
    }

    // First blood given very early
    let first_death = events
        .iter()
        .filter(|e| {
            e["type"].as_str() == Some("CHAMPION_KILL")
                && e["victimId"].as_i64() == Some(player_participant_id)
        })
        .next();

    if let Some(death) = first_death {
        if death["timestamp"].as_i64().unwrap_or(i64::MAX) < 60000 {
            highlights.push("[0:60] First Blood entregado - evita fights tempranos".to_string());
        }
    }

    // Solo kills (no assists)
    for event in events.iter() {
        if highlights.len() >= 10 {
            break;
        }
        if event["type"].as_str() != Some("CHAMPION_KILL") {
            continue;
        }
        let killer_id = event["killerId"].as_i64().unwrap_or(-1);
        if killer_id != player_participant_id {
            continue;
        }
        let assists_empty = event["assistingParticipantIds"]
            .as_array()
            .map(|a| a.is_empty())
            .unwrap_or(true);

        if assists_empty {
            let victim_id = event["victimId"].as_i64().unwrap_or(-1);
            let victim_name = participants
                .and_then(|parts| {
                    parts
                        .iter()
                        .find(|p| p["participantId"].as_i64() == Some(victim_id))
                })
                .and_then(|p| p["championName"].as_str())
                .unwrap_or("enemigo");
            let ts = event["timestamp"].as_i64().unwrap_or(0);
            highlights.push(format!(
                "[{}] SOLO KILL contra {}",
                format_duration(ts as f64 / 1000.0),
                victim_name
            ));
        }
    }

    // Double kills (two kills within 10 seconds)
    let player_kill_times: Vec<i64> = events
        .iter()
        .filter(|e| {
            e["type"].as_str() == Some("CHAMPION_KILL")
                && e["killerId"].as_i64() == Some(player_participant_id)
        })
        .filter_map(|e| e["timestamp"].as_i64())
        .collect();

    for i in 0..player_kill_times.len().saturating_sub(1) {
        if highlights.len() >= 10 {
            break;
        }
        if player_kill_times[i + 1] - player_kill_times[i] < 10000 {
            highlights.push(format!(
                "[{}] DOUBLE KILL",
                format_duration(player_kill_times[i] as f64 / 1000.0)
            ));
        }
    }

    // Baron stolen by enemy
    let baron_steal = events.iter().find(|e| {
        e["type"].as_str() == Some("ELITE_MONSTER_KILL")
            && e["monsterType"].as_str() == Some("BARON_NASHOR")
            && e["victimId"].is_object() // was stolen
            && participants
                .and_then(|parts| {
                    parts.iter().find(|p| {
                        p["participantId"].as_i64() == e["killerId"].as_i64()
                            && p["puuid"].as_str() != Some(player_puuid)
                    })
                })
                .is_some()
    });

    if let Some(steal) = baron_steal {
        let ts = steal["timestamp"].as_i64().unwrap_or(0);
        highlights.push(format!(
            "[{}] Baron robado por enemigo",
            format_duration(ts as f64 / 1000.0)
        ));
    }

    if highlights.is_empty() {
        "No eventos significativos".to_string()
    } else {
        highlights.join("\n")
    }
}

fn build_prompt(match_info: &serde_json::Value, player_puuid: &str) -> Result<String, ApiError> {
    let participants = match_info["participants"].as_array().ok_or_else(|| {
        ApiError::Unknown {
            message: "No participants in match data".to_string(),
        }
    })?;

    let player = participants
        .iter()
        .find(|p| p["puuid"].as_str() == Some(player_puuid))
        .ok_or_else(|| ApiError::NotFound {
            message: "Player not found in match".to_string(),
        })?;

    let player_team_id = player["teamId"].as_i64().unwrap_or(100);
    let blue_team: Vec<&serde_json::Value> = participants
        .iter()
        .filter(|p| p["teamId"].as_i64() == Some(100))
        .collect();
    let red_team: Vec<&serde_json::Value> = participants
        .iter()
        .filter(|p| p["teamId"].as_i64() == Some(200))
        .collect();
    let current_team: &Vec<&serde_json::Value> = if player_team_id == 100 {
        &blue_team
    } else {
        &red_team
    };

    // Team stats
    let team_gold: i64 = current_team
        .iter()
        .map(|p| p["goldEarned"].as_i64().unwrap_or(0))
        .sum();
    let team_damage: i64 = current_team
        .iter()
        .map(|p| p["totalDamageDealtToChampions"].as_i64().unwrap_or(0))
        .sum();
    let team_cs: i64 = current_team
        .iter()
        .map(|p| {
            p["totalMinionsKilled"].as_i64().unwrap_or(0)
                + p["neutralMinionsKilled"].as_i64().unwrap_or(0)
        })
        .sum();

    let player_gold = player["goldEarned"].as_i64().unwrap_or(0);
    let player_damage = player["totalDamageDealtToChampions"].as_i64().unwrap_or(0);
    let player_cs = player["totalMinionsKilled"].as_i64().unwrap_or(0)
        + player["neutralMinionsKilled"].as_i64().unwrap_or(0);

    let game_duration = match_info["gameDuration"].as_f64().unwrap_or(1.0);
    let cs_per_min = if game_duration > 0.0 {
        format!("{:.1}", player_cs as f64 / (game_duration / 60.0))
    } else {
        "0.0".to_string()
    };

    let gold_percent = if team_gold > 0 {
        format!("{:.1}", player_gold as f64 / team_gold as f64 * 100.0)
    } else {
        "0".to_string()
    };
    let damage_percent = if team_damage > 0 {
        format!("{:.1}", player_damage as f64 / team_damage as f64 * 100.0)
    } else {
        "0".to_string()
    };
    let cs_percent = if team_cs > 0 {
        format!("{:.1}", player_cs as f64 / team_cs as f64 * 100.0)
    } else {
        "0".to_string()
    };

    let kills = player["kills"].as_i64().unwrap_or(0);
    let deaths = player["deaths"].as_i64().unwrap_or(0);
    let assists = player["assists"].as_i64().unwrap_or(0);
    let vision_score = player["visionScore"].as_i64().unwrap_or(0);
    let wards_placed = player["wardsPlaced"].as_i64().unwrap_or(0);

    // Kill participation
    let team_kills: i64 = current_team
        .iter()
        .map(|p| p["kills"].as_i64().unwrap_or(0))
        .sum();
    let kp_percent = if team_kills > 0 {
        format!(
            "{:.1}",
            (kills + assists) as f64 / team_kills as f64 * 100.0
        )
    } else {
        "0".to_string()
    };

    let champion_name = player["championName"].as_str().unwrap_or("Unknown");
    let role = detect_player_role(player);

    let timeline_analysis = build_timeline_analysis(match_info, player);

    let prompt = format!(
        r#"Analiza el rendimiento de {} (rol: {}) y genera 4-6 insights SOLO sobre ESTE jugador.

REGLAS ESTRICTAS - CUALQUIER insight que mencione otro jugador es INVÁLIDO:
- NO digas nombres de compañeros (Smolder, Lux, etc.)
- NO recomiendes ayudar a otros jugadores
- NO menciones la estrategia/funcionamiento del equipo
- SOLO puedes usar números: "% del equipo", "次Mejor del equipo", etc.
- Cada insight debe empezar con "Tu..."

EJEMPLOS VÁLIDOS:
✓ "Tu daño es 15000 (25% del equipo) - estás en el percentil 60"
✓ "Tu CS es 180 (32.5% del equipo) - primero en tu línea"
✓ "Tu visión (18) está por debajo del promedio del equipo (22)"
✓ "3 muertes en early game (min 0-10) - alto riesgo de snowball enemy"

EJEMPLOS INVÁLIDOS (estos hacen que tu respuesta sea rechazada):
✗ "Smolder tiene más CS que tú"
✗ "Lux necesita más visión"
✗ "La estrategia del equipo no funcionó"
✗ "Ayuda a tu support con wards"

DATOS ESTADÍSTICOS DE {}:
- KDA: {}/{}/{}
- Daño a campeones: {} ({}% del equipo)
- Oro: {} ({}% del equipo)
- CS total: {} ({}% del equipo)
- CS/min: {}
- Visión score: {}
- Wards placed: {}
- Kill participation: {}%

{}

RESPUESTA (JSON) - IMPORTANTE: Los 4-6 insights deben ser sobre TEMAS DIFERENTES (no todos de CS, no todos de visión, etc.):
{{
  "insights": [
    {{"type": "positive|negative|improvement", "title": "...", "description": "...", "priority": 1-3}}
  ],
  "summary": "..."
}}"#,
        champion_name,
        role.to_uppercase(),
        champion_name.to_uppercase(),
        kills,
        deaths,
        assists,
        player_damage,
        damage_percent,
        player_gold,
        gold_percent,
        player_cs,
        cs_percent,
        cs_per_min,
        vision_score,
        wards_placed,
        kp_percent,
        timeline_analysis,
    );

    Ok(prompt)
}

#[tauri::command]
pub async fn analyze_match(
    match_id: String,
    puuid: String,
    state: State<'_, AppState>,
) -> Result<MatchAnalysis, ApiError> {
    // Check analysis cache
    if let Ok(Some(cached_json)) = analysis_cache::get(&state.db, &match_id, &puuid) {
        if let Ok(analysis) = serde_json::from_str::<MatchAnalysis>(&cached_json) {
            return Ok(analysis);
        }
    }

    // Check Groq API key
    let groq_api_key = state
        .groq_api_key
        .clone()
        .ok_or_else(|| ApiError::NotConfigured {
            feature: "GROQ_API_KEY".to_string(),
        })?;

    // Load raw match from SQLite
    let match_info = match_cache::get_raw(&state.db, &match_id)?.ok_or_else(|| {
        ApiError::NotFound {
            message: format!("Match {} not found in cache. Fetch the match first.", match_id),
        }
    })?;

    // Build prompt and call Groq
    let prompt = build_prompt(&match_info, &puuid)?;

    let groq = GroqApiClient::new(groq_api_key);
    let response_text = tokio::time::timeout(
        std::time::Duration::from_secs(60),
        groq.chat_completion(&prompt),
    )
    .await
    .map_err(|_| ApiError::Timeout)?
    .map_err(|e| e)?;

    // Parse response
    let parsed: serde_json::Value =
        serde_json::from_str(&response_text).map_err(|e| ApiError::Unknown {
            message: format!("Failed to parse AI response: {}", e),
        })?;

    // Extract player stats from match_info
    let participants = match_info["participants"].as_array();
    let player = participants
        .and_then(|parts| {
            parts
                .iter()
                .find(|p| p["puuid"].as_str() == Some(&puuid))
        })
        .ok_or_else(|| ApiError::NotFound {
            message: "Player not found in match data".to_string(),
        })?;

    let kills = player["kills"].as_i64().unwrap_or(0);
    let deaths = player["deaths"].as_i64().unwrap_or(0);
    let assists = player["assists"].as_i64().unwrap_or(0);
    let total_cs = player["totalMinionsKilled"].as_i64().unwrap_or(0)
        + player["neutralMinionsKilled"].as_i64().unwrap_or(0);

    let insights: Vec<MatchInsight> = parsed["insights"]
        .as_array()
        .cloned()
        .unwrap_or_default()
        .iter()
        .map(|i| MatchInsight {
            insight_type: i["type"].as_str().unwrap_or("improvement").to_string(),
            title: i["title"].as_str().unwrap_or("").to_string(),
            description: i["description"].as_str().unwrap_or("").to_string(),
            priority: i["priority"].as_i64().unwrap_or(2),
        })
        .collect();

    let analysis = MatchAnalysis {
        match_id: match_id.clone(),
        insights,
        summary: parsed["summary"].as_str().unwrap_or("").to_string(),
        player_stats: PlayerStats {
            kda: format!("{}/{}/{}", kills, deaths, assists),
            damage: player["totalDamageDealtToChampions"].as_i64().unwrap_or(0),
            vision_score: player["visionScore"].as_i64().unwrap_or(0),
            cs: total_cs,
        },
    };

    // Save to analysis cache
    if let Ok(json) = serde_json::to_string(&analysis) {
        let _ = analysis_cache::set(&state.db, &match_id, &puuid, &json);
    }

    Ok(analysis)
}
