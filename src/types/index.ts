export interface PlayerData {
  puuid: string
  summonerId: string
  gameName: string
  tagLine: string
  summonerLevel: number
  profileIconId: number
  region: string
}

export interface RankedStats {
  tier: string
  rank: string
  leaguePoints: number
  wins: number
  losses: number
  veteran: boolean
  inactive: boolean
  freshBlood: boolean
  hotStreak: boolean
  queueType: string
}

export interface Match {
  gameId: string
  gameCreation: number
  gameDuration: number
  gameMode: string
  gameType: string
  gameVersion: string
  mapId: number
  participantId: number
  teamId: number
  win: boolean
  championId: number
  championName: string
  kills: number
  deaths: number
  assists: number
  goldEarned: number
  totalMinionsKilled: number
  visionWardsBoughtInGame: number
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
  perk0: number
  perk1: number
  perk2: number
  perk3: number
  perk4: number
  perk5: number
  perkPrimaryStyle: number
  perkSubStyle: number
}

export interface LiveGamePlayer {
  summonerName: string
  championId: number
  championName: string
  teamId: number
  kills: number
  deaths: number
  assists: number
  goldEarned: number
  level: number
  currentHealth: number
  maxHealth: number
  position: string
  items: number[]
  runes: {
    primaryStyle: number
    subStyle: number
    selections: Array<{
      perk: number
      var1: number
      var2: number
      var3: number
    }>
  }
}

export interface LiveGameData {
  gameId: string
  gameMode: string
  gameType: string
  gameStartTime: number
  mapId: number
  gameQueueConfigId: number
  participants: LiveGamePlayer[]
  bannedChampions: Array<{
    championId: number
    teamId: number
    pickTurn: number
  }>
}

// Participant data for detailed match view
export interface Participant {
  participantId: number
  teamId: number
  win: boolean
  championId: number
  championName: string
  kills: number
  deaths: number
  assists: number
  goldEarned: number
  totalMinionsKilled: number
  visionWardsBoughtInGame: number
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
}

// Champion Mastery from API
export interface ChampionMastery {
  championId: number
  championLevel: number
  championPoints: number
  lastPlayTime: number
  championPointsSinceLastLevel: number
  championPointsUntilNextLevel: number
  chestGranted: boolean
  tokensEarned: number
  summonerId: string
  championName?: string
}

// Detailed match with all participants for match history
export interface DetailedMatch {
  gameId: string
  gameCreation: number
  gameDuration: number
  gameMode: string
  gameType: string
  gameVersion: string
  mapId: number
  participants: Participant[]
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  loading?: boolean
}
