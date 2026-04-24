use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use crate::error::ApiError;

const TTL: i64 = 86400;

pub fn get(
    pool: &Pool<SqliteConnectionManager>,
    puuid: &str,
) -> Result<Option<(String, String, i64)>, ApiError> {
    let conn = pool.get().map_err(|e| ApiError::DatabaseError {
        message: e.to_string(),
    })?;

    let now = chrono::Utc::now().timestamp();

    let result = conn
        .query_row(
            "SELECT game_name, tag_line, profile_icon_id, cached_at FROM summoner_names WHERE puuid = ?1",
            rusqlite::params![puuid],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, i64>(3)?,
                ))
            },
        )
        .ok();

    match result {
        Some((game_name, tag_line, icon, cached_at)) if now - cached_at < TTL => {
            Ok(Some((game_name, tag_line, icon)))
        }
        _ => Ok(None),
    }
}

pub fn set(
    pool: &Pool<SqliteConnectionManager>,
    puuid: &str,
    game_name: &str,
    tag_line: &str,
    profile_icon_id: i64,
) -> Result<(), ApiError> {
    let conn = pool.get().map_err(|e| ApiError::DatabaseError {
        message: e.to_string(),
    })?;

    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "INSERT OR REPLACE INTO summoner_names (puuid, game_name, tag_line, profile_icon_id, cached_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![puuid, game_name, tag_line, profile_icon_id, now],
    )
    .map_err(|e| ApiError::DatabaseError {
        message: e.to_string(),
    })?;

    Ok(())
}
