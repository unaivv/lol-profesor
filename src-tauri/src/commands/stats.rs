use tauri::State;
use crate::error::ApiError;
use crate::models::ranked::RankedStats;
use crate::models::mastery::ChampionMastery;
use crate::AppState;
use crate::api::riot_client::RiotApiClient;
use crate::api::champions::get_champion_name;
use crate::db::lp_history::LpSnapshot;

pub async fn get_ranked_stats_impl(
    riot: &RiotApiClient,
    summoner_id: &str,
) -> Result<RankedStats, ApiError> {
    let url = format!(
        "{}/lol/league/v4/entries/by-summoner/{}",
        riot.regional_url(),
        summoner_id
    );

    let entries: Vec<serde_json::Value> = riot.get(&url).await?;

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

pub async fn get_mastery_impl(
    riot: &RiotApiClient,
    puuid: &str,
) -> Result<Vec<ChampionMastery>, ApiError> {
    let url = format!(
        "{}/lol/champion-mastery/v4/champion-masteries/by-puuid/{}",
        riot.regional_url(),
        puuid
    );

    let mastery_raw: Vec<serde_json::Value> = riot.get(&url).await?;

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

#[tauri::command]
pub async fn get_ranked_stats(
    summoner_id: String,
    state: State<'_, AppState>,
) -> Result<RankedStats, ApiError> {
    get_ranked_stats_impl(&state.riot_client, &summoner_id).await
}

#[tauri::command]
pub async fn get_mastery(
    puuid: String,
    state: State<'_, AppState>,
) -> Result<Vec<ChampionMastery>, ApiError> {
    get_mastery_impl(&state.riot_client, &puuid).await
}

#[tauri::command]
pub async fn get_lp_history(
    puuid: String,
    queue_type: String,
    limit: i64,
    state: State<'_, AppState>,
) -> Result<Vec<LpSnapshot>, ApiError> {
    crate::db::lp_history::get_history(&state.db, &puuid, &queue_type, limit)
}

#[cfg(test)]
mod tests {
    use super::*;
    use httpmock::prelude::*;

    fn riot_client(server: &MockServer) -> RiotApiClient {
        RiotApiClient::new(server.base_url(), server.base_url(), "test-key".to_string())
    }

    #[tokio::test]
    async fn get_ranked_stats_parses_solo_queue() {
        let server = MockServer::start();

        server.mock(|when, then| {
            when.method(GET).path("/lol/league/v4/entries/by-summoner/summ-123");
            then.status(200)
                .header("content-type", "application/json")
                .body(r#"[{"queueType":"RANKED_SOLO_5x5","tier":"GOLD","rank":"II","leaguePoints":75,"wins":45,"losses":30,"hotStreak":false,"veteran":false,"inactive":false,"freshBlood":false}]"#);
        });

        let riot = riot_client(&server);
        let stats = get_ranked_stats_impl(&riot, "summ-123").await.unwrap();

        assert_eq!(stats.tier, "GOLD");
        assert_eq!(stats.rank, "II");
        assert_eq!(stats.league_points, 75);
        assert_eq!(stats.wins, 45);
        assert_eq!(stats.losses, 30);
    }

    #[tokio::test]
    async fn get_ranked_stats_empty_returns_not_found() {
        let server = MockServer::start();

        server.mock(|when, then| {
            when.method(GET).path("/lol/league/v4/entries/by-summoner/unranked-summ");
            then.status(200)
                .header("content-type", "application/json")
                .body(r#"[]"#);
        });

        let riot = riot_client(&server);
        let err = get_ranked_stats_impl(&riot, "unranked-summ").await.unwrap_err();
        assert!(matches!(err, ApiError::NotFound { .. }));
    }

    #[tokio::test]
    async fn get_mastery_resolves_champion_names() {
        let server = MockServer::start();

        server.mock(|when, then| {
            when.method(GET).path_contains("/lol/champion-mastery/v4/champion-masteries/by-puuid/");
            then.status(200)
                .header("content-type", "application/json")
                .body(r#"[{"championId":222,"championLevel":7,"championPoints":150000,"lastPlayTime":1700000000000,"championPointsSinceLastLevel":50000,"championPointsUntilNextLevel":0,"chestGranted":true,"tokensEarned":0,"summonerId":"summ-abc"}]"#);
        });

        let riot = riot_client(&server);
        let mastery = get_mastery_impl(&riot, "some-puuid").await.unwrap();

        assert_eq!(mastery.len(), 1);
        assert_eq!(mastery[0].champion_id, 222);
        // Champion 222 should resolve to a non-empty name (Jinx)
        let name = mastery[0].champion_name.as_deref().unwrap_or("");
        assert!(!name.is_empty(), "champion_name should be populated for id 222");
    }
}
