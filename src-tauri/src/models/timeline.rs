use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineParticipant {
    pub participant_id: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub puuid: Option<String>,
    pub champion_id: i64,
    pub champion_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchTimeline {
    pub game_id: String,
    pub frames: Vec<serde_json::Value>,
    pub participants: Vec<TimelineParticipant>,
}
