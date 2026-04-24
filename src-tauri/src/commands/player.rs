use tauri::State;
use crate::error::ApiError;
use crate::models::summoner::{
    ComprehensivePlayerData, RankedEntry, RankedStatsExtended, RiotAccount, RiotSummoner, Summoner,
    SummonerBasic,
};
use crate::models::match_::Match;
use crate::models::mastery::ChampionMastery;
use crate::AppState;
use crate::api::champions::get_champion_name;
use crate::db::{summoner_cache, match_cache};
use super::{extract_perks, participant_from_json};

async fn fetch_account_and_summoner(
    state: &AppState,
    game_name: &str,
    tag_line: &str,
) -> Result<(RiotAccount, RiotSummoner), ApiError> {
    let encoded_name = urlencoding::encode(game_name);
    let encoded_tag = urlencoding::encode(tag_line);

    let account: RiotAccount = state
        .riot_client
        .get(&format!(
            "{}/riot/account/v1/accounts/by-riot-id/{}/{}",
            state.riot_client.global_url(),
            encoded_name,
            encoded_tag
        ))
        .await?;

    let summoner: RiotSummoner = state
        .riot_client
        .get(&format!(
            "{}/lol/summoner/v4/summoners/by-puuid/{}",
            state.riot_client.regional_url(),
            account.puuid
        ))
        .await?;

    Ok((account, summoner))
}

#[tauri::command]
pub async fn get_summoner(
    game_name: String,
    tag_line: String,
    state: State<'_, AppState>,
) -> Result<Summoner, ApiError> {
    let (account, summoner) = fetch_account_and_summoner(&state, &game_name, &tag_line).await?;

    let _ = summoner_cache::set(
        &state.db,
        &account.puuid,
        &account.game_name,
        &account.tag_line,
        summoner.profile_icon_id,
    );

    Ok(Summoner {
        puuid: account.puuid.clone(),
        summoner_id: summoner.id.unwrap_or_else(|| account.puuid.clone()),
        game_name: account.game_name,
        tag_line: account.tag_line,
        summoner_level: summoner.summoner_level,
        profile_icon_id: summoner.profile_icon_id,
        region: "EUW".to_string(),
    })
}

#[tauri::command]
pub async fn get_comprehensive_player(
    game_name: String,
    tag_line: String,
    state: State<'_, AppState>,
) -> Result<ComprehensivePlayerData, ApiError> {
    let (account, summoner) = fetch_account_and_summoner(&state, &game_name, &tag_line).await?;

    let puuid = account.puuid.clone();
    // Riot API v5 /by-puuid ya no devuelve `id`; usamos el puuid como summonerId para spectator
    let summoner_id = summoner.id.clone().unwrap_or_else(|| puuid.clone());
    let regional_url = state.riot_client.regional_url().to_string();
    let global_url = state.riot_client.global_url().to_string();

    let _ = summoner_cache::set(
        &state.db,
        &puuid,
        &account.game_name,
        &account.tag_line,
        summoner.profile_icon_id,
    );

    // Parallel requests
    let ranked_url = format!(
        "{}/lol/league/v4/entries/by-puuid/{}",
        regional_url, puuid
    );
    let mastery_url = format!(
        "{}/lol/champion-mastery/v4/champion-masteries/by-puuid/{}",
        regional_url, puuid
    );
    let match_ids_url = format!(
        "{}/lol/match/v5/matches/by-puuid/{}/ids?count=20",
        global_url, puuid
    );
    let spectator_url = format!(
        "{}/lol/spectator/v5/active-games/by-summoner/{}",
        regional_url, summoner_id
    );

    let (ranked_result, mastery_result, match_ids_result, spectator_result) = tokio::join!(
        state.riot_client.get::<serde_json::Value>(&ranked_url),
        state.riot_client.get::<serde_json::Value>(&mastery_url),
        state.riot_client.get::<Vec<String>>(&match_ids_url),
        state.riot_client.get::<serde_json::Value>(&spectator_url),
    );

    // Process ranked
    let ranked_stats = match ranked_result {
        Ok(ranked_json) => {
            let entries = ranked_json.as_array().cloned().unwrap_or_default();
            let solo = entries
                .iter()
                .find(|e| e["queueType"].as_str() == Some("RANKED_SOLO_5x5"))
                .map(|e| RankedEntry {
                    league_id: e["leagueId"].as_str().map(|s| s.to_string()),
                    queue_type: e["queueType"].as_str().unwrap_or("").to_string(),
                    tier: e["tier"].as_str().unwrap_or("").to_string(),
                    rank: e["rank"].as_str().unwrap_or("").to_string(),
                    league_points: e["leaguePoints"].as_i64().unwrap_or(0),
                    wins: e["wins"].as_i64().unwrap_or(0),
                    losses: e["losses"].as_i64().unwrap_or(0),
                    hot_streak: e["hotStreak"].as_bool().unwrap_or(false),
                });
            let flex = entries
                .iter()
                .find(|e| e["queueType"].as_str() == Some("RANKED_FLEX_SR"))
                .map(|e| RankedEntry {
                    league_id: e["leagueId"].as_str().map(|s| s.to_string()),
                    queue_type: e["queueType"].as_str().unwrap_or("").to_string(),
                    tier: e["tier"].as_str().unwrap_or("").to_string(),
                    rank: e["rank"].as_str().unwrap_or("").to_string(),
                    league_points: e["leaguePoints"].as_i64().unwrap_or(0),
                    wins: e["wins"].as_i64().unwrap_or(0),
                    losses: e["losses"].as_i64().unwrap_or(0),
                    hot_streak: e["hotStreak"].as_bool().unwrap_or(false),
                });
            if solo.is_some() || flex.is_some() {
                Some(RankedStatsExtended { solo, flex })
            } else {
                None
            }
        }
        Err(e) => {
            log::warn!("Failed to fetch ranked stats: {}", e);
            None
        }
    };

    // Process mastery
    let mastery: Vec<ChampionMastery> = match mastery_result {
        Ok(m_json) => m_json
            .as_array()
            .cloned()
            .unwrap_or_default()
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
            .collect(),
        Err(e) => {
            log::warn!("Failed to fetch mastery: {}", e);
            vec![]
        }
    };

    // Process current game
    let current_game = match spectator_result {
        Ok(game) => Some(crate::models::live_game::LiveGame {
            game_id: game["gameId"].clone(),
            game_mode: game["gameMode"].as_str().unwrap_or("").to_string(),
            game_type: game["gameType"].as_str().unwrap_or("").to_string(),
            game_start_time: game["gameStartTime"].as_i64().unwrap_or(0),
            map_id: game["mapId"].as_i64().unwrap_or(0),
            game_length: game["gameLength"].as_i64().unwrap_or(0),
            platform_id: game["platformId"].as_str().unwrap_or("").to_string(),
            game_queue_config_id: game["gameQueueConfigId"].as_i64().unwrap_or(0),
            participants: game["participants"].as_array().cloned().unwrap_or_default(),
            banned_champions: None,
        }),
        Err(ApiError::NotFound { .. }) => None,
        Err(e) => {
            log::warn!("Failed to fetch spectator: {}", e);
            None
        }
    };

    // Process matches sequentially, collecting all puuids as we go
    let mut matches: Vec<Match> = vec![];
    let mut all_puuids: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut raw_matches: Vec<(String, serde_json::Value)> = vec![];

    if let Ok(match_ids) = match_ids_result {
        for match_id in match_ids.iter().take(20) {
            let match_url = format!(
                "{}/lol/match/v5/matches/{}",
                global_url, match_id
            );
            match state.riot_client.get::<serde_json::Value>(&match_url).await {
                Ok(match_data) => {
                    let _ = match_cache::set_raw(&state.db, match_id, &match_data["info"]);

                    if let Some(parts) = match_data["info"]["participants"].as_array() {
                        for p in parts {
                            if let Some(puid) = p["puuid"].as_str() {
                                all_puuids.insert(puid.to_string());
                            }
                        }
                    }
                    raw_matches.push((match_id.clone(), match_data));
                }
                Err(e) => log::warn!("Failed to fetch match {}: {}", match_id, e),
            }
        }
    } else {
        log::warn!("Failed to fetch match IDs");
    }

    // Resolve summoner names
    let mut name_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    let mut missing_puuids: Vec<String> = vec![];

    for puid in &all_puuids {
        match summoner_cache::get(&state.db, puid) {
            Ok(Some((gname, tag, _))) => {
                name_map.insert(puid.clone(), format!("{}#{}", gname, tag));
            }
            _ => missing_puuids.push(puid.clone()),
        }
    }

    for puid in missing_puuids.iter().take(10) {
        let acc_url = format!(
            "{}/riot/account/v1/accounts/by-puuid/{}",
            global_url, puid
        );
        match state.riot_client.get::<RiotAccount>(&acc_url).await {
            Ok(acc) => {
                let _ = summoner_cache::set(&state.db, puid, &acc.game_name, &acc.tag_line, 1);
                name_map.insert(puid.clone(), format!("{}#{}", acc.game_name, acc.tag_line));
            }
            Err(e) => log::warn!("Failed to fetch account for {}: {}", puid, e),
        }
    }

    // Build match structs
    for (match_id, match_data) in raw_matches {
        let info = &match_data["info"];
        let participants_json = info["participants"].as_array();

        let player_participant = participants_json
            .and_then(|parts| parts.iter().find(|p| p["puuid"].as_str() == Some(&puuid)));

        if let Some(participant) = player_participant {
            let parts: Vec<_> = participants_json
                .map(|parts| {
                    parts.iter().map(|p| {
                        let puid_str = p["puuid"].as_str().unwrap_or("");
                        let name = name_map.get(puid_str).cloned().unwrap_or_default();
                        participant_from_json(p, &name)
                    }).collect()
                })
                .unwrap_or_default();

            let perks = participant.get("perks").cloned().unwrap_or(serde_json::Value::Null);
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
                participant_id: participant["participantId"].as_i64(),
                team_id: participant["teamId"].as_i64(),
                win: participant["win"].as_bool(),
                champion_id: participant["championId"].as_i64(),
                champion_name: participant["championName"].as_str().map(|s| s.to_string()),
                kills: participant["kills"].as_i64(),
                deaths: participant["deaths"].as_i64(),
                assists: participant["assists"].as_i64(),
                gold_earned: participant["goldEarned"].as_i64(),
                total_minions_killed: participant["totalMinionsKilled"].as_i64(),
                neutral_minions_killed: participant["neutralMinionsKilled"].as_i64(),
                vision_wards_bought_in_game: participant["visionWardsBoughtInGame"].as_i64(),
                vision_score: participant["visionScore"].as_i64(),
                wards_placed: participant["wardsPlaced"].as_i64(),
                wards_killed: participant["wardsKilled"].as_i64(),
                damage_dealt_to_champions: participant["totalDamageDealtToChampions"].as_i64(),
                damage_taken: participant["totalDamageTaken"].as_i64(),
                total_heal: participant["totalHeal"].as_i64(),
                time_played: participant["timePlayed"].as_i64(),
                item0: participant["item0"].as_i64(),
                item1: participant["item1"].as_i64(),
                item2: participant["item2"].as_i64(),
                item3: participant["item3"].as_i64(),
                item4: participant["item4"].as_i64(),
                item5: participant["item5"].as_i64(),
                item6: participant["item6"].as_i64(),
                champion_level: participant["champLevel"].as_i64(),
                summoner1_id: participant["summoner1Id"].as_i64(),
                summoner2_id: participant["summoner2Id"].as_i64(),
                perk0: Some(perk0),
                perk1: Some(perk1),
                perk2: Some(perk2),
                perk3: Some(perk3),
                perk4: Some(perk4),
                perk5: Some(perk5),
                perk_primary_style: Some(primary_style),
                perk_sub_style: Some(sub_style),
                participants: Some(parts),
            });
        }
    }

    Ok(ComprehensivePlayerData {
        puuid,
        summoner_id: summoner_id,
        game_name: account.game_name,
        tag_line: account.tag_line,
        summoner_level: summoner.summoner_level,
        profile_icon_id: summoner.profile_icon_id,
        region: "EUW".to_string(),
        ranked_stats,
        mastery,
        matches,
        current_game,
    })
}

#[tauri::command]
pub async fn get_player_by_puuid(
    puuid: String,
    state: State<'_, AppState>,
) -> Result<SummonerBasic, ApiError> {
    // Check DB cache first
    if let Ok(Some((game_name, tag_line, icon))) = summoner_cache::get(&state.db, &puuid) {
        return Ok(SummonerBasic {
            game_name,
            tag_line,
            icon,
        });
    }

    // Check LRU cache
    {
        let mut cache = state.cache.write().await;
        if let Some(val) = cache.get(&puuid) {
            let parts: Vec<&str> = val.splitn(2, '#').collect();
            let game_name = parts.get(0).unwrap_or(&"").to_string();
            let tag_line = parts.get(1).unwrap_or(&"").to_string();
            return Ok(SummonerBasic {
                game_name,
                tag_line,
                icon: 1,
            });
        }
    }

    // Fetch from Riot API
    let url = format!(
        "{}/riot/account/v1/accounts/by-puuid/{}",
        state.riot_client.global_url(),
        puuid
    );
    let account: RiotAccount = state.riot_client.get(&url).await?;

    let _ = summoner_cache::set(&state.db, &puuid, &account.game_name, &account.tag_line, 1);

    {
        let mut cache = state.cache.write().await;
        cache.put(
            puuid.clone(),
            format!("{}#{}", account.game_name, account.tag_line),
        );
    }

    Ok(SummonerBasic {
        game_name: account.game_name,
        tag_line: account.tag_line,
        icon: 1,
    })
}
