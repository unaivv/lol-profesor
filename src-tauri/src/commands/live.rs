use tauri::State;
use crate::error::ApiError;
use crate::models::live_game::{BannedChampion, LiveGame};
use crate::AppState;

#[tauri::command]
pub async fn get_live_game(
    puuid: String,
    state: State<'_, AppState>,
) -> Result<Option<LiveGame>, ApiError> {
    // In spectator v5, the endpoint uses puuid (riot calls it "summoner" but accepts puuid)
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
            };
            Ok(Some(live))
        }
        Err(ApiError::NotFound { .. }) => Ok(None),
        Err(e) => Err(e),
    }
}
