import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(__dirname, '..', '..', 'cache.db')

let db: Database.Database

export function initCache(): Database.Database {
  db = new Database(DB_PATH)
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS summoner_names (
      puuid TEXT PRIMARY KEY,
      game_name TEXT NOT NULL,
      tag_line TEXT,
      profile_icon_id INTEGER DEFAULT 1,
      updated_at INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS match_participants (
      match_id TEXT,
      participant_idx INTEGER,
      puuid TEXT,
      summoner_name TEXT,
      champion_name TEXT,
      team_id INTEGER,
      win INTEGER,
      kills INTEGER,
      deaths INTEGER,
      assists INTEGER,
      gold_earned INTEGER,
      cs INTEGER,
      champion_level INTEGER,
      item0 INTEGER, item1 INTEGER, item2 INTEGER, item3 INTEGER, item4 INTEGER, item5 INTEGER, item6 INTEGER,
      PRIMARY KEY (match_id, participant_idx)
    );
    
    CREATE TABLE IF NOT EXISTS match_info (
      match_id TEXT PRIMARY KEY,
      game_creation INTEGER,
      game_duration INTEGER,
      game_mode TEXT,
      game_type TEXT,
      queue_id INTEGER,
      updated_at INTEGER NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_match_info_updated ON match_info(updated_at);
    CREATE INDEX IF NOT EXISTS idx_participants_match ON match_participants(match_id);
  `)

  console.log('[CACHE] Database initialized at', DB_PATH)
  return db
}

export function getCache(): Database.Database {
  if (!db) {
    return initCache()
  }
  return db
}

export function getSummonerName(puuid: string): { gameName: string; tagLine: string; icon: number } | null {
  const cache = getCache()
  const stmt = cache.prepare('SELECT game_name, tag_line, profile_icon_id FROM summoner_names WHERE puuid = ?')
  const result = stmt.get(puuid) as any
  if (result) {
    return {
      gameName: result.game_name,
      tagLine: result.tag_line,
      icon: result.profile_icon_id
    }
  }
  return null
}

export function setSummonerName(puuid: string, gameName: string, tagLine?: string, iconId: number = 1): void {
  const cache = getCache()
  const stmt = cache.prepare(`
    INSERT OR REPLACE INTO summoner_names (puuid, game_name, tag_line, profile_icon_id, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `)
  stmt.run(puuid, gameName, tagLine || '', iconId, Date.now())
}

export function getMatchParticipants(matchId: string): { gameCreation: number; gameDuration: number; gameMode: string; gameType: string; queueId?: number; participants: any[] } | null {
  const cache = getCache()
  
  const infoStmt = cache.prepare('SELECT * FROM match_info WHERE match_id = ?')
  const matchInfo = infoStmt.get(matchId) as any
  if (!matchInfo) return null

  const partsStmt = cache.prepare('SELECT * FROM match_info WHERE match_id = ?')
  const participants = cache.prepare(
    'SELECT * FROM match_participants WHERE match_id = ? ORDER BY participant_idx'
  ).all(matchId) as any[]
  
  if (participants.length === 0) return null

  return {
    ...matchInfo,
    participants: participants.map((p: any) => ({
      participantId: p.participant_idx + 1,
      puuid: p.puuid,
      summonerName: p.summoner_name,
      championName: p.champion_name,
      teamId: p.team_id,
      win: Boolean(p.win),
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      goldEarned: p.gold_earned,
      totalMinionsKilled: p.cs,
      championLevel: p.champion_level,
      item0: p.item0,
      item1: p.item1,
      item2: p.item2,
      item3: p.item3,
      item4: p.item4,
      item5: p.item5,
      item6: p.item6
    }))
  }
}

export function setMatchParticipants(matchId: string, matchData: any, participants: any[]): void {
  const cache = getCache()
  
  const insertMatch = cache.prepare(`
    INSERT OR REPLACE INTO match_info (match_id, game_creation, game_duration, game_mode, game_type, queue_id, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  insertMatch.run(
    matchId,
    matchData.gameCreation,
    matchData.gameDuration,
    matchData.gameMode,
    matchData.gameType,
    matchData.queueId,
    Date.now()
  )
  
  const insertParticipant = cache.prepare(`
    INSERT OR REPLACE INTO match_participants 
    (match_id, participant_idx, puuid, summoner_name, champion_name, team_id, win, kills, deaths, assists, gold_earned, cs, champion_level, item0, item1, item2, item3, item4, item5, item6)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  
  const insertMany = cache.transaction((parts: any[]) => {
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]
      insertParticipant.run(
        matchId, i, p.puuid, p.summonerName || '', p.championName, p.teamId, p.win ? 1 : 0,
        p.kills, p.deaths, p.assists, p.goldEarned, p.totalMinionsKilled, p.championLevel,
        p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6
      )
    }
  })
  
  insertMany(participants)
}

export function getMultipleSummonerNames(puuids: string[]): Map<string, { gameName: string; tagLine: string; icon: number }> {
  const cache = getCache()
  const result = new Map<string, { gameName: string; tagLine: string; icon: number }>()
  
  if (puuids.length === 0) return result
  
  const placeholders = puuids.map(() => '?').join(',')
  const stmt = cache.prepare(`SELECT puuid, game_name, tag_line, profile_icon_id FROM summoner_names WHERE puuid IN (${placeholders})`)
  const rows = stmt.all(...puuids) as any[]
  
  for (const row of rows) {
    result.set(row.puuid, {
      gameName: row.game_name,
      tagLine: row.tag_line,
      icon: row.profile_icon_id
    })
  }
  
  return result
}

export function cleanOldCache(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
  const cache = getCache()
  const cutoff = Date.now() - maxAgeMs
  
  const deletedSummoners = cache.prepare('DELETE FROM summoner_names WHERE updated_at < ?').run(cutoff)
  const deletedMatches = cache.prepare('DELETE FROM match_info WHERE updated_at < ?').run(cutoff)
  
  console.log(`[CACHE] Cleaned: ${deletedSummoners.changes} summoners, ${deletedMatches.changes} matches`)
}