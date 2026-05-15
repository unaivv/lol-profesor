use tauri::State;
use crate::error::ApiError;
use crate::models::match_::{Match, MatchDetail};
use crate::models::timeline::MatchTimeline;
use crate::AppState;
use crate::api::riot_client::RiotApiClient;
use crate::db::match_cache;
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use super::{extract_perks, participant_from_json};
use futures::future::join_all;

pub async fn get_match_history_impl(
    riot: &RiotApiClient,
    db: &Pool<SqliteConnectionManager>,
    puuid: &str,
    count: Option<i64>,
    start: Option<i64>,
) -> Result<Vec<Match>, ApiError> {
    let count = count.unwrap_or(20).min(20);
    let start = start.unwrap_or(0);

    let url = format!(
        "{}/lol/match/v5/matches/by-puuid/{}/ids?count={}&start={}",
        riot.global_url(),
        puuid,
        count,
        start
    );

    let match_ids: Vec<String> = riot.get(&url).await?;
    let mut matches: Vec<Match> = vec![];

    for match_id in match_ids.iter().take(10) {
        let match_url = format!(
            "{}/lol/match/v5/matches/{}",
            riot.global_url(),
            match_id
        );
        match riot.get::<serde_json::Value>(&match_url).await {
            Ok(match_data) => {
                let info = &match_data["info"];
                let _ = match_cache::set_raw(db, match_id, info);

                let participant = info["participants"]
                    .as_array()
                    .and_then(|parts| parts.iter().find(|p| p["puuid"].as_str() == Some(puuid)));

                if let Some(p) = participant {
                    let perks = p.get("perks").cloned().unwrap_or(serde_json::Value::Null);
                    let (perk0, perk1, perk2, perk3, perk4, perk5, primary_style, sub_style) =
                        extract_perks(&perks);

                    matches.push(Match {
                        game_id: match_id.clone(),
                        game_creation: info["gameCreation"].as_i64().unwrap_or(0),
                        game_duration: info["gameDuration"].as_i64().unwrap_or(0),
                        game_mode: info["gameMode"].as_str().unwrap_or("").to_string(),
                        game_type: info["gameType"].as_str().unwrap_or("").to_string(),
                        game_version: info["gameVersion"].as_str().unwrap_or("").to_string(),
                        map_id: info["mapId"].as_i64().unwrap_or(0),
                        queue_id: info["queueId"].as_i64().unwrap_or(0),
                        participant_id: p["participantId"].as_i64(),
                        team_id: p["teamId"].as_i64(),
                        win: p["win"].as_bool(),
                        champion_id: p["championId"].as_i64(),
                        champion_name: p["championName"].as_str().map(|s| s.to_string()),
                        kills: p["kills"].as_i64(),
                        deaths: p["deaths"].as_i64(),
                        assists: p["assists"].as_i64(),
                        gold_earned: p["goldEarned"].as_i64(),
                        total_minions_killed: p["totalMinionsKilled"].as_i64(),
                        neutral_minions_killed: p["neutralMinionsKilled"].as_i64(),
                        vision_wards_bought_in_game: p["visionWardsBoughtInGame"].as_i64(),
                        vision_score: p["visionScore"].as_i64(),
                        wards_placed: p["wardsPlaced"].as_i64(),
                        wards_killed: p["wardsKilled"].as_i64(),
                        damage_dealt_to_champions: p["totalDamageDealtToChampions"].as_i64(),
                        damage_taken: p["totalDamageTaken"].as_i64(),
                        total_heal: p["totalHeal"].as_i64(),
                        time_played: p["timePlayed"].as_i64(),
                        item0: p["item0"].as_i64(),
                        item1: p["item1"].as_i64(),
                        item2: p["item2"].as_i64(),
                        item3: p["item3"].as_i64(),
                        item4: p["item4"].as_i64(),
                        item5: p["item5"].as_i64(),
                        item6: p["item6"].as_i64(),
                        champion_level: p["champLevel"].as_i64(),
                        summoner1_id: p["summoner1Id"].as_i64(),
                        summoner2_id: p["summoner2Id"].as_i64(),
                        perk0: Some(perk0),
                        perk1: Some(perk1),
                        perk2: Some(perk2),
                        perk3: Some(perk3),
                        perk4: Some(perk4),
                        perk5: Some(perk5),
                        perk_primary_style: Some(primary_style),
                        perk_sub_style: Some(sub_style),
                        participants: None,
                    });
                }
            }
            Err(e) => log::warn!("Failed to fetch match {}: {}", match_id, e),
        }
    }

    Ok(matches)
}

#[tauri::command]
pub async fn get_match_history(
    puuid: String,
    count: Option<i64>,
    start: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<Match>, ApiError> {
    get_match_history_impl(&state.riot_client, &state.db, &puuid, count, start).await
}

#[tauri::command]
pub async fn get_match_details(
    puuid: String,
    count: Option<i64>,
    start: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<MatchDetail>, ApiError> {
    let count = count.unwrap_or(10).min(20) as usize;
    let start = start.unwrap_or(0);

    let url = format!(
        "{}/lol/match/v5/matches/by-puuid/{}/ids?count={}&start={}",
        state.riot_client.global_url(),
        puuid,
        count,
        start
    );

    let match_ids: Vec<String> = state.riot_client.get(&url).await?;
    let mut detailed_matches: Vec<MatchDetail> = vec![];
    let global_url = state.riot_client.global_url().to_string();

    for match_id in match_ids.iter().take(count) {
        let match_url = format!(
            "{}/lol/match/v5/matches/{}",
            global_url, match_id
        );

        match state.riot_client.get::<serde_json::Value>(&match_url).await {
            Ok(match_data) => {
                let info = &match_data["info"];

                let participants = info["participants"]
                    .as_array()
                    .map(|parts| {
                        parts
                            .iter()
                            .map(|p| participant_from_json(p, ""))
                            .collect()
                    })
                    .unwrap_or_default();

                detailed_matches.push(MatchDetail {
                    game_id: match_id.clone(),
                    game_creation: info["gameCreation"].as_i64().unwrap_or(0),
                    game_duration: info["gameDuration"].as_i64().unwrap_or(0),
                    game_mode: info["gameMode"].as_str().unwrap_or("").to_string(),
                    game_type: info["gameType"].as_str().unwrap_or("").to_string(),
                    game_version: info["gameVersion"].as_str().unwrap_or("").to_string(),
                    map_id: info["mapId"].as_i64().unwrap_or(0),
                    queue_id: info["queueId"].as_i64().unwrap_or(0),
                    participants,
                });
            }
            Err(e) => log::warn!("Failed to fetch detailed match {}: {}", match_id, e),
        }
    }

    Ok(detailed_matches)
}

#[tauri::command]
pub async fn get_extended_match_details(
    puuid: String,
    count: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<MatchDetail>, ApiError> {
    let count = count.unwrap_or(100).min(100) as usize;
    let global_url = state.riot_client.global_url().to_string();

    let ids_url = format!(
        "{}/lol/match/v5/matches/by-puuid/{}/ids?count={}",
        global_url, puuid, count
    );
    let match_ids: Vec<String> = state.riot_client.get(&ids_url).await?;

    let riot_client = state.riot_client.clone();
    let db = state.db.clone();
    let mut results: Vec<MatchDetail> = vec![];

    for chunk in match_ids.chunks(10) {
        let futs: Vec<_> = chunk.iter().map(|mid| {
            let rc = riot_client.clone();
            let db = db.clone();
            let gurl = global_url.clone();
            let mid = mid.clone();
            async move {
                let info = if let Ok(Some(cached)) = match_cache::get_raw(&db, &mid) {
                    cached
                } else {
                    let url = format!("{}/lol/match/v5/matches/{}", gurl, mid);
                    match rc.get::<serde_json::Value>(&url).await {
                        Ok(d) => {
                            let info = d["info"].clone();
                            let _ = match_cache::set_raw(&db, &mid, &info);
                            info
                        }
                        Err(e) => { log::warn!("Failed to fetch match {}: {}", mid, e); return None; }
                    }
                };

                let participants = info["participants"]
                    .as_array()
                    .map(|parts| parts.iter().map(|p| participant_from_json(p, "")).collect())
                    .unwrap_or_default();

                Some(MatchDetail {
                    game_id: mid,
                    game_creation: info["gameCreation"].as_i64().unwrap_or(0),
                    game_duration: info["gameDuration"].as_i64().unwrap_or(0),
                    game_mode: info["gameMode"].as_str().unwrap_or("").to_string(),
                    game_type: info["gameType"].as_str().unwrap_or("").to_string(),
                    game_version: info["gameVersion"].as_str().unwrap_or("").to_string(),
                    map_id: info["mapId"].as_i64().unwrap_or(0),
                    queue_id: info["queueId"].as_i64().unwrap_or(0),
                    participants,
                })
            }
        }).collect();

        for detail in join_all(futs).await.into_iter().flatten() {
            results.push(detail);
        }
    }

    Ok(results)
}

#[tauri::command]
pub async fn get_match_timeline(
    match_id: String,
    state: State<'_, AppState>,
) -> Result<MatchTimeline, ApiError> {
    let url = format!(
        "{}/lol/match/v5/matches/{}/timeline",
        state.riot_client.global_url(),
        match_id
    );

    let timeline: serde_json::Value = state.riot_client.get(&url).await?;
    let info = &timeline["info"];

    let frames: Vec<serde_json::Value> = info["frames"]
        .as_array()
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .take(60)
        .collect();

    let participants: Vec<crate::models::timeline::TimelineParticipant> = info["participants"]
        .as_array()
        .cloned()
        .unwrap_or_default()
        .iter()
        .map(|p| crate::models::timeline::TimelineParticipant {
            participant_id: p["participantId"].as_i64().unwrap_or(0),
            puuid: p["puuid"].as_str().map(|s| s.to_string()),
            champion_id: p["championId"].as_i64().unwrap_or(0),
            champion_name: p["championName"].as_str().unwrap_or("").to_string(),
        })
        .collect();

    Ok(MatchTimeline {
        game_id: match_id,
        frames,
        participants,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use httpmock::prelude::*;

    fn test_pool() -> Pool<SqliteConnectionManager> {
        let manager = SqliteConnectionManager::memory();
        let pool = Pool::builder().max_size(1).build(manager).unwrap();
        crate::db::migrations::run(&pool).unwrap();
        pool
    }

    fn riot_client(server: &MockServer) -> RiotApiClient {
        RiotApiClient::new(server.base_url(), server.base_url(), "test-key".to_string())
    }

    fn match_detail_body(match_id: &str, puuid: &str) -> String {
        format!(r#"{{
          "metadata": {{"matchId": "{}", "participants": ["{}"]}},
          "info": {{
            "gameId": 123456,
            "gameCreation": 1700000000000,
            "gameDuration": 1800,
            "gameMode": "CLASSIC",
            "gameType": "MATCHED_GAME",
            "gameVersion": "14.1.1",
            "mapId": 11,
            "queueId": 420,
            "participants": [{{
              "participantId": 1, "teamId": 100, "win": true,
              "championId": 222, "championName": "Jinx",
              "riotIdGameName": "TestPlayer", "riotIdTagline": "EUW",
              "summonerName": "TestPlayer",
              "kills": 10, "deaths": 2, "assists": 5,
              "goldEarned": 12000, "totalMinionsKilled": 180, "neutralMinionsKilled": 20,
              "visionWardsBoughtInGame": 3, "visionScore": 25,
              "wardsPlaced": 10, "wardsKilled": 5,
              "totalDamageDealtToChampions": 45000, "totalDamageTaken": 20000, "totalHeal": 1500,
              "timePlayed": 1800,
              "item0": 3031, "item1": 3094, "item2": 3046, "item3": 0, "item4": 0, "item5": 0, "item6": 3364,
              "champLevel": 18,
              "summoner1Id": 4, "summoner2Id": 12,
              "perks": {{"styles": [{{"description":"primaryStyle","selections":[{{"perk":8008}},{{"perk":9111}},{{"perk":9104}},{{"perk":8014}}],"style":8000}},{{"description":"subStyle","selections":[{{"perk":8347}},{{"perk":8345}}],"style":8300}}]}},
              "profileIcon": 1234, "puuid": "{}"
            }}]
          }}
        }}"#, match_id, puuid, puuid)
    }

    #[tokio::test]
    async fn get_match_history_returns_parsed_matches() {
        let server = MockServer::start();
        let puuid = "test-puuid";

        server.mock(|when, then| {
            when.method(GET).path(format!("/lol/match/v5/matches/by-puuid/{}/ids", puuid));
            then.status(200)
                .header("content-type", "application/json")
                .body(r#"["EUW1_1","EUW1_2"]"#);
        });

        server.mock(|when, then| {
            when.method(GET).path("/lol/match/v5/matches/EUW1_1");
            then.status(200)
                .header("content-type", "application/json")
                .body(match_detail_body("EUW1_1", puuid));
        });

        server.mock(|when, then| {
            when.method(GET).path("/lol/match/v5/matches/EUW1_2");
            then.status(200)
                .header("content-type", "application/json")
                .body(match_detail_body("EUW1_2", puuid));
        });

        let db = test_pool();
        let riot = riot_client(&server);

        let matches = get_match_history_impl(&riot, &db, puuid, Some(2), Some(0)).await.unwrap();

        assert_eq!(matches.len(), 2);
        assert_eq!(matches[0].game_id, "EUW1_1");
        assert_eq!(matches[0].champion_name, Some("Jinx".to_string()));
        assert_eq!(matches[0].kills, Some(10));
        assert_eq!(matches[0].deaths, Some(2));
    }

    #[tokio::test]
    async fn get_match_history_empty_ids_returns_empty_vec() {
        let server = MockServer::start();
        let puuid = "test-puuid-empty";

        server.mock(|when, then| {
            when.method(GET).path(format!("/lol/match/v5/matches/by-puuid/{}/ids", puuid));
            then.status(200)
                .header("content-type", "application/json")
                .body(r#"[]"#);
        });

        let db = test_pool();
        let riot = riot_client(&server);

        let matches = get_match_history_impl(&riot, &db, puuid, None, None).await.unwrap();
        assert!(matches.is_empty());
    }
}
