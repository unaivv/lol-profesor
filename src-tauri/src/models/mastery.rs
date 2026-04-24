use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChampionMastery {
    pub champion_id: i64,
    pub champion_level: i64,
    pub champion_points: i64,
    pub last_play_time: i64,
    pub champion_points_since_last_level: i64,
    pub champion_points_until_next_level: i64,
    pub chest_granted: bool,
    pub tokens_earned: i64,
    pub summoner_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub champion_name: Option<String>,
}
