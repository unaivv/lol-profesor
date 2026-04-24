use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use crate::error::ApiError;

pub fn get(
    pool: &Pool<SqliteConnectionManager>,
    match_id: &str,
    puuid: &str,
) -> Result<Option<String>, ApiError> {
    let conn = pool.get().map_err(|e| ApiError::DatabaseError {
        message: e.to_string(),
    })?;

    let result = conn
        .query_row(
            "SELECT analysis_json FROM match_analyses WHERE match_id = ?1 AND puuid = ?2",
            rusqlite::params![match_id, puuid],
            |row| row.get::<_, String>(0),
        )
        .ok();

    Ok(result)
}

pub fn set(
    pool: &Pool<SqliteConnectionManager>,
    match_id: &str,
    puuid: &str,
    analysis_json: &str,
) -> Result<(), ApiError> {
    let conn = pool.get().map_err(|e| ApiError::DatabaseError {
        message: e.to_string(),
    })?;

    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "INSERT OR REPLACE INTO match_analyses (match_id, puuid, analysis_json, created_at)
         VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![match_id, puuid, analysis_json, now],
    )
    .map_err(|e| ApiError::DatabaseError {
        message: e.to_string(),
    })?;

    Ok(())
}
