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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn make_perks(primary_style: i64, primary_selections: &[i64], sub_style: i64, sub_selections: &[i64]) -> serde_json::Value {
        let primary: Vec<_> = primary_selections.iter().map(|p| json!({"perk": p})).collect();
        let sub: Vec<_> = sub_selections.iter().map(|p| json!({"perk": p})).collect();
        json!({
            "styles": [
                {"style": primary_style, "selections": primary},
                {"style": sub_style,     "selections": sub}
            ]
        })
    }

    #[test]
    fn extract_perks_precision_with_inspiration_secondary() {
        let perks = make_perks(
            8000, &[8008, 9101, 9104, 8014],
            8300, &[8313, 8321],
        );
        let (p0, p1, p2, p3, p4, p5, pri, sub) = extract_perks(&perks);
        assert_eq!(p0, 8008); // Lethal Tempo
        assert_eq!(p1, 9101);
        assert_eq!(p2, 9104);
        assert_eq!(p3, 8313);
        assert_eq!(p4, 8321);
        assert_eq!(p5, 0);    // no third secondary selection
        assert_eq!(pri, 8000);
        assert_eq!(sub, 8300);
    }

    #[test]
    fn extract_perks_from_empty_object_returns_zeros() {
        let (p0, p1, p2, p3, p4, p5, pri, sub) = extract_perks(&json!({}));
        assert_eq!((p0, p1, p2, p3, p4, p5, pri, sub), (0, 0, 0, 0, 0, 0, 0, 0));
    }

    #[test]
    fn extract_perks_missing_secondary_returns_zeros_for_p3_p4() {
        let perks = make_perks(8100, &[8112, 8139, 8138, 8136], 0, &[]);
        let (_, _, _, p3, p4, _, _, sub) = extract_perks(&perks);
        assert_eq!(p3, 0);
        assert_eq!(p4, 0);
        assert_eq!(sub, 0);
    }

    fn minimal_participant_json() -> serde_json::Value {
        json!({
            "participantId": 1,
            "teamId": 100,
            "win": true,
            "championId": 222,
            "championName": "Jinx",
            "riotIdGameName": "TestPlayer",
            "riotIdTagline": "EUW",
            "kills": 10, "deaths": 2, "assists": 5,
            "goldEarned": 15000,
            "totalMinionsKilled": 180, "neutralMinionsKilled": 20,
            "totalDamageDealtToChampions": 30000, "totalDamageTaken": 20000,
            "totalHeal": 500, "timePlayed": 1800,
            "visionScore": 15, "wardsPlaced": 5, "wardsKilled": 2,
            "visionWardsBoughtInGame": 1,
            "item0": 3031, "item1": 3006, "item2": 3046,
            "item3": 0, "item4": 0, "item5": 0, "item6": 3364,
            "champLevel": 18, "summoner1Id": 4, "summoner2Id": 21,
            "profileIconId": 123,
            "perks": {
                "styles": [
                    {"style": 8000, "selections": [{"perk": 8008}, {"perk": 9101}, {"perk": 9104}, {"perk": 8014}]},
                    {"style": 8300, "selections": [{"perk": 8313}, {"perk": 8321}, {"perk": 8352}]}
                ]
            }
        })
    }

    #[test]
    fn participant_from_json_parses_basic_fields() {
        let p = participant_from_json(&minimal_participant_json(), "");
        assert_eq!(p.champion_id, 222);
        assert_eq!(p.champion_name, "Jinx");
        assert_eq!(p.kills, 10);
        assert_eq!(p.deaths, 2);
        assert_eq!(p.assists, 5);
        assert!(p.win);
        assert_eq!(p.team_id, 100);
        assert_eq!(p.champion_level, 18);
        assert_eq!(p.item0, 3031);
        assert_eq!(p.summoner1_id, 4);
    }

    #[test]
    fn participant_summoner_name_prefers_riot_id() {
        let p = participant_from_json(&minimal_participant_json(), "ignored");
        assert_eq!(p.summoner_name, "TestPlayer#EUW");
    }

    #[test]
    fn participant_falls_back_to_provided_summoner_name() {
        let mut json = minimal_participant_json();
        json["riotIdGameName"] = json!("");
        json["riotIdTagline"] = json!("");
        let p = participant_from_json(&json, "FallbackName#TAG");
        assert_eq!(p.summoner_name, "FallbackName#TAG");
    }

    #[test]
    fn participant_perks_parsed_correctly() {
        let p = participant_from_json(&minimal_participant_json(), "");
        assert_eq!(p.perk0, 8008);          // Lethal Tempo
        assert_eq!(p.perk_primary_style, 8000); // Precision
        assert_eq!(p.perk_sub_style, 8300);     // Inspiration
    }

    #[test]
    fn participant_from_json_handles_missing_optional_fields() {
        let sparse = json!({
            "participantId": 2,
            "teamId": 200,
            "win": false,
            "championId": 1,
            "championName": "Annie"
        });
        let p = participant_from_json(&sparse, "");
        assert_eq!(p.kills, 0);
        assert_eq!(p.deaths, 0);
        assert!(!p.win);
        assert_eq!(p.summoner_name, "");
    }
}
