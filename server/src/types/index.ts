export interface PlayerData {
  puuid: string;
  summonerId: string;
  gameName: string;
  tagLine: string;
  summonerLevel: number;
  profileIconId: number;
  region: string;
}

export interface RankedStats {
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  veteran: boolean;
  inactive: boolean;
  freshBlood: boolean;
  hotStreak: boolean;
  queueType: string;
}

export interface Match {
  gameId: string;
  gameCreation: number;
  gameDuration: number;
  gameMode: string;
  gameType: string;
  gameVersion: string;
  mapId: number;
  participantId: number;
  teamId: number;
  win: boolean;
  championId: number;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
goldEarned: number;
  totalMinionsKilled: number;
  visionWardsBoughtInGame: number;
  visionScore: number;
  wardsPlaced: number;
  wardsKilled: number;
  damageDealtToChampions: number;
  damageTaken: number;
  totalHeal: number;
  timePlayed: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  championLevel: number;
  summoner1Id: number;
  summoner2Id: number;
  perk0: number;
  perk1: number;
  perk2: number;
  perk3: number;
  perk4: number;
  perk5: number;
  perkPrimaryStyle: number;
  perkSubStyle: number;
}

export interface LiveGamePlayer {
  summonerName: string;
  championId: number;
  championName: string;
  teamId: number;
  kills: number;
  deaths: number;
  assists: number;
  goldEarned: number;
  level: number;
  currentHealth: number;
  maxHealth: number;
  position: string;
  items: number[];
  runes: {
    primaryStyle: number;
    subStyle: number;
    selections: Array<{
      perk: number;
      var1: number;
      var2: number;
      var3: number;
    }>;
  };
}

export interface LiveGameData {
  gameId: string;
  gameMode: string;
  gameType: string;
  gameStartTime: number;
  mapId: number;
  gameQueueConfigId: number;
  participants: LiveGamePlayer[];
  bannedChampions: Array<{
    championId: number;
    teamId: number;
    pickTurn: number;
  }>;
}

// Participant data for detailed match view
export interface Participant {
  participantId: number;
  teamId: number;
  win: boolean;
  championId: number;
  championName: string;
  summonerName: string;
  profileIconId: number;
  puuid: string;
  kills: number;
  deaths: number;
  assists: number;
  goldEarned: number;
  totalMinionsKilled: number;
  visionWardsBoughtInGame: number;
  visionScore: number;
  wardsPlaced: number;
  wardsKilled: number;
  damageDealtToChampions: number;
  damageTaken: number;
  totalHeal: number;
  timePlayed: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  championLevel: number;
  summoner1Id: number;
  summoner2Id: number;
  perk0: number;
  perk1: number;
  perk2: number;
  perk3: number;
  perk4: number;
  perk5: number;
  perkPrimaryStyle: number;
  perkSubStyle: number;
}

// Detailed match with all participants for match history display
export interface DetailedMatch {
  gameId: string;
  gameCreation: number;
  gameDuration: number;
  gameMode: string;
  gameType: string;
  gameVersion: string;
  mapId: number;
  queueId?: number;
  participants: Participant[];
}

// Champion Mastery (from CHAMPION-MASTERY-V4 API)
export interface ChampionMastery {
  championId: number;
  championLevel: number;        // 1-7
  championPoints: number;
  lastPlayTime: number;         // Timestamp
  championPointsSinceLastLevel: number;
  championPointsUntilNextLevel: number;
  chestGranted: boolean;        // Cofre disponible
  tokensEarned: number;         // Tokens S/M (niveles 6-7)
  summonerId: string;
  championName?: string;       // Added for display
}

// Spectator API (from SPECTATOR-V4 API)
export interface SpectatorGameData {
  gameId: number;
  mapId: number;
  gameMode: string;            // CLASSIC, ARAM, etc.
  gameType: string;
  gameQueueConfigId: number;   // 420 = Solo/Duo, 440 = Flex
  participants: SpectatorParticipant[];
  observers: { encryptionKey: string };
  platformId: string;            // EUW1
  bannedChampions: BannedChampion[];
  gameStartTime: number;
  gameLength: number;           // Segundos transcurridos
}

export interface SpectatorParticipant {
  teamId: number;               // 100 = Azul, 200 = Rojo
  spell1Id: number;            // Hechizo 1
  spell2Id: number;            // Hechizo 2
  championId: number;
  profileIconId: number;
  summonerName: string;
  bot: boolean;
  summonerId: string;
  gameCustomizationObjects: any[];
  perks: {
    perkIds: number[];         // 9 perks seleccionados
    perkStyle: number;         // Estilo primario
    perkSubStyle: number;      // Estilo secundario
  };
}

export interface BannedChampion {
  championId: number;
  teamId: number;
  pickTurn: number;
}

// Extended ranked stats with both queues
export interface RankedStatsExtended {
  solo: RankedStats | null;
  flex: RankedStats | null;
}

// Comprehensive player data (all APIs combined)
export interface PlayerComprehensiveData extends PlayerData {
  matches: DetailedMatch[];
  rankedStats: RankedStatsExtended;
  mastery: ChampionMastery[];
  currentGame: SpectatorGameData | null;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}
