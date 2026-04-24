use tauri::State;
use crate::error::ApiError;
use crate::models::ranked::RankedStats;
use crate::models::mastery::ChampionMastery;
use crate::AppState;
use crate::api::champions::get_champion_name;

#[tauri::command]
pub async fn get_ranked_stats(
    summoner_id: String,
    state: State<'_, AppState>,
) -> Result<RankedStats, ApiError> {
    let url = format!(
        "{}/lol/league/v4/entries/by-summoner/{}",
        state.riot_client.regional_url(),
        summoner_id
    );

    let entries: Vec<serde_json::Value> = state.riot_client.get(&url).await?;

    let solo = entries
        .iter()
        .find(|e| e["queueType"].as_str() == Some("RANKED_SOLO_5x5"));

    match solo {
        Some(e) => Ok(RankedStats {
            tier: e["tier"].as_str().unwrap_or("").to_string(),
            rank: e["rank"].as_str().unwrap_or("").to_string(),
            league_points: e["leaguePoints"].as_i64().unwrap_or(0),
            wins: e["wins"].as_i64().unwrap_or(0),
            losses: e["losses"].as_i64().unwrap_or(0),
            veteran: e["veteran"].as_bool().unwrap_or(false),
            inactive: e["inactive"].as_bool().unwrap_or(false),
            fresh_blood: e["freshBlood"].as_bool().unwrap_or(false),
            hot_streak: e["hotStreak"].as_bool().unwrap_or(false),
            queue_type: "RANKED_SOLO_5x5".to_string(),
        }),
        None => Err(ApiError::NotFound {
            message: "No ranked solo/duo data found".to_string(),
        }),
    }
}

#[tauri::command]
pub async fn get_mastery(
    puuid: String,
    state: State<'_, AppState>,
) -> Result<Vec<ChampionMastery>, ApiError> {
    let url = format!(
        "{}/lol/champion-mastery/v4/champion-masteries/by-puuid/{}",
        state.riot_client.regional_url(),
        puuid
    );

    let mastery_raw: Vec<serde_json::Value> = state.riot_client.get(&url).await?;

    let mastery = mastery_raw
        .iter()
        .map(|m| ChampionMastery {
            champion_id: m["championId"].as_i64().unwrap_or(0),
            champion_level: m["championLevel"].as_i64().unwrap_or(0),
            champion_points: m["championPoints"].as_i64().unwrap_or(0),
            last_play_time: m["lastPlayTime"].as_i64().unwrap_or(0),
            champion_points_since_last_level: m["championPointsSinceLastLevel"]
                .as_i64()
                .unwrap_or(0),
            champion_points_until_next_level: m["championPointsUntilNextLevel"]
                .as_i64()
                .unwrap_or(0),
            chest_granted: m["chestGranted"].as_bool().unwrap_or(false),
            tokens_earned: m["tokensEarned"].as_i64().unwrap_or(0),
            summoner_id: m["summonerId"].as_str().unwrap_or("").to_string(),
            champion_name: Some(get_champion_name(
                m["championId"].as_u64().unwrap_or(0) as u32,
            )),
        })
        .collect();

    Ok(mastery)
}
