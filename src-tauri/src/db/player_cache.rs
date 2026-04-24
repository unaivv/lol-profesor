use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use crate::error::ApiError;
use crate::models::summoner::ComprehensivePlayerData;

pub fn get(
    pool: &Pool<SqliteConnectionManager>,
    puuid: &str,
) -> Result<Option<(ComprehensivePlayerData, i64)>, ApiError> {
    let conn = pool.get().map_err(|e| ApiError::DatabaseError { message: e.to_string() })?;

    let result = conn
        .query_row(
            "SELECT json, cached_at FROM player_cache WHERE puuid = ?1",
            rusqlite::params![puuid],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?)),
        )
        .ok();

    match result {
        Some((json, cached_at)) => {
            match serde_json::from_str::<ComprehensivePlayerData>(&json) {
                Ok(data) => Ok(Some((data, cached_at))),
                Err(_) => Ok(None),
            }
        }
        None => Ok(None),
    }
}

pub fn set(
    pool: &Pool<SqliteConnectionManager>,
    puuid: &str,
    data: &ComprehensivePlayerData,
) -> Result<(), ApiError> {
    let conn = pool.get().map_err(|e| ApiError::DatabaseError { message: e.to_string() })?;

    let now = chrono::Utc::now().timestamp();
    let json = serde_json::to_string(data).map_err(|e| ApiError::DatabaseError { message: e.to_string() })?;

    conn.execute(
        "INSERT OR REPLACE INTO player_cache (puuid, json, cached_at) VALUES (?1, ?2, ?3)",
        rusqlite::params![puuid, json, now],
    )
    .map_err(|e| ApiError::DatabaseError { message: e.to_string() })?;

    Ok(())
}
