pub mod player;
pub mod matches;
pub mod stats;
pub mod live;
pub mod analysis;

/// Extract perk values from a serde_json perks object.
/// Returns (perk0, perk1, perk2, perk3, perk4, perk5, primary_style, sub_style)
pub fn extract_perks(perks: &serde_json::Value) -> (i64, i64, i64, i64, i64, i64, i64, i64) {
    let styles = perks["styles"].as_array();
    let perk0 = styles
        .and_then(|s| s.get(0))
        .and_then(|s| s["selections"].as_array())
        .and_then(|sel| sel.get(0))
        .and_then(|s| s["perk"].as_i64())
        .unwrap_or(0);
    let perk1 = styles
        .and_then(|s| s.get(0))
        .and_then(|s| s["selections"].as_array())
        .and_then(|sel| sel.get(1))
        .and_then(|s| s["perk"].as_i64())
        .unwrap_or(0);
    let perk2 = styles
        .and_then(|s| s.get(0))
        .and_then(|s| s["selections"].as_array())
        .and_then(|sel| sel.get(2))
        .and_then(|s| s["perk"].as_i64())
        .unwrap_or(0);
    let perk3 = styles
        .and_then(|s| s.get(1))
        .and_then(|s| s["selections"].as_array())
        .and_then(|sel| sel.get(0))
        .and_then(|s| s["perk"].as_i64())
        .unwrap_or(0);
    let perk4 = styles
        .and_then(|s| s.get(1))
        .and_then(|s| s["selections"].as_array())
        .and_then(|sel| sel.get(1))
        .and_then(|s| s["perk"].as_i64())
        .unwrap_or(0);
    let perk5 = styles
        .and_then(|s| s.get(1))
        .and_then(|s| s["selections"].as_array())
        .and_then(|sel| sel.get(2))
        .and_then(|s| s["perk"].as_i64())
        .unwrap_or(0);
    let primary_style = styles
        .and_then(|s| s.get(0))
        .and_then(|s| s["style"].as_i64())
        .unwrap_or(0);
    let sub_style = styles
        .and_then(|s| s.get(1))
        .and_then(|s| s["style"].as_i64())
        .unwrap_or(0);
    (perk0, perk1, perk2, perk3, perk4, perk5, primary_style, sub_style)
}

/// Build a Participant struct from raw Riot API JSON + resolved summoner name.
pub fn participant_from_json(
    p: &serde_json::Value,
    summoner_name: &str,
) -> crate::models::match_::Participant {
    let perks = p.get("perks").cloned().unwrap_or(serde_json::Value::Null);
    let (perk0, perk1, perk2, perk3, perk4, perk5, primary_style, sub_style) =
        extract_perks(&perks);

    let champ_level = p["champLevel"].as_i64().unwrap_or(0);

    let resolved_name = {
        let game_name = p["riotIdGameName"].as_str().unwrap_or("");
        let tag_line = p["riotIdTagline"].as_str().unwrap_or("");
        if !game_name.is_empty() {
            format!("{}#{}", game_name, tag_line)
        } else if !summoner_name.is_empty() {
            summoner_name.to_string()
        } else {
            String::new()
        }
    };

    crate::models::match_::Participant {
        participant_id: p["participantId"].as_i64().unwrap_or(0),
        team_id: p["teamId"].as_i64().unwrap_or(0),
        win: p["win"].as_bool().unwrap_or(false),
        champion_id: p["championId"].as_i64().unwrap_or(0),
        champion_name: p["championName"].as_str().unwrap_or("").to_string(),
        summoner_name: resolved_name,
        profile_icon_id: p["profileIconId"].as_i64().unwrap_or(1),
        puuid: p["puuid"].as_str().map(|s| s.to_string()),
        kills: p["kills"].as_i64().unwrap_or(0),
        deaths: p["deaths"].as_i64().unwrap_or(0),
        assists: p["assists"].as_i64().unwrap_or(0),
        gold_earned: p["goldEarned"].as_i64().unwrap_or(0),
        total_minions_killed: p["totalMinionsKilled"].as_i64().unwrap_or(0),
        neutral_minions_killed: p["neutralMinionsKilled"].as_i64().unwrap_or(0),
        vision_wards_bought_in_game: p["visionWardsBoughtInGame"].as_i64().unwrap_or(0),
        vision_score: p["visionScore"].as_i64().unwrap_or(0),
        wards_placed: p["wardsPlaced"].as_i64().unwrap_or(0),
        wards_killed: p["wardsKilled"].as_i64().unwrap_or(0),
        damage_dealt_to_champions: p["totalDamageDealtToChampions"].as_i64().unwrap_or(0),
        damage_taken: p["totalDamageTaken"].as_i64().unwrap_or(0),
        total_heal: p["totalHeal"].as_i64().unwrap_or(0),
        time_played: p["timePlayed"].as_i64().unwrap_or(0),
        item0: p["item0"].as_i64().unwrap_or(0),
        item1: p["item1"].as_i64().unwrap_or(0),
        item2: p["item2"].as_i64().unwrap_or(0),
        item3: p["item3"].as_i64().unwrap_or(0),
        item4: p["item4"].as_i64().unwrap_or(0),
        item5: p["item5"].as_i64().unwrap_or(0),
        item6: p["item6"].as_i64().unwrap_or(0),
        champion_level: champ_level,
        champ_level,
        summoner1_id: p["summoner1Id"].as_i64().unwrap_or(0),
        summoner2_id: p["summoner2Id"].as_i64().unwrap_or(0),
        perk0,
        perk1,
        perk2,
        perk3,
        perk4,
        perk5,
        perk_primary_style: primary_style,
        perk_sub_style: sub_style,
    }
}
