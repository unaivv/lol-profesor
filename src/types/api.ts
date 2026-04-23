// API Response Types for LoL Professor

// Base Player Information
export interface PlayerData {
  puuid: string
  summonerId: string
  gameName: string
  tagLine: string
  summonerLevel: number
  profileIconId: number
  region: string
  matches?: DetailedMatch[]
  totalMatches?: number        // Total ranked games this season from API
  rankedStats?: RankedStatsExtended | RankedStats | null
  mastery?: ChampionMastery[]
  currentGame?: SpectatorGameData | null
}

// Extended Ranked Stats with both queues
export interface RankedStatsExtended {
  solo: RankedStats | null
  flex: RankedStats | null
}

// Champion Mastery from CHAMPION-MASTERY-V4 API
export interface ChampionMastery {
  championId: number
  championLevel: number        // 1-7
  championPoints: number
  lastPlayTime: number         // Timestamp
  championPointsSinceLastLevel: number
  championPointsUntilNextLevel: number
  chestGranted: boolean        // Cofre disponible
  tokensEarned: number         // Tokens S/M (niveles 6-7)
  summonerId: string
  championName?: string       // Added for display
}

// Spectator API data (partida en vivo via Riot API)
export interface SpectatorGameData {
  gameId: number
  mapId: number
  gameMode: string            // CLASSIC, ARAM, etc.
  gameType: string
  gameQueueConfigId: number   // 420 = Solo/Duo, 440 = Flex
  participants: SpectatorParticipant[]
  observers: { encryptionKey: string }
  platformId: string          // EUW1
  bannedChampions: BannedChampion[]
  gameStartTime: number
  gameLength: number         // Segundos transcurridos
}

export interface SpectatorParticipant {
  teamId: number             // 100 = Azul, 200 = Rojo
  spell1Id: number          // Hechizo 1
  spell2Id: number          // Hechizo 2
  championId: number
  profileIconId: number
  summonerName: string
  bot: boolean
  summonerId: string
  gameCustomizationObjects: any[]
  perks: {
    perkIds: number[]       // 9 perks seleccionados
    perkStyle: number       // Estilo primario
    perkSubStyle: number    // Estilo secundario
  }
}

export interface BannedChampion {
  championId: number
  teamId: number
  pickTurn: number
}

// Match Participant Information
export interface Participant {
  participantId: number
  teamId: number
  win: boolean
  championId: number
  championName: string
  summonerName: string
  profileIconId: number
  puuid?: string
  kills: number
  deaths: number
  assists: number
goldEarned: number
  totalMinionsKilled: number
  visionWardsBoughtInGame: number
  visionScore: number
  wardsPlaced: number
  wardsKilled: number
  damageDealtToChampions: number
  damageTaken: number
  totalHeal: number
  timePlayed: number
  item0: number
  item1: number
  item2: number
  item3: number
  item4: number
  item5: number
  item6: number
  championLevel: number
  summoner1Id: number
  summoner2Id: number
  perk0?: number
  perk1?: number
  perk2?: number
  perk3?: number
  perk4?: number
  perk5?: number
  perkPrimaryStyle?: number
  perkSubStyle?: number
}

// Match Information
export interface Match {
  gameId: string
  gameCreation: number
  gameDuration: number
  gameMode: string
  gameType: string
  gameVersion: string
  mapId: number
  participantId?: number
  teamId?: number
  win?: boolean
  championId?: number
  championName?: string
  kills?: number
  deaths?: number
  assists?: number
  goldEarned?: number
  totalMinionsKilled?: number
  visionWardsBoughtInGame?: number
  visionScore?: number
  wardsPlaced?: number
  wardsKilled?: number
  damageDealtToChampions?: number
  damageTaken?: number
  totalHeal?: number
  timePlayed?: number
  item0?: number
  item1?: number
  item2?: number
  item3?: number
  item4?: number
  item5?: number
  item6?: number
  championLevel?: number
  summoner1Id?: number
  summoner2Id?: number
  participants?: Participant[]
  queueId?: number
}

// Detailed Match with all participants
export interface DetailedMatch extends Match {
  participants: Participant[]
}

export interface MatchTimeline {
  gameId: string
  frames: TimelineFrame[]
  participants: TimelineParticipant[]
}

export interface TimelineParticipant {
  participantId: number
  puuid?: string
  championId: number
  championName: string
}

export interface TimelineFrame {
  timestamp: number
  events: TimelineEvent[]
  participantFrames: Record<number, ParticipantFrame>
}

export interface TimelineEvent {
  type: 'CHAMPION_KILL' | 'CHAMPION_SPECIAL_KILL' | 'ELITE_MONSTER_KILL' | 'ITEM_PURCHASED' | 'ITEM_SOLD' | 'ITEM_DESTROYED' | 'SKILL_LEVEL_UP' | 'WARD_PLACED' | 'WARD_KILL' | 'BUILDING_KILL' | 'OBJECTIVE_BOUNTY_PRIME_BONUS_REWARD' | 'CAPTURE_POINT'
  timestamp: number
  participantId?: number
  killerId?: number
  victimId?: number
  assistingParticipantIds?: number[]
  monsterType?: string
  monsterSubType?: string
  teamId?: number
  itemId?: number
  level?: number
  wardType?: string
  buildingType?: string
  laneType?: string
  towerType?: string
}

export interface ParticipantFrame {
  participantId: number
  level: number
  currentHealth: number
  maxHealth: number
  minionsKilled: number
  jungleMinionsKilled: number
  totalGold: number
  xp: number
  position?: { x: number; y: number }
}

// Ranked Statistics
export interface RankedStats {
  leagueId: string
  queueType: string
  tier: string
  rank: string
  summonerId: string
  leaguePoints: number
  wins: number
  losses: number
  veteran: boolean
  inactive: boolean
  freshBlood: boolean
  hotStreak: boolean
}

// Live Game Player Information
export interface LiveGamePlayer {
  summonerName: string
  championId: number
  championName: string
  teamId: number
  spell1Id: number
  spell2Id: number
  profileIconId: number
  summonerLevel: number
  runes?: {
    primaryStyleId: number
    subStyleId: number
    selectedPerkIds: number[]
  }
  gameCustomizationObjects?: Array<{
    categoryId: string
    content: string
    inventoryType: string
    itemId: number
    quantity: number
  }>
}

// Live Game Information
export interface LiveGameData {
  gameId: string
  gameMode: string
  gameType: string
  gameStartTime: number
  mapId: number
  gameLength: number
  platformId: string
  gameQueueConfigId: string
  observers: {
    encryptionKey: string
  }
  participants: LiveGamePlayer[]
  bannedChampions?: Array<{
    championId: number
    teamId: number
    pickTurn: number
  }>
}

// API Response Wrapper
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

// Error Response
export interface ApiError {
  error: string
  message: string
  status: number
}

// Riot API Raw Responses
export interface RiotAccount {
  puuid: string
  gameName: string
  tagLine: string
}

export interface RiotSummoner {
  id: string
  accountId: string
  puuid: string
  name: string
  profileIconId: number
  revisionDate: number
  summonerLevel: number
}

export interface RiotMatchReference {
  gameId: string
  champion: number
  lane: string
  platformId: string
  role: string
  season: number
  queue: string
  timestamp: number
}

// Utility Types
export type TeamId = 100 | 200
export type GameMode = 'CLASSIC' | 'ARAM' | 'URF' | 'ONEFORALL' | 'TUTORIAL' | 'PRACTICETOOL'
export type QueueType = 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR' | 'NORMAL_5x5_BLIND' | 'ARAM_5x5'
export type Tier = 'IRON' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'EMERALD' | 'DIAMOND' | 'MASTER' | 'GRANDMASTER' | 'CHALLENGER'
export type Rank = 'I' | 'II' | 'III' | 'IV'

// Helper Types for Component Props
export interface PlayerStatsProps {
  playerData: PlayerData
  rankedStats: RankedStats | RankedStatsExtended | null | undefined
}

export interface MatchHistoryProps {
  matches: DetailedMatch[]
  playerPuuid?: string
  currentPlayerData?: PlayerData | null
}

export interface LiveGameTrackerProps {
  // No props needed for now
}

// Validation Helpers
export const isValidPlayerData = (data: any): data is PlayerData => {
  return (
    data &&
    typeof data.puuid === 'string' &&
    typeof data.summonerId === 'string' &&
    typeof data.gameName === 'string' &&
    typeof data.tagLine === 'string' &&
    typeof data.summonerLevel === 'number' &&
    typeof data.profileIconId === 'number' &&
    typeof data.region === 'string'
  )
}

export const isValidMatch = (data: any): data is DetailedMatch => {
  return (
    data &&
    typeof data.gameId === 'string' &&
    typeof data.gameCreation === 'number' &&
    typeof data.gameDuration === 'number' &&
    Array.isArray(data.participants) &&
    data.participants.every((p: any) => typeof p.participantId === 'number')
  )
}

export const isValidRankedStats = (data: any): data is RankedStats => {
  return (
    data &&
    typeof data.tier === 'string' &&
    typeof data.rank === 'string' &&
    typeof data.leaguePoints === 'number' &&
    typeof data.wins === 'number' &&
    typeof data.losses === 'number'
  )
}
