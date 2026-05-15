#[derive(Debug, Clone)]
pub enum Region {
    EUW,
    NA,
    KR,
    EUN,
    BR,
    TR,
    RU,
    LAN,
    LAS,
    OCE,
    JP,
}

impl Region {
    pub fn from_str(s: &str) -> Self {
        match s.to_uppercase().as_str() {
            "NA" | "NA1" => Region::NA,
            "KR" => Region::KR,
            "EUN" | "EUN1" => Region::EUN,
            "BR" | "BR1" => Region::BR,
            "TR" | "TR1" => Region::TR,
            "RU" => Region::RU,
            "LAN" | "LA1" => Region::LAN,
            "LAS" | "LA2" => Region::LAS,
            "OCE" | "OC1" => Region::OCE,
            "JP" | "JP1" => Region::JP,
            _ => Region::EUW,
        }
    }

    pub fn regional_url(&self) -> &'static str {
        match self {
            Region::EUW => "https://euw1.api.riotgames.com",
            Region::NA => "https://na1.api.riotgames.com",
            Region::KR => "https://kr.api.riotgames.com",
            Region::EUN => "https://eun1.api.riotgames.com",
            Region::BR => "https://br1.api.riotgames.com",
            Region::TR => "https://tr1.api.riotgames.com",
            Region::RU => "https://ru.api.riotgames.com",
            Region::LAN => "https://la1.api.riotgames.com",
            Region::LAS => "https://la2.api.riotgames.com",
            Region::OCE => "https://oc1.api.riotgames.com",
            Region::JP => "https://jp1.api.riotgames.com",
        }
    }

    pub fn global_url(&self) -> &'static str {
        match self {
            Region::EUW | Region::EUN => "https://europe.api.riotgames.com",
            Region::NA => "https://americas.api.riotgames.com",
            Region::KR | Region::JP => "https://asia.api.riotgames.com",
            Region::OCE => "https://sea.api.riotgames.com",
            Region::BR | Region::LAN | Region::LAS => "https://americas.api.riotgames.com",
            Region::TR | Region::RU => "https://europe.api.riotgames.com",
        }
    }
}

#[derive(Debug, Clone)]
pub struct Config {
    pub riot_api_key: String,
    pub groq_api_key: Option<String>,
    pub region: Region,
    pub regional_url: String,
    pub global_url: String,
    pub cache_ttl_secs: u64,
    pub lru_capacity: usize,
}

impl Config {
    pub fn load() -> Self {
        let region_str = std::env::var("LOL_REGION").unwrap_or_else(|_| "EUW".to_string());
        let region = Region::from_str(&region_str);

        let regional_url = std::env::var("RIOT_REGIONAL_URL")
            .unwrap_or_else(|_| region.regional_url().to_string());

        let global_url = std::env::var("RIOT_BASE_URL")
            .unwrap_or_else(|_| region.global_url().to_string());

        // Runtime env var → compile-time embedded value → placeholder
        let riot_api_key = std::env::var("RIOT_API_KEY")
            .unwrap_or_else(|_| option_env!("RIOT_API_KEY").unwrap_or("").to_string());

        let groq_api_key = std::env::var("GROQ_API_KEY")
            .ok()
            .or_else(|| option_env!("GROQ_API_KEY").map(|s| s.to_string()))
            .filter(|k| !k.is_empty());

        let cache_ttl_secs = std::env::var("CACHE_TTL_SECS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(86400);

        let lru_capacity = std::env::var("LRU_CAPACITY")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(500);

        Config {
            riot_api_key,
            groq_api_key,
            region,
            regional_url,
            global_url,
            cache_ttl_secs,
            lru_capacity,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn euw_routes_correctly() {
        let r = Region::from_str("EUW");
        assert_eq!(r.regional_url(), "https://euw1.api.riotgames.com");
        assert_eq!(r.global_url(),   "https://europe.api.riotgames.com");
    }

    #[test]
    fn na_routes_correctly() {
        let r = Region::from_str("NA");
        assert_eq!(r.regional_url(), "https://na1.api.riotgames.com");
        assert_eq!(r.global_url(),   "https://americas.api.riotgames.com");
    }

    #[test]
    fn kr_and_jp_route_to_asia() {
        assert_eq!(Region::from_str("KR").global_url(), "https://asia.api.riotgames.com");
        assert_eq!(Region::from_str("JP").global_url(), "https://asia.api.riotgames.com");
    }

    #[test]
    fn tr_and_ru_route_to_europe() {
        assert_eq!(Region::from_str("TR").global_url(), "https://europe.api.riotgames.com");
        assert_eq!(Region::from_str("RU").global_url(), "https://europe.api.riotgames.com");
    }

    #[test]
    fn br_lan_las_route_to_americas() {
        for region_str in ["BR", "LAN", "LAS", "LA1", "LA2", "BR1"] {
            assert_eq!(
                Region::from_str(region_str).global_url(),
                "https://americas.api.riotgames.com",
                "Region {} should route to americas",
                region_str
            );
        }
    }

    #[test]
    fn oce_routes_to_sea() {
        assert_eq!(Region::from_str("OCE").global_url(), "https://sea.api.riotgames.com");
        assert_eq!(Region::from_str("OC1").global_url(), "https://sea.api.riotgames.com");
    }

    #[test]
    fn aliases_normalize_to_same_url() {
        assert_eq!(
            Region::from_str("NA").regional_url(),
            Region::from_str("NA1").regional_url()
        );
        assert_eq!(
            Region::from_str("EUN").regional_url(),
            Region::from_str("EUN1").regional_url()
        );
        assert_eq!(
            Region::from_str("BR").regional_url(),
            Region::from_str("BR1").regional_url()
        );
    }

    #[test]
    fn unknown_region_defaults_to_euw() {
        let r = Region::from_str("XYZ");
        assert_eq!(r.regional_url(), "https://euw1.api.riotgames.com");
        assert_eq!(r.global_url(),   "https://europe.api.riotgames.com");
    }

    #[test]
    fn region_from_str_is_case_insensitive() {
        assert_eq!(
            Region::from_str("euw").regional_url(),
            Region::from_str("EUW").regional_url()
        );
        assert_eq!(
            Region::from_str("na1").regional_url(),
            Region::from_str("NA1").regional_url()
        );
    }
}
