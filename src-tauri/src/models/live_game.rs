use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
#[serde(rename_all = "camelCase")]
pub struct LiveGamePlayer {
    pub summoner_name: String,
    pub champion_id: i64,
    pub champion_name: String,
    pub team_id: i64,
    pub spell1_id: i64,
    pub spell2_id: i64,
    pub profile_icon_id: i64,
    pub summoner_level: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BannedChampion {
    pub champion_id: i64,
    pub team_id: i64,
    pub pick_turn: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LiveGame {
    pub game_id: serde_json::Value,
    pub game_mode: String,
    pub game_type: String,
    pub game_start_time: i64,
    pub map_id: i64,
    pub game_length: i64,
    pub platform_id: String,
    pub game_queue_config_id: i64,
    pub participants: Vec<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banned_champions: Option<Vec<BannedChampion>>,
}
