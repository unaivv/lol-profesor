use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use serde::{Deserialize, Serialize};
use crate::error::ApiError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LpSnapshot {
    pub tier: String,
    pub rank: String,
    pub lp: i64,
    pub recorded_at: i64,
}

pub fn record(
    pool: &Pool<SqliteConnectionManager>,
    puuid: &str,
    queue_type: &str,
    tier: &str,
    rank: &str,
    lp: i64,
) -> Result<(), ApiError> {
    let conn = pool.get().map_err(|e| ApiError::DatabaseError { message: e.to_string() })?;

    // Always record the snapshot to track progress over time
    let now = chrono::Utc::now().timestamp();

    log::info!("Recording LP snapshot: puuid={}, queue={}, tier={} {} {} LP", puuid, queue_type, tier, rank, lp);

    conn.execute(
        "INSERT INTO lp_history (puuid, queue_type, tier, rank, lp, recorded_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![puuid, queue_type, tier, rank, lp, now],
    ).map_err(|e| ApiError::DatabaseError { message: e.to_string() })?;

    // Keep only the last 100 snapshots per player/queue to prevent DB bloat
    // Delete old records beyond the 100 most recent
    conn.execute(
        "DELETE FROM lp_history WHERE rowid IN (
            SELECT rowid FROM lp_history 
            WHERE puuid = ?1 AND queue_type = ?2 
            ORDER BY recorded_at DESC 
            LIMIT -1 OFFSET 100
        )",
        rusqlite::params![puuid, queue_type],
    ).ok();

    Ok(())
}

pub fn get_history(
    pool: &Pool<SqliteConnectionManager>,
    puuid: &str,
    queue_type: &str,
    limit: i64,
) -> Result<Vec<LpSnapshot>, ApiError> {
    let conn = pool.get().map_err(|e| ApiError::DatabaseError { message: e.to_string() })?;

    let mut stmt = conn.prepare(
        "SELECT tier, rank, lp, recorded_at FROM lp_history WHERE puuid = ?1 AND queue_type = ?2 ORDER BY recorded_at ASC LIMIT ?3",
    ).map_err(|e| ApiError::DatabaseError { message: e.to_string() })?;

    let rows = stmt.query_map(rusqlite::params![puuid, queue_type, limit], |row| {
        Ok(LpSnapshot {
            tier: row.get(0)?,
            rank: row.get(1)?,
            lp: row.get(2)?,
            recorded_at: row.get(3)?,
        })
    }).map_err(|e| ApiError::DatabaseError { message: e.to_string() })?;

    let snapshots: Result<Vec<_>, _> = rows.collect();
    snapshots.map_err(|e| ApiError::DatabaseError { message: e.to_string() })
}
