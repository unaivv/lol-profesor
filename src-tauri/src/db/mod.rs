pub mod migrations;
pub mod summoner_cache;
pub mod match_cache;
pub mod analysis_cache;

use std::path::Path;
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use crate::error::ApiError;

pub fn setup_pool(db_path: &Path) -> Result<Pool<SqliteConnectionManager>, ApiError> {
    let manager = SqliteConnectionManager::file(db_path);
    let pool = Pool::builder()
        .max_size(10)
        .build(manager)
        .map_err(|e| ApiError::DatabaseError {
            message: e.to_string(),
        })?;

    // Enable WAL mode
    let conn = pool.get().map_err(|e| ApiError::DatabaseError {
        message: e.to_string(),
    })?;
    conn.execute_batch("PRAGMA journal_mode=WAL;")
        .map_err(|e| ApiError::DatabaseError {
            message: e.to_string(),
        })?;

    Ok(pool)
}

pub fn run_migrations(pool: &Pool<SqliteConnectionManager>) -> Result<(), ApiError> {
    migrations::run(pool)
}
