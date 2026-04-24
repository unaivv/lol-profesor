use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use crate::error::ApiError;

pub fn run(pool: &Pool<SqliteConnectionManager>) -> Result<(), ApiError> {
    let conn = pool.get().map_err(|e| ApiError::DatabaseError {
        message: e.to_string(),
    })?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS summoner_names (
            puuid TEXT PRIMARY KEY,
            game_name TEXT NOT NULL,
            tag_line TEXT NOT NULL,
            profile_icon_id INTEGER NOT NULL DEFAULT 1,
            cached_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS match_info (
            match_id TEXT PRIMARY KEY,
            raw_json TEXT NOT NULL,
            cached_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS match_analyses (
            match_id TEXT NOT NULL,
            puuid TEXT NOT NULL,
            analysis_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            PRIMARY KEY (match_id, puuid)
        );

        CREATE INDEX IF NOT EXISTS idx_summoner_names_puuid ON summoner_names(puuid);
        CREATE INDEX IF NOT EXISTS idx_match_info_match_id ON match_info(match_id);
        ",
    )
    .map_err(|e| ApiError::DatabaseError {
        message: e.to_string(),
    })?;

    Ok(())
}
