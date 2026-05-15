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
    fn set_and_get_returns_entry() {
        let pool = test_pool();
        set(&pool, "puuid-1", "TestPlayer", "EUW", 123).unwrap();
        let result = get(&pool, "puuid-1").unwrap();
        assert!(result.is_some());
        let (name, tag, icon) = result.unwrap();
        assert_eq!(name, "TestPlayer");
        assert_eq!(tag, "EUW");
        assert_eq!(icon, 123);
    }

    #[test]
    fn get_missing_returns_none() {
        let pool = test_pool();
        let result = get(&pool, "nonexistent-puuid").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn set_overwrites_existing_entry() {
        let pool = test_pool();
        set(&pool, "puuid-update", "OldName", "EUW", 1).unwrap();
        set(&pool, "puuid-update", "NewName", "NA",  2).unwrap();
        let (name, tag, icon) = get(&pool, "puuid-update").unwrap().unwrap();
        assert_eq!(name, "NewName");
        assert_eq!(tag, "NA");
        assert_eq!(icon, 2);
    }

    #[test]
    fn multiple_puuids_are_independent() {
        let pool = test_pool();
        set(&pool, "puuid-a", "PlayerA", "EUW", 10).unwrap();
        set(&pool, "puuid-b", "PlayerB", "NA",  20).unwrap();
        let (name_a, _, _) = get(&pool, "puuid-a").unwrap().unwrap();
        let (name_b, _, _) = get(&pool, "puuid-b").unwrap().unwrap();
        assert_eq!(name_a, "PlayerA");
        assert_eq!(name_b, "PlayerB");
    }
}
