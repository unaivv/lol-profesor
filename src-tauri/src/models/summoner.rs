use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Summoner {
    pub puuid: String,
    pub summoner_id: String,
    pub game_name: String,
    pub tag_line: String,
    pub summoner_level: i64,
    pub profile_icon_id: i64,
    pub region: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SummonerBasic {
    pub game_name: String,
    pub tag_line: String,
    pub icon: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RankedEntry {
    pub league_id: Option<String>,
    pub queue_type: String,
    pub tier: String,
    pub rank: String,
    pub league_points: i64,
    pub wins: i64,
    pub losses: i64,
    pub hot_streak: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RankedStatsExtended {
    pub solo: Option<RankedEntry>,
    pub flex: Option<RankedEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComprehensivePlayerData {
    pub puuid: String,
    pub summoner_id: String,
    pub game_name: String,
    pub tag_line: String,
    pub summoner_level: i64,
    pub profile_icon_id: i64,
    pub region: String,
    pub ranked_stats: Option<RankedStatsExtended>,
    pub mastery: Vec<crate::models::mastery::ChampionMastery>,
    pub matches: Vec<crate::models::match_::Match>,
    pub current_game: Option<crate::models::live_game::LiveGame>,
}

// Raw Riot API response shapes used for deserialization
#[derive(Debug, Deserialize)]
pub struct RiotAccount {
    pub puuid: String,
    #[serde(rename = "gameName")]
    pub game_name: String,
    #[serde(rename = "tagLine")]
    pub tag_line: String,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct RiotSummoner {
    // Riot API v5 ya no devuelve `id` en /by-puuid — se usa el puuid como summonerId
    pub id: Option<String>,
    pub puuid: String,
    #[serde(rename = "summonerLevel")]
    pub summoner_level: i64,
    #[serde(rename = "profileIconId")]
    pub profile_icon_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CachedPlayerResponse {
    pub data: ComprehensivePlayerData,
    pub cached_at: Option<i64>,
    pub is_cached: bool,
}
