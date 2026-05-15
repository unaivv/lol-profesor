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

    // Record if LP/tier/rank changed OR if the last snapshot is from a different calendar day (UTC)
    let last: Option<(String, String, i64, i64)> = conn.query_row(
        "SELECT tier, rank, lp, recorded_at FROM lp_history WHERE puuid = ?1 AND queue_type = ?2 ORDER BY recorded_at DESC LIMIT 1",
        rusqlite::params![puuid, queue_type],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
    ).ok();

    let now = chrono::Utc::now();
    if let Some((last_tier, last_rank, last_lp, last_recorded_at)) = last {
        let lp_unchanged = last_tier == tier && last_rank == rank && last_lp == lp;
        let last_date = chrono::DateTime::from_timestamp(last_recorded_at, 0)
            .map(|dt| dt.date_naive());
        let same_day = last_date == Some(now.date_naive());
        if lp_unchanged && same_day {
            return Ok(());
        }
    }
    let now_ts = now.timestamp();
    log::info!("Recording LP snapshot: puuid={}, queue={}, tier={} {} {} LP", puuid, queue_type, tier, rank, lp);

    conn.execute(
        "INSERT INTO lp_history (puuid, queue_type, tier, rank, lp, recorded_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![puuid, queue_type, tier, rank, lp, now_ts],
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

#[cfg(test)]
mod tests {
    use super::*;

    fn test_pool() -> r2d2::Pool<r2d2_sqlite::SqliteConnectionManager> {
        let manager = r2d2_sqlite::SqliteConnectionManager::memory();
        let pool = r2d2::Pool::builder().max_size(1).build(manager).unwrap();
        crate::db::migrations::run(&pool).unwrap();
        pool
    }

    #[test]
    fn record_and_retrieve_snapshot() {
        let pool = test_pool();
        record(&pool, "puuid-1", "RANKED_SOLO_5x5", "GOLD", "II", 75).unwrap();
        let history = get_history(&pool, "puuid-1", "RANKED_SOLO_5x5", 10).unwrap();
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].tier, "GOLD");
        assert_eq!(history[0].rank, "II");
        assert_eq!(history[0].lp, 75);
    }

    #[test]
    fn duplicate_same_day_and_same_lp_not_recorded_twice() {
        let pool = test_pool();
        record(&pool, "puuid-dup", "RANKED_SOLO_5x5", "PLATINUM", "I", 50).unwrap();
        record(&pool, "puuid-dup", "RANKED_SOLO_5x5", "PLATINUM", "I", 50).unwrap();
        let history = get_history(&pool, "puuid-dup", "RANKED_SOLO_5x5", 10).unwrap();
        assert_eq!(history.len(), 1, "Same LP same day should not be recorded twice");
    }

    #[test]
    fn changed_lp_is_always_recorded() {
        let pool = test_pool();
        record(&pool, "puuid-lp", "RANKED_SOLO_5x5", "GOLD", "I", 50).unwrap();
        record(&pool, "puuid-lp", "RANKED_SOLO_5x5", "GOLD", "I", 75).unwrap();
        record(&pool, "puuid-lp", "RANKED_SOLO_5x5", "GOLD", "I", 0).unwrap();
        let history = get_history(&pool, "puuid-lp", "RANKED_SOLO_5x5", 10).unwrap();
        assert_eq!(history.len(), 3, "Each LP change should be recorded");
    }

    #[test]
    fn queue_types_are_independent() {
        let pool = test_pool();
        record(&pool, "puuid-q", "RANKED_SOLO_5x5", "GOLD",     "II", 30).unwrap();
        record(&pool, "puuid-q", "RANKED_FLEX_SR",  "PLATINUM", "IV", 60).unwrap();
        let solo = get_history(&pool, "puuid-q", "RANKED_SOLO_5x5", 10).unwrap();
        let flex = get_history(&pool, "puuid-q", "RANKED_FLEX_SR",  10).unwrap();
        assert_eq!(solo.len(), 1);
        assert_eq!(flex.len(), 1);
        assert_eq!(solo[0].tier, "GOLD");
        assert_eq!(flex[0].tier, "PLATINUM");
    }

    #[test]
    fn empty_history_returns_empty_vec() {
        let pool = test_pool();
        let history = get_history(&pool, "nonexistent", "RANKED_SOLO_5x5", 10).unwrap();
        assert!(history.is_empty());
    }

    #[test]
    fn history_respects_limit() {
        let pool = test_pool();
        // Insert 5 entries with different LP values (different LP = always recorded)
        for lp in [10i64, 20, 30, 40, 50] {
            record(&pool, "puuid-limit", "RANKED_SOLO_5x5", "SILVER", "I", lp).unwrap();
        }
        let history = get_history(&pool, "puuid-limit", "RANKED_SOLO_5x5", 3).unwrap();
        assert_eq!(history.len(), 3);
    }
}
