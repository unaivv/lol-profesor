use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use crate::error::ApiError;

const TTL: i64 = 86400;

pub fn get_raw(
    pool: &Pool<SqliteConnectionManager>,
    match_id: &str,
) -> Result<Option<serde_json::Value>, ApiError> {
    let conn = pool.get().map_err(|e| ApiError::DatabaseError {
        message: e.to_string(),
    })?;

    let now = chrono::Utc::now().timestamp();

    let result = conn
        .query_row(
            "SELECT raw_json, cached_at FROM match_info WHERE match_id = ?1",
            rusqlite::params![match_id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?)),
        )
        .ok();

    match result {
        Some((raw, cached_at)) if now - cached_at < TTL => {
            serde_json::from_str(&raw)
                .map(Some)
                .map_err(|e| ApiError::DatabaseError {
                    message: e.to_string(),
                })
        }
        _ => Ok(None),
    }
}

pub fn set_raw(
    pool: &Pool<SqliteConnectionManager>,
    match_id: &str,
    raw: &serde_json::Value,
) -> Result<(), ApiError> {
    let conn = pool.get().map_err(|e| ApiError::DatabaseError {
        message: e.to_string(),
    })?;

    let now = chrono::Utc::now().timestamp();
    let raw_str = serde_json::to_string(raw).map_err(|e| ApiError::DatabaseError {
        message: e.to_string(),
    })?;

    conn.execute(
        "INSERT OR REPLACE INTO match_info (match_id, raw_json, cached_at) VALUES (?1, ?2, ?3)",
        rusqlite::params![match_id, raw_str, now],
    )
    .map_err(|e| ApiError::DatabaseError {
        message: e.to_string(),
    })?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn test_pool() -> r2d2::Pool<r2d2_sqlite::SqliteConnectionManager> {
        let manager = r2d2_sqlite::SqliteConnectionManager::memory();
        let pool = r2d2::Pool::builder().max_size(1).build(manager).unwrap();
        crate::db::migrations::run(&pool).unwrap();
        pool
    }

    #[test]
    fn set_and_get_raw_roundtrips() {
        let pool = test_pool();
        let data = json!({"matchId": "EUW1_1234", "gameMode": "CLASSIC"});
        set_raw(&pool, "EUW1_1234", &data).unwrap();
        let result = get_raw(&pool, "EUW1_1234").unwrap();
        assert!(result.is_some());
        let retrieved = result.unwrap();
        assert_eq!(retrieved["matchId"], "EUW1_1234");
        assert_eq!(retrieved["gameMode"], "CLASSIC");
    }

    #[test]
    fn get_raw_missing_returns_none() {
        let pool = test_pool();
        let result = get_raw(&pool, "NONEXISTENT_123").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn set_raw_overwrites_existing() {
        let pool = test_pool();
        let id = "EUW1_OVERWRITE";
        set_raw(&pool, id, &json!({"version": 1})).unwrap();
        set_raw(&pool, id, &json!({"version": 2})).unwrap();
        let result = get_raw(&pool, id).unwrap().unwrap();
        assert_eq!(result["version"], 2);
    }

    #[test]
    fn complex_json_roundtrips_correctly() {
        let pool = test_pool();
        let data = json!({
            "matchId": "EUW1_COMPLEX",
            "participants": [
                {"puuid": "abc", "championId": 222, "kills": 10},
                {"puuid": "def", "championId": 64,  "kills": 5}
            ],
            "gameVersion": "16.10.1"
        });
        set_raw(&pool, "EUW1_COMPLEX", &data).unwrap();
        let retrieved = get_raw(&pool, "EUW1_COMPLEX").unwrap().unwrap();
        assert_eq!(retrieved["participants"][0]["championId"], 222);
        assert_eq!(retrieved["participants"][1]["kills"], 5);
        assert_eq!(retrieved["gameVersion"], "16.10.1");
    }
}
