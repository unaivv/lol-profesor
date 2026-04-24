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
