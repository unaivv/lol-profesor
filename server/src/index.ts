import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import axios from 'axios';
import https from 'https';
import dotenv from 'dotenv';
import path from 'path';
import { PlayerData, RankedStats, Match, LiveGameData, DetailedMatch, Participant, ChampionMastery, SpectatorGameData, SpectatorParticipant, BannedChampion, PlayerComprehensiveData, RankedStatsExtended } from './types';
import { initCache, getSummonerName, setSummonerName, getMultipleSummonerNames, setMatchParticipants, getMatchParticipants } from './cache';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Initialize SQLite cache
initCache();

// Middleware
app.use(cors());
app.use(express.json());

// Riot API configuration
const RIOT_API_KEY = process.env.RIOT_API_KEY || 'RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
const BASE_URL = 'https://europe.api.riotgames.com';
const REGIONAL_URL = 'https://euw1.api.riotgames.com';

// Riot API axios instance
const riotApi = axios.create({
  headers: {
    'X-Riot-Token': RIOT_API_KEY
  }
});

// Interfaces for Riot API responses
interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

interface RiotSummoner {
  id: string;
  puuid: string;
  summonerLevel: number;
  profileIconId: number;
}

interface RiotRankedEntry {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  veteran: boolean;
  inactive: boolean;
  freshBlood: boolean;
  hotStreak: boolean;
}

// Helper function to handle API errors
const handleApiError = (error: any, res: Response, defaultMessage: string) => {
  if (error.response) {
    return res.status(error.response.status).json({
      error: error.response.data?.status?.message || defaultMessage
    });
  } else if (error.request) {
    return res.status(500).json({ error: 'No response from Riot API' });
  } else {
    return res.status(500).json({ error: error.message || defaultMessage });
  }
};

// Routes

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Get player by Riot ID
app.get('/api/player/:gameName/:tagLine', async (req: Request, res: Response) => {
  try {
    const { gameName, tagLine } = req.params;

    // Get account by Riot ID
    const accountResponse = await riotApi.get<RiotAccount>(
      `${BASE_URL}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName as string)}/${encodeURIComponent(tagLine as string)}`
    );

    const accountData = accountResponse.data;

    // Get summoner data by PUUID
    const summonerResponse = await riotApi.get<RiotSummoner>(
      `${REGIONAL_URL}/lol/summoner/v4/summoners/by-puuid/${accountData.puuid}`
    );

    const summonerData = summonerResponse.data;

    const playerData: PlayerData = {
      puuid: accountData.puuid,
      summonerId: summonerData.id,
      gameName: accountData.gameName,
      tagLine: accountData.tagLine,
      summonerLevel: summonerData.summonerLevel,
      profileIconId: summonerData.profileIconId,
      region: 'EUW'
    };

    res.json(playerData);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch player data');
  }
});

// Get match history
app.get('/api/matches/:puuid', async (req: Request, res: Response) => {
  try {
    const { puuid } = req.params;
    const count = parseInt(req.query.count as string) || 20;
    const start = parseInt(req.query.start as string) || 0;

    // Get match IDs
    const matchIdsResponse = await riotApi.get<string[]>(
      `${BASE_URL}/lol/match/v5/matches/by-puuid/${puuid}/ids`,
      { params: { count, start } }
    );

    const matchIds = matchIdsResponse.data;
    const matches: Match[] = [];

    // Get details for each match (limit to 10 for performance)
    for (const matchId of matchIds.slice(0, 10)) {
      try {
        const matchResponse = await riotApi.get<any>(
          `${BASE_URL}/lol/match/v5/matches/${matchId}`
        );

        const matchData = matchResponse.data;

        // Find the player in the match
        const participant = matchData.info.participants.find((p: any) => p.puuid === puuid);

        if (participant) {
          const match: Match = {
            gameId: matchId,
            gameCreation: matchData.info.gameCreation,
            gameDuration: matchData.info.gameDuration,
            gameMode: matchData.info.gameMode,
            gameType: matchData.info.gameType,
            gameVersion: matchData.info.gameVersion,
            mapId: matchData.info.mapId,
            participantId: participant.participantId,
            teamId: participant.teamId,
            win: participant.win,
            championId: participant.championId,
            championName: participant.championName,
            kills: participant.kills,
            deaths: participant.deaths,
            assists: participant.assists,
            goldEarned: participant.goldEarned,
            totalMinionsKilled: participant.totalMinionsKilled,
            visionWardsBoughtInGame: participant.visionWardsBoughtInGame,
            visionScore: participant.visionScore || 0,
            wardsPlaced: participant.wardsPlaced || 0,
            wardsKilled: participant.wardsKilled || 0,
            damageDealtToChampions: participant.totalDamageDealtToChampions,
            damageTaken: participant.totalDamageTaken,
            totalHeal: participant.totalHeal,
            timePlayed: participant.timePlayed,
            item0: participant.item0,
            item1: participant.item1,
            item2: participant.item2,
            item3: participant.item3,
            item4: participant.item4,
            item5: participant.item5,
            item6: participant.item6,
            championLevel: participant.champLevel,
            summoner1Id: participant.summoner1Id,
            summoner2Id: participant.summoner2Id,
            perk0: participant.perks?.styles?.[0]?.selections?.[0]?.perk || 0,
            perk1: participant.perks?.styles?.[0]?.selections?.[1]?.perk || 0,
            perk2: participant.perks?.styles?.[0]?.selections?.[2]?.perk || 0,
            perk3: participant.perks?.styles?.[1]?.selections?.[0]?.perk || 0,
            perk4: participant.perks?.styles?.[1]?.selections?.[1]?.perk || 0,
            perk5: participant.perks?.styles?.[1]?.selections?.[2]?.perk || 0,
            perkPrimaryStyle: participant.perks?.styles?.[0]?.style || 0,
            perkSubStyle: participant.perks?.styles?.[1]?.style || 0
          };
          matches.push(match);
        }
      } catch (matchError) {
        console.warn(`Failed to fetch match ${matchId}:`, matchError instanceof Error ? matchError.message : 'Unknown error');
        // Continue with other matches even if one fails
      }
    }

    res.json(matches);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch match history');
  }
});

// Get detailed match history with all participants
app.get('/api/matches/:puuid/details', async (req: Request, res: Response) => {
  try {
    const { puuid } = req.params;
    const count = parseInt(req.query.count as string) || 50;
    const start = parseInt(req.query.start as string) || 0;

    // Get match IDs
    const matchIdsResponse = await riotApi.get<string[]>(
      `${BASE_URL}/lol/match/v5/matches/by-puuid/${puuid}/ids`,
      { params: { count, start } }
    );

    const matchIds = matchIdsResponse.data;
    const detailedMatches: DetailedMatch[] = [];

    // Get details for each match with ALL participants
    for (const matchId of matchIds.slice(0, count)) {
      try {
        const matchResponse = await riotApi.get<any>(
          `${BASE_URL}/lol/match/v5/matches/${matchId}`
        );

        const matchData = matchResponse.data;

        // Map ALL participants from the match
        const participants: Participant[] = []
        const participantPuuids = matchData.metadata.participants || []
        
        // Fetch all summoner names in parallel with timeout
        const fetchSummonerNames = async () => {
          const results: { name: string; icon: number }[] = []
          
          const namePromises = participantPuuids.map(async (puuid: string) => {
            if (!puuid) return { name: '', icon: 1 }
            
            try {
              const accountResp = await riotApi.get(
                `${BASE_URL}/riot/account/v1/accounts/by-puuid/${puuid}`
              )
              if (accountResp.data?.gameName) {
                return { name: accountResp.data.gameName, icon: 1 }
              }
            } catch {
              // Fallback to summoner API
              try {
                const summonerResp = await riotApi.get(
                  `${REGIONAL_URL}/lol/summoner/v4/summoners/by-puuid/${puuid}`
                )
                return { 
                  name: summonerResp.data?.name || '', 
                  icon: summonerResp.data?.profileIconId || 1 
                }
              } catch {
                return { name: '', icon: 1 }
              }
            }
            return { name: '', icon: 1 }
          })
          
          return Promise.all(namePromises)
        }
        
        const summonerData = await fetchSummonerNames()
        
        for (let i = 0; i < matchData.info.participants.length; i++) {
          const p = matchData.info.participants[i]
          const nameData = summonerData[i] || { name: '', icon: 1 }
          const puuid = participantPuuids[i] || ''
          
          participants.push({
            participantId: p.participantId,
            teamId: p.teamId,
            win: p.win,
            championId: p.championId,
            championName: p.championName,
            summonerName: nameData.name,
            profileIconId: nameData.icon,
            puuid: puuid,
            kills: p.kills,
            deaths: p.deaths,
            assists: p.assists,
            goldEarned: p.goldEarned,
            totalMinionsKilled: p.totalMinionsKilled,
            visionWardsBoughtInGame: p.visionWardsBoughtInGame,
            visionScore: p.visionScore || 0,
            wardsPlaced: p.wardsPlaced || 0,
            wardsKilled: p.wardsKilled || 0,
            damageDealtToChampions: p.totalDamageDealtToChampions,
            damageTaken: p.totalDamageTaken,
            totalHeal: p.totalHeal,
            timePlayed: p.timePlayed,
            item0: p.item0,
            item1: p.item1,
            item2: p.item2,
            item3: p.item3,
            item4: p.item4,
            item5: p.item5,
            item6: p.item6,
            championLevel: p.champLevel,
            summoner1Id: p.summoner1Id,
            summoner2Id: p.summoner2Id,
            perk0: p.perks?.styles?.[0]?.selections?.[0]?.perk || 0,
            perk1: p.perks?.styles?.[0]?.selections?.[1]?.perk || 0,
            perk2: p.perks?.styles?.[0]?.selections?.[2]?.perk || 0,
            perk3: p.perks?.styles?.[1]?.selections?.[0]?.perk || 0,
            perk4: p.perks?.styles?.[1]?.selections?.[1]?.perk || 0,
            perk5: p.perks?.styles?.[1]?.selections?.[2]?.perk || 0,
            perkPrimaryStyle: p.perks?.styles?.[0]?.style || 0,
            perkSubStyle: p.perks?.styles?.[1]?.style || 0
          })
        }

        const detailedMatch: DetailedMatch = {
          gameId: matchId,
          gameCreation: matchData.info.gameCreation,
          gameDuration: matchData.info.gameDuration,
          gameMode: matchData.info.gameMode,
          gameType: matchData.info.gameType,
          gameVersion: matchData.info.gameVersion,
          mapId: matchData.info.mapId,
          queueId: matchData.info.queueId,
          participants: participants
        };

        detailedMatches.push(detailedMatch);
      } catch (matchError) {
        console.warn(`Failed to fetch match ${matchId}:`, matchError instanceof Error ? matchError.message : 'Unknown error');
      }
    }

    res.json(detailedMatches);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch detailed match history');
  }
});

// Get match timeline (minuto a minuto)
app.get('/api/match/:matchId/timeline', async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;

    const response = await riotApi.get(
      `${BASE_URL}/lol/match/v5/matches/${matchId}/timeline`
    );

    const timelineData = response.data;

    const processedTimeline = {
      gameId: matchId,
      frames: timelineData.info.frames?.slice(0, 60) || [],
      participants: timelineData.info.participants?.map((p: any) => ({
        participantId: p.participantId,
        puuid: p.puuid,
        championId: p.championId,
        championName: p.championName
      })) || []
    };

    res.json(processedTimeline);
  } catch (error: any) {
    if (error.response?.status === 404) {
      res.status(404).json({ error: 'Timeline not available for this match (may be too old)' });
    } else {
      handleApiError(error, res, 'Failed to fetch match timeline');
    }
  }
});

// Get ranked stats
app.get('/api/ranked/:summonerId', async (req: Request, res: Response) => {
  try {
    const { summonerId } = req.params;

    const response = await riotApi.get<RiotRankedEntry[]>(
      `${REGIONAL_URL}/lol/league/v4/entries/by-summoner/${summonerId}`
    );

    const rankedData = response.data;

    // Find solo queue ranked stats
    const soloQueue = rankedData.find(entry => entry.queueType === 'RANKED_SOLO_5x5');

    if (soloQueue) {
      const rankedStats: RankedStats = {
        tier: soloQueue.tier,
        rank: soloQueue.rank,
        leaguePoints: soloQueue.leaguePoints,
        wins: soloQueue.wins,
        losses: soloQueue.losses,
        veteran: soloQueue.veteran,
        inactive: soloQueue.inactive,
        freshBlood: soloQueue.freshBlood,
        hotStreak: soloQueue.hotStreak,
        queueType: soloQueue.queueType
      };
      res.json(rankedStats);
    } else {
      res.status(404).json({ error: 'No ranked data found' });
    }
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch ranked stats');
  }
});

// Get live game data
app.get('/api/live-game', async (req: Request, res: Response) => {
  try {
    // Connect to League of Legends Client API
    const liveGameResponse = await axios.get('https://127.0.0.1:2999/liveclientdata/allgamedata', {
      timeout: 5000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });

    const data = liveGameResponse.data;

    // Transform the data to match our expected format
    const liveGameData: LiveGameData = {
      gameId: data.gameId || '',
      gameMode: data.gameMode || '',
      gameType: data.gameType || '',
      gameStartTime: data.gameStartTime || 0,
      mapId: data.mapId || 0,
      gameQueueConfigId: data.gameQueueConfigId || 0,
      participants: [],
      bannedChampions: data.bannedChampions || []
    };

    // Process participants
    if (data.allPlayers) {
      data.allPlayers.forEach((participant: any) => {
        const playerData = {
          summonerName: participant.summonerName || '',
          championId: participant.championId || 0,
          championName: participant.championName || '',
          teamId: participant.teamId || 0,
          kills: participant.scores?.kills || 0,
          deaths: participant.scores?.deaths || 0,
          assists: participant.scores?.assists || 0,
          goldEarned: participant.currentGold || 0,
          level: participant.level || 1,
          currentHealth: participant.championStats?.currentHealth || 0,
          maxHealth: participant.championStats?.maxHealth || 0,
          position: participant.position || '',
          items: [
            participant.item0 || 0,
            participant.item1 || 0,
            participant.item2 || 0,
            participant.item3 || 0,
            participant.item4 || 0,
            participant.item5 || 0,
            participant.item6 || 0
          ],
          runes: {
            primaryStyle: participant.fullRunes?.primaryStyle || 0,
            subStyle: participant.fullRunes?.subStyle || 0,
            selections: participant.fullRunes?.selections || []
          }
        };
        liveGameData.participants.push(playerData);
      });
    }

    res.json(liveGameData);
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      res.status(404).json({ error: 'League of Legends client not running' });
    } else {
      res.status(404).json({ error: 'No active game found' });
    }
  }
});

// Get champion mastery for player
app.get('/api/mastery/:puuid', async (req: Request, res: Response) => {
  try {
    const { puuid } = req.params;

    const response = await riotApi.get<ChampionMastery[]>(
      `${REGIONAL_URL}/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`
    );

    res.json(response.data);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch champion mastery');
  }
});

// Get spectator data (active game) via Riot API V5 (uses PUUID)
app.get('/api/spectator/:puuid', async (req: Request, res: Response) => {
  try {
    const { puuid } = req.params;

    const response = await riotApi.get<SpectatorGameData>(
      `${REGIONAL_URL}/lol/spectator/v5/active-games/by-summoner/${puuid}`
    );

    res.json(response.data);
  } catch (error: any) {
    if (error.response?.status === 404) {
      res.status(404).json({ error: 'Player not in an active game' });
    } else {
      handleApiError(error, res, 'Failed to fetch spectator data');
    }
  }
});

// Get ranked flex stats
app.get('/api/ranked/:summonerId/flex', async (req: Request, res: Response) => {
  try {
    const { summonerId } = req.params;

    const response = await riotApi.get<RiotRankedEntry[]>(
      `${REGIONAL_URL}/lol/league/v4/entries/by-summoner/${summonerId}`
    );

    const flexQueue = response.data.find(entry => entry.queueType === 'RANKED_FLEX_SR');

    if (flexQueue) {
      const rankedStats: RankedStats = {
        tier: flexQueue.tier,
        rank: flexQueue.rank,
        leaguePoints: flexQueue.leaguePoints,
        wins: flexQueue.wins,
        losses: flexQueue.losses,
        veteran: flexQueue.veteran,
        inactive: flexQueue.inactive,
        freshBlood: flexQueue.freshBlood,
        hotStreak: flexQueue.hotStreak,
        queueType: flexQueue.queueType
      };
      res.json(rankedStats);
    } else {
      res.status(404).json({ error: 'No flex ranked data found' });
    }
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch flex ranked stats');
  }
});

// Get comprehensive player data (all APIs combined)
app.get('/api/player/:gameName/:tagLine/comprehensive', async (req: Request, res: Response) => {
  try {
    const { gameName, tagLine } = req.params;

    // 1. Get account data
    const accountResponse = await riotApi.get<RiotAccount>(
      `${BASE_URL}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    );
    const accountData = accountResponse.data;

    // 2. Get summoner data
    const summonerResponse = await riotApi.get<RiotSummoner>(
      `${REGIONAL_URL}/lol/summoner/v4/summoners/by-puuid/${accountData.puuid}`
    );
    const summonerData = summonerResponse.data;

    // 3. Get all data in parallel
    const [rankedResponse, masteryResponse, matchIdsResponse, spectatorResponse] = await Promise.allSettled([
      riotApi.get<RiotRankedEntry[]>(`${REGIONAL_URL}/lol/league/v4/entries/by-puuid/${accountData.puuid}`),
      riotApi.get<ChampionMastery[]>(`${REGIONAL_URL}/lol/champion-mastery/v4/champion-masteries/by-puuid/${accountData.puuid}`),
      riotApi.get<string[]>(`${BASE_URL}/lol/match/v5/matches/by-puuid/${accountData.puuid}/ids`, { params: { count: 20 } }),
      riotApi.get<SpectatorGameData>(`${REGIONAL_URL}/lol/spectator/v5/active-games/by-summoner/${accountData.puuid}`)
    ]);

    // Extract ranked data
    const rankedData = rankedResponse.status === 'fulfilled' ? rankedResponse.value.data : [];
    console.log('[RANKED] Full ranked data:', rankedData);
    console.log('[RANKED] Status:', rankedResponse.status);
    
    // Filter for different queue types - Riot changed queue type names
    const soloQueue = rankedData.find((entry: any) => 
      entry.queueType === 'RANKED_SOLO_5x5' || entry.queueType === 'RANKED' || entry.queueType?.includes('SOLO')
    );
    const flexQueue = rankedData.find((entry: any) => 
      entry.queueType === 'RANKED_FLEX_SR' || entry.queueType === 'FLEX' || entry.queueType?.includes('FLEX')
    );
    console.log('[RANKED] soloQueue:', soloQueue);
    console.log('[RANKED] flexQueue:', flexQueue);

    console.log('[RANKED] rankedStats being sent:', { solo: soloQueue ? 'has data' : 'null', flex: flexQueue ? 'has data' : 'null' });
    
    const rankedStats: RankedStatsExtended = {
      solo: soloQueue ? {
        tier: soloQueue.tier,
        rank: soloQueue.rank,
        leaguePoints: soloQueue.leaguePoints,
        wins: soloQueue.wins,
        losses: soloQueue.losses,
        veteran: soloQueue.veteran,
        inactive: soloQueue.inactive,
        freshBlood: soloQueue.freshBlood,
        hotStreak: soloQueue.hotStreak,
        queueType: soloQueue.queueType
      } : null,
      flex: flexQueue ? {
        tier: flexQueue.tier,
        rank: flexQueue.rank,
        leaguePoints: flexQueue.leaguePoints,
        wins: flexQueue.wins,
        losses: flexQueue.losses,
        veteran: flexQueue.veteran,
        inactive: flexQueue.inactive,
        freshBlood: flexQueue.freshBlood,
        hotStreak: flexQueue.hotStreak,
        queueType: flexQueue.queueType
      } : null
    };

// Add championName to mastery entries
const championIdToName: Record<number, string> = {
  1: "Annie", 2: "Olaf", 3: "Galio", 4: "TwistedFate", 5: "XinZhao",
  6: "Urgot", 7: "Leona", 8: "Vladimir", 9: "Fiddlesticks", 10: "Kayn",
  11: "MasterYi", 12: "Alistar", 13: "Ryze", 14: "Sion", 15: "Sivir",
  16: "Soraka", 17: "Teemo", 18: "Tristana", 19: "Warwick", 20: "Nunu",
  21: "MissFortune", 22: "Ashe", 23: "Varus", 24: "Vayne", 25: "Corki",
  26: "Morgana", 27: "Singed", 28: "Sona", 29: "Twitch", 30: "Karthus",
  31: "Pyke", 32: "Janna", 33: "Zoe", 34: "Karma", 35: "JarvanIV",
  36: "Malzahar", 37: "Irelia", 38: "Rumble", 39: "Jinx", 40: "Nami",
  41: "Kalista", 42: "Katarina", 43: "Jayce", 44: "Lux", 45: "Poppy",
  46: "Riven", 47: "Yorick", 48: "Akali", 49: "Thresh", 50: "Swain",
  51: "Lucian", 52: "Rengar", 53: "Kled", 54: "Vex", 55: "Zeri",
  56: "Senna", 57: "Garen", 58: "Varitan", 59: "Ornn", 60: "Shen",
  61: "Kennen", 62: "Elise", 63: "Gwen", 64: "Viego", 65: "Neeko",
  66: "Rhim", 67: "Zed", 68: "Zac", 69: "Kaisa", 70: "Viktor",
  71: "Braum", 72: "Skarner", 73: "Sett", 74: "Seraphine", 75: "Yuumi",
  76: "Zoe", 77: "Udyr", 78: "Aurora", 79: "KSante", 80: "BelVeth",
  81: "Smolder", 82: "Milio", 83: "Naafiri", 84: "Vi", 85: "Orianna",
  86: "Bard", 87: "Blitzcrank", 88: "Rumble", 89: "Poppy", 90: "Malphite",
  91: "Evelynn", 92: "Nidalee", 93: "Riven", 94: "Kassadin", 95: "Gragas",
  96: "Pantheon", 97: "Shaco", 98: "Shen", 99: "Kaisa", 100: "Khazix",
  101: "Rammus", 102: "Shyvana", 103: "Nami", 104: "Graves", 105: "Fizz",
  106: "Volibear", 107: "Heimerdinger", 108: "Ziggs", 109: "DrMundo", 110: "Taric",
  111: "Tryndamere", 112: "Singed", 113: "Malzahar", 114: "Azir", 115: "Yuumi",
  116: "Ahri", 117: "Darius", 118: "Vayne", 119: "Kassadin", 120: "Nocturne",
  121: "Renekton", 122: "JarvanIV", 123: "Olaf", 124: "Jax", 125: "Ezreal",
  126: "Lynette", 127: "Leona", 128: "Gangplank", 129: "Poppy", 130: "Ryze",
  131: "Katarina", 132: "Renata", 133: "Quinn", 134: "Syndra", 135: "AurelionSol",
  136: "Soraka", 137: "Ryze", 138: "Rengar", 139: "Zilean", 140: "Sion",
  141: "Yasuo", 142: "Zoe", 143: "Zyra", 144: "Sona", 145: "Katarina",
  146: "Maokai", 147: "Seraphine", 148: "Rumble", 149: "Nunu", 150: "Amumu",
  151: "Yasuo", 152: "Ekko", 153: "Qiyana", 154: "Viego", 155: "Kaisa",
  156: "Kayle", 157: "Yasuo", 158: "Zed", 159: "Kled", 160: "Ekko",
  161: "Velkoz", 162: "Kayle", 163: "Taliyah", 164: "Katarina", 165: "Viego",
  166: "Jhin", 167: "Jhin", 168: "Jhin", 169: "Jhin", 170: "Jhin",
  171: "Jhin", 172: "Jhin", 173: "Jhin", 174: "Jhin", 175: "Jhin",
  176: "Jhin", 177: "Jhin", 178: "Jhin", 179: "Jhin", 180: "Jhin",
  181: "Jhin", 182: "Jhin", 183: "Jhin", 184: "Jhin", 185: "Jhin",
  186: "Jhin", 187: "Jhin", 188: "Jhin", 189: "Jhin", 190: "Jhin",
  191: "Jhin", 192: "Yasuo", 193: "Kayle", 194: "Kayle", 195: "Kayle",
  196: "Kayle", 197: "Jhin", 198: "Kayle", 199: "Kayle", 200: "Kayle",
  201: "Kayle", 202: "Kayle", 203: "Kayle", 204: "Kayle", 205: "Kayle",
  206: "Kayle", 207: "Kayle", 208: "Kayle", 209: "Kayle", 210: "Kayle",
  211: "Kayle", 212: "Kayle", 213: "Kayle", 214: "Kayle", 215: "Kayle",
  216: "Kayle", 217: "Kayle", 218: "Kayle", 219: "Kayle", 220: "Kayle",
  221: "Zeri", 222: "Kayle", 223: "TahmKench", 224: "Yasuo", 225: "Yasuo",
  226: "Kayle", 227: "Yasuo", 228: "Yasuo", 229: "Yasuo", 230: "Kayle",
  231: "Kayle", 232: "Kayle", 233: "Tryndamere", 234: "Viego", 235: "Senna",
  236: "Yasuo", 237: "Yasuo", 238: "Zed", 239: "Viego", 240: "Viego",
  241: "Viego", 242: "Viego", 243: "Viego", 244: "Viego", 245: "Viego",
  246: "Viego", 247: "Viego", 248: "Viego", 249: "Viego", 250: "Viego",
  251: "Viego", 252: "Viego", 253: "Viego", 254: "Vi", 255: "Viego",
  256: "Viego", 257: "Viego", 258: "Viego", 259: "Viego", 260: "Viego",
  261: "Viego", 262: "Viego", 263: "Viego", 264: "Viego", 265: "Viego",
  266: "Kaisa", 267: "Kayle", 268: "Kayle", 269: "Kayle", 270: "Zoe",
  271: "Kayle", 272: "Kayle", 273: "Kayle", 274: "Kayle", 275: "Kayle",
  276: "Kayle", 277: "Kayle", 278: "Kayle", 279: "Kayle", 280: "Kayle",
  281: "Kayle", 282: "Kayle", 283: "Kayle", 284: "Kayle", 285: "Kayle",
  286: "Kayle", 287: "Kayle", 288: "Kayle", 289: "Kayle", 290: "Kayle",
  291: "Kayle", 292: "Kayle", 293: "Kayle", 294: "Kayle", 295: "Kayle",
  296: "Kayle", 297: "Kayle", 298: "Kayle", 299: "Kayle", 300: "Kayle",
  301: "Kayle", 302: "Kayle", 303: "Kayle", 304: "Kayle", 305: "Kayle",
  306: "Kayle", 307: "Kayle", 308: "Kayle", 309: "Kayle", 310: "Kayle",
  311: "Kayle", 312: "Kayle", 313: "Kayle", 314: "Kayle", 315: "Kayle",
  316: "Kayle", 317: "Kayle", 318: "Kayle", 319: "Kayle", 320: "Kayle",
  321: "Kayle", 322: "Kayle", 323: "Kayle", 324: "Kayle", 325: "Kayle",
  326: "Naafiri", 327: "Naafiri", 328: "Naafiri", 329: "Naafiri", 330: "Naafiri",
  331: "Naafiri", 332: "Naafiri", 333: "Naafiri", 334: "Naafiri", 335: "Naafiri",
  336: "Kayle", 337: "Kayle", 338: "Kayle", 339: "Kayle", 340: "Kayle",
  341: "Kayle", 342: "Kayle", 343: "Kayle", 344: "Kayle", 345: "Kayle",
  346: "Kayle", 347: "Kayle", 348: "Kayle", 349: "Kayle", 350: "Yuumi",
  351: "Kayle", 352: "Kayle", 353: "Kayle", 354: "Kayle", 355: "Kayle",
  356: "Kayle", 357: "Kayle", 358: "Kayle", 359: "Kayle", 360: "Kayle",
  361: "Kayle", 362: "Kayle", 363: "Kayle", 364: "Kayle", 365: "Kayle",
  366: "Kayle", 367: "Kayle", 368: "Kayle", 369: "Kayle", 370: "Kayle",
  371: "Kayle", 372: "Kayle", 373: "Kayle", 374: "Kayle", 375: "Kayle",
  376: "Kayle", 377: "Kayle", 378: "Kayle", 379: "Kayle", 380: "Kayle",
  381: "Kayle", 382: "Kayle", 383: "Kayle", 384: "Kayle", 385: "Kayle",
  386: "Kayle", 387: "Kayle", 388: "Kayle", 389: "Kayle", 390: "Kayle",
  391: "Kayle", 392: "Kayle", 393: "Kayle", 394: "Kayle", 395: "Kayle",
  396: "Kayle", 397: "Kayle", 398: "Kayle", 399: "Kayle", 400: "Kayle",
  401: "Kayle", 402: "Kayle", 403: "Kayle", 404: "Kayle", 405: "Kayle",
  406: "Kayle", 407: "Kayle", 408: "Kayle", 409: "Kayle", 410: "Kayle",
  411: "Kayle", 412: "Thresh", 413: "Kayle", 414: "Kayle", 415: "Kayle",
  416: "Kayle", 417: "Kayle", 418: "Kayle", 419: "Kayle", 420: "Kayle",
  421: "Kayle", 422: "Kayle", 423: "Kayle", 424: "Kayle", 425: "Kayle",
  426: "Kayle", 427: "Kayle", 428: "Kayle", 429: "Kayle", 430: "Kayle",
  431: "Kayle", 432: "Kayle", 433: "Kayle", 434: "Kayle", 435: "Kayle",
  436: "Kayle", 437: "Kayle", 438: "Kayle", 439: "Kayle", 440: "Kayle",
  441: "Kayle", 442: "Kayle", 443: "Katarina", 444: "Kayle", 445: "Kayle",
  446: "Kayle", 447: "Kayle", 448: "Kayle", 449: "Kayle", 450: "Kayle",
  451: "Kayle", 452: "Kayle", 453: "Kayle", 454: "Kayle", 455: "Kayle",
  456: "Kayle", 457: "Kayle", 458: "Kayle", 459: "Kayle", 460: "Kayle",
  461: "Kayle", 462: "Kayle", 463: "Kayle", 464: "Kayle", 465: "Kayle",
  466: "Leona", 467: "Kayle", 468: "Kayle", 469: "Kayle", 470: "Kayle",
  471: "Kayle", 472: "Kayle", 473: "Kayle", 474: "Kayle", 475: "Kayle",
  476: "Kayle", 477: "Kayle", 478: "Kayle", 479: "Kayle", 480: "Kayle",
  481: "Kayle", 482: "Kayle", 483: "Kayle", 484: "Kayle", 485: "Kayle",
  486: "Kayle", 487: "Kayle", 488: "Kayle", 489: "Kayle", 490: "Kayle",
  491: "Kayle", 492: "Kayle", 493: "Kayle", 494: "Kayle", 495: "Kayle",
  496: "Kayle", 497: "Kayle", 498: "Xayah", 499: "Kayle", 500: "Kayle",
  501: "Kayle", 502: "Kayle", 503: "Kayle", 504: "Kayle", 505: "Kayle",
  506: "Kayle", 507: "Kayle", 508: "Kayle", 509: "Kayle", 510: "Kayle",
  511: "Kayle", 512: "Kayle", 513: "Kayle", 514: "Kayle", 515: "Kayle",
  516: "Kayle", 517: "Sylas", 518: "Kayle", 519: "Kayle", 520: "Kayle",
  521: "Kayle", 522: "Kayle", 523: "Kayle", 524: "Kayle", 525: "Kayle",
  526: "Kayle", 527: "Kayle", 528: "Kayle", 529: "Kayle", 530: "Kayle",
  531: "Kayle", 532: "Kayle", 533: "Kayle", 534: "Kayle", 535: "Kayle",
  536: "Kayle", 537: "Kayle", 538: "Kayle", 539: "Kayle", 540: "Kayle",
  541: "Kayle", 542: "Kayle", 543: "Kayle", 544: "Kayle", 545: "Kayle",
  546: "Kayle", 547: "Kayle", 548: "Kayle", 549: "Kayle", 550: "Kayle",
  551: "Kayle", 552: "Kayle", 553: "Kayle", 554: "Kayle", 555: "Kayle",
  556: "Kayle", 557: "Kayle", 558: "Kayle", 559: "Kayle", 560: "Kayle",
  561: "Kayle", 562: "Kayle", 563: "Kayle", 564: "Kayle", 565: "Kayle",
  566: "Kayle", 567: "Kayle", 568: "Kayle", 569: "Kayle", 570: "Kayle",
  571: "Kayle", 572: "Kayle", 573: "Kayle", 574: "Kayle", 575: "Kayle",
  576: "Kayle", 577: "Kayle", 578: "Kayle", 579: "Kayle", 580: "Kayle",
  581: "Kayle", 582: "Kayle", 583: "Kayle", 584: "Kayle", 585: "Kayle",
  586: "Kayle", 587: "Kayle", 588: "Kayle", 589: "Kayle", 590: "Kayle",
  591: "Kayle", 592: "Kayle", 593: "Kayle", 594: "Kayle", 595: "Kayle",
  596: "Kayle", 597: "Kayle", 598: "Kayle", 599: "Kayle", 600: "Kayle",
  601: "Kayle", 602: "Kayle", 603: "Kayle", 604: "Kayle", 605: "Kayle",
  606: "Kayle", 607: "Kayle", 608: "Kayle", 609: "Skarner", 610: "Kayle",
  611: "Kayle", 612: "Kayle", 613: "Kayle", 614: "Kayle", 615: "Kayle",
  616: "Kayle", 617: "Kayle", 618: "Kayle", 619: "Kayle", 620: "Kayle",
  621: "Kayle", 622: "Kayle", 623: "Kayle", 624: "Kayle", 625: "Kayle",
  626: "Kayle", 627: "Kayle", 628: "Kayle", 629: "Kayle", 630: "Kayle",
  631: "Kayle", 632: "Kayle", 633: "Kayle", 634: "Kayle", 635: "Kayle",
  636: "Kayle", 637: "Kayle", 638: "Kayle", 639: "Kayle", 640: "Kayle",
  641: "Kayle", 642: "Kayle", 643: "Kayle", 644: "Kayle", 645: "Kayle",
  646: "Kayle", 647: "Kayle", 648: "Kayle", 649: "Kayle", 650: "Kayle",
  651: "Katarina", 652: "Kayle", 653: "Kayle", 654: "Kayle", 655: "Kayle",
  656: "Kayle", 657: "Kayle", 658: "Kayle", 659: "Kayle", 660: "Kayle",
  661: "Kayle", 662: "Kayle", 663: "Kayle", 664: "Kayle", 665: "Kayle",
  666: "Kayle", 667: "Kayle", 668: "Kayle", 669: "Kayle", 670: "Kayle",
  671: "Kayle", 672: "Kayle", 673: "Kayle", 674: "Kayle", 675: "Kayle",
  676: "Kayle", 677: "Kayle", 678: "Kayle", 679: "Kayle", 680: "Kayle",
  681: "Kayle", 682: "Kayle", 683: "Kayle", 684: "Kayle", 685: "Kayle",
  686: "Kayle", 687: "Kayle", 688: "Kayle", 689: "Kayle", 690: "Kayle",
  691: "Kayle", 692: "Kayle", 693: "Kayle", 694: "Kayle", 695: "Kayle",
  696: "Kayle", 697: "Kayle", 698: "Kayle", 699: "Kayle", 700: "Kayle",
  701: "Kayle", 702: "Kayle", 703: "Kayle", 704: "Kayle", 705: "Kayle",
  706: "Kayle", 707: "Kayle", 708: "Kayle", 709: "Kayle", 710: "Kayle",
  711: "Vex", 712: "Kayle", 713: "Kayle", 714: "Kayle", 715: "Kayle",
  716: "Kayle", 717: "Kayle", 718: "Kayle", 719: "Kayle", 720: "Kayle",
  721: "Kayle", 722: "Kayle", 723: "Kayle", 724: "Kayle", 725: "Kayle",
  726: "Kayle", 727: "Kayle", 728: "Kayle", 729: "Kayle", 730: "Kayle",
  731: "Kayle", 732: "Kayle", 733: "Kayle", 734: "Kayle", 735: "Kayle",
  736: "Kayle", 737: "Kayle", 738: "Kayle", 739: "Kayle", 740: "Kayle",
  741: "Kayle", 742: "Kayle", 743: "Kayle", 744: "Kayle", 745: "Kayle",
  746: "Kayle", 747: "Kayle", 748: "Kayle", 749: "Kayle", 750: "Kayle",
  751: "Kayle", 752: "Kayle", 753: "Kayle", 754: "Kayle", 755: "Kayle",
  756: "Kayle", 757: "Kayle", 758: "Kayle", 759: "Kayle", 760: "Kayle",
  761: "Kayle", 762: "Kayle", 763: "Kayle", 764: "Kayle", 765: "Kayle",
  766: "Kayle", 767: "Kayle", 768: "Kayle", 769: "Kayle", 770: "Kayle",
  771: "Kayle", 772: "Kayle", 773: "Kayle", 774: "Kayle", 775: "Kayle",
  776: "Kayle", 777: "Yone", 778: "Kayle", 779: "Kayle", 780: "Kayle", 781: "Kayle",
  782: "Kayle", 783: "Kayle", 784: "Kayle", 785: "Kayle", 786: "Kayle",
  787: "Kayle", 788: "Kayle", 789: "Kayle", 790: "Kayle", 791: "Kayle",
  792: "Kayle", 793: "Kayle", 794: "Kayle", 795: "Kayle", 796: "Kayle",
  797: "Kayle", 798: "Kayle", 799: "Kayle", 800: "Kayle",
  801: "Kayle", 802: "Kayle", 803: "Kayle", 804: "Kayle", 805: "Kayle",
  806: "Kayle", 807: "Kayle", 808: "Kayle", 809: "Kayle", 810: "Kayle",
  811: "Kayle", 812: "Kayle", 813: "Kayle", 814: "Kayle", 815: "Kayle",
  816: "Kayle", 817: "Kayle", 818: "Kayle", 819: "Kayle", 820: "Kayle",
  821: "Kayle", 822: "Kayle", 823: "Kayle", 824: "Kayle", 825: "Kayle",
  826: "Kayle", 827: "Kayle", 828: "Kayle", 829: "Kayle", 830: "Kayle",
  831: "Kayle", 832: "Kayle", 833: "Kayle", 834: "Kayle", 835: "Kayle",
  836: "Kayle", 837: "Kayle", 838: "Kayle", 839: "Kayle", 840: "Kayle",
  841: "Kayle", 842: "Kayle", 843: "Kayle", 844: "Kayle", 845: "Kayle",
  846: "Kayle", 847: "Kayle", 848: "Kayle", 849: "Kayle", 850: "Kayle",
  851: "Kayle", 852: "Kayle", 853: "Kayle", 854: "Kayle", 855: "Kayle",
  856: "Kayle", 857: "Kayle", 858: "Kayle", 859: "Kayle", 860: "Kayle",
  861: "Kayle", 862: "Kayle", 863: "Kayle", 864: "Kayle", 865: "Kayle",
  866: "Kayle", 867: "Kayle", 868: "Kayle", 869: "Kayle", 870: "Kayle",
  871: "Kayle", 872: "Kayle", 873: "Kayle", 874: "Kayle", 875: "Sett",
  876: "Kayle", 877: "Kayle", 878: "Kayle", 879: "Kayle", 880: "Kayle",
  881: "Kayle", 882: "Kayle", 883: "Kayle", 884: "Kayle", 885: "Kayle",
  886: "Kayle", 887: "Kayle", 888: "Kaisa", 889: "Kayle", 890: "Kayle",
  891: "Kayle", 892: "Kayle", 893: "Kayle", 894: "Kayle", 895: "Kayle",
  896: "Kayle", 897: "Kayle", 898: "Kayle", 899: "Kayle", 900: "Kayle",
  901: "Smolder", 902: "Kayle", 903: "Kayle", 904: "Kayle", 905: "Kayle",
  906: "Kayle", 907: "Kayle", 908: "Kayle", 909: "Kayle", 910: "Kayle",
  911: "Kayle", 912: "Kayle", 913: "Kayle", 914: "Kayle", 915: "Kayle",
  916: "Kayle", 917: "Kayle", 918: "Kayle", 919: "Kayle", 920: "Kayle",
  921: "Kayle", 922: "Kayle", 923: "Kayle", 924: "Kayle", 925: "Kayle",
  926: "Kayle", 927: "Kayle", 928: "Kayle", 929: "Kayle", 930: "Kayle",
  931: "Kayle", 932: "Kayle", 933: "Kayle", 934: "Kayle", 935: "Kayle",
  936: "Kayle", 937: "Kayle", 938: "Kayle", 939: "Kayle", 940: "Kayle",
  941: "Kayle", 942: "Kayle", 943: "Kayle", 944: "Kayle", 945: "Kayle",
  946: "Kayle", 947: "Kayle", 948: "Kayle", 949: "Kayle", 950: "Kayle",
  951: "Kayle", 952: "Kayle", 953: "Kayle", 954: "Kayle", 955: "Kayle",
  956: "Kayle", 957: "Kayle", 958: "Kayle", 959: "Kayle", 960: "Kayle",
  961: "Kayle", 962: "Kayle", 963: "Kayle", 964: "Kayle", 965: "Kayle",
  966: "Kayle", 967: "Kayle", 968: "Kayle", 969: "Kayle", 970: "Kayle",
  971: "Kayle", 972: "Kayle", 973: "Kayle", 974: "Kayle", 975: "Kayle",
  976: "Kayle", 977: "Kayle", 978: "Kayle", 979: "Kayle", 980: "Kayle",
  981: "Kayle", 982: "Kayle", 983: "Kayle", 984: "Kayle", 985: "Kayle",
  986: "Kayle", 987: "Kayle", 988: "Kayle", 989: "Kayle", 990: "Kayle",
  991: "Kayle", 992: "Kayle", 993: "Kayle", 994: "Kayle", 995: "Kayle",
  996: "Kayle", 997: "Kayle", 998: "Kayle", 999: "Kayle", 1000: "Kayle",
  1001: "Kayle", 1002: "Kayle", 1103: "KSante"
}

const masteryWithNames = mastery.map((m: ChampionMastery) => ({
  ...m,
  championName: championIdToName[m.championId] || `Champion${m.championId}`
}))

// Extract current game
    const currentGame = spectatorResponse.status === 'fulfilled' ? spectatorResponse.value.data : null;

    // Get match IDs
    const matchIds = matchIdsResponse.status === 'fulfilled' ? matchIdsResponse.value.data.slice(0, 20) : [];
    const detailedMatches: DetailedMatch[] = [];

    // Function to fetch and cache summoner name
    const fetchAndCacheSummonerName = async (puuid: string): Promise<{ name: string; icon: number }> => {
      if (!puuid) return { name: '', icon: 1 }
      
      // Check SQLite cache first
      const cached = getSummonerName(puuid)
      if (cached) {
        return { name: cached.gameName, icon: cached.icon }
      }
      
      // Fetch from API if not cached
      try {
        const accountResp = await riotApi.get(
          `${BASE_URL}/riot/account/v1/accounts/by-puuid/${puuid}`
        )
        if (accountResp.data?.gameName) {
          setSummonerName(puuid, accountResp.data.gameName, accountResp.data.tagLine, 1)
          return { name: accountResp.data.gameName, icon: 1 }
        }
      } catch {
        // Fallback to summoner API
        try {
          const summonerResp = await riotApi.get(
            `${REGIONAL_URL}/lol/summoner/v4/summoners/by-puuid/${puuid}`
          )
          const name = summonerResp.data?.name || ''
          const icon = summonerResp.data?.profileIconId || 1
          if (name) setSummonerName(puuid, name, '', icon)
          return { name, icon }
        } catch {
          return { name: '', icon: 1 }
        }
      }
      return { name: '', icon: 1 }
    }

    // Get unique puuids from all matches and check which ones we need to fetch
    const allPuuids = new Set<string>()
    for (const matchId of matchIds) {
      const cachedMatch = getMatchParticipants(matchId) as any
      if (cachedMatch) {
        detailedMatches.push({
          gameId: matchId,
          gameCreation: cachedMatch.gameCreation,
          gameDuration: cachedMatch.gameDuration,
          gameMode: cachedMatch.gameMode,
          gameType: cachedMatch.gameType,
          gameVersion: '14.1.1',
          mapId: 11,
          queueId: cachedMatch.queueId,
          participants: cachedMatch.participants
        })
        continue
      }
      
      // Not cached, need to fetch from API
      try {
        const matchResponse = await riotApi.get<any>(`${BASE_URL}/lol/match/v5/matches/${matchId}`)
        const matchData = matchResponse.data
        const participantPuuids = matchData.metadata.participants || []
        participantPuuids.forEach((p: string) => { if (p) allPuuids.add(p) })
      } catch {
        // Skip matches that fail
      }
    }

    // Batch fetch missing summoner names with sequential delays to avoid rate limits
    const puuidsToFetch = Array.from(allPuuids).slice(0, 150)
    console.log(`[COMPREHENSIVE] Fetching names for ${puuidsToFetch.length} unique players...`)
    
    let fetched = 0
    for (const puuid of puuidsToFetch) {
      await fetchAndCacheSummonerName(puuid)
      fetched++
      if (fetched % 20 === 0) {
        console.log(`[COMPREHENSIVE] Fetched ${fetched}/${puuidsToFetch.length} names...`)
        await new Promise(r => setTimeout(r, 100)) // Small delay every 20 fetches
      }
    }
    console.log(`[COMPREHENSIVE] Done fetching ${fetched} names`)

    // Now process remaining matches (that weren't cached)
    for (const matchId of matchIds) {
      // Skip if already cached
      if (detailedMatches.find(m => m.gameId === matchId)) continue
      
      try {
        const matchResponse = await riotApi.get<any>(`${BASE_URL}/lol/match/v5/matches/${matchId}`);
        const matchData = matchResponse.data;

        const participantPuuids = matchData.metadata.participants || []
        
        const participants: Participant[] = []
        for (let i = 0; i < matchData.info.participants.length; i++) {
          const p = matchData.info.participants[i]
          const puuid = participantPuuids[i] || ''
          
          let summonerName = ''
          let profileIconId = 1
          
          // Use cached names from SQLite
          const cached = getSummonerName(puuid)
          if (cached) {
            summonerName = cached.gameName
            profileIconId = cached.icon
          }
          
          participants.push({
            participantId: p.participantId,
            teamId: p.teamId,
            win: p.win,
            championId: p.championId,
            championName: p.championName,
            summonerName: summonerName,
            profileIconId: profileIconId,
            puuid: puuid,
            kills: p.kills,
            deaths: p.deaths,
            assists: p.assists,
            goldEarned: p.goldEarned,
            totalMinionsKilled: p.totalMinionsKilled,
            visionWardsBoughtInGame: p.visionWardsBoughtInGame,
            visionScore: p.visionScore || 0,
            wardsPlaced: p.wardsPlaced || 0,
            wardsKilled: p.wardsKilled || 0,
            damageDealtToChampions: p.totalDamageDealtToChampions,
            damageTaken: p.totalDamageTaken,
            totalHeal: p.totalHeal,
            timePlayed: p.timePlayed,
            item0: p.item0,
            item1: p.item1,
            item2: p.item2,
            item3: p.item3,
            item4: p.item4,
            item5: p.item5,
            item6: p.item6,
            championLevel: p.champLevel,
            summoner1Id: p.summoner1Id,
            summoner2Id: p.summoner2Id,
            perk0: p.perks?.styles?.[0]?.selections?.[0]?.perk || 0,
            perk1: p.perks?.styles?.[0]?.selections?.[1]?.perk || 0,
            perk2: p.perks?.styles?.[0]?.selections?.[2]?.perk || 0,
            perk3: p.perks?.styles?.[1]?.selections?.[0]?.perk || 0,
            perk4: p.perks?.styles?.[1]?.selections?.[1]?.perk || 0,
            perk5: p.perks?.styles?.[1]?.selections?.[2]?.perk || 0,
            perkPrimaryStyle: p.perks?.styles?.[0]?.style || 0,
            perkSubStyle: p.perks?.styles?.[1]?.style || 0
          })
        }

        const matchSummary = {
          gameId: matchId,
          gameCreation: matchData.info.gameCreation,
          gameDuration: matchData.info.gameDuration,
          gameMode: matchData.info.gameMode,
          gameType: matchData.info.gameType,
          gameVersion: matchData.info.gameVersion,
          mapId: matchData.info.mapId,
          queueId: matchData.info.queueId,
          participants
        }
        
        detailedMatches.push(matchSummary)
        
        // Cache match participants in SQLite
        // Caching disabled temporarily due to mismatch - skipping
        // try {
        //   setMatchParticipants(matchId, matchData.info, participants)
        // } catch (cacheErr) {
        //   console.log(`[CACHE] Skipped caching match`)
        // }
      } catch (err) {
        console.warn(`Failed to fetch match ${matchId}`);
      }
    }

    // Build comprehensive response
    const comprehensiveData: PlayerComprehensiveData = {
      puuid: accountData.puuid,
      summonerId: summonerData.id,
      gameName: accountData.gameName,
      tagLine: accountData.tagLine,
      summonerLevel: summonerData.summonerLevel,
      profileIconId: summonerData.profileIconId,
      region: 'EUW',
      totalMatches: matchIdsResponse.status === 'fulfilled' ? matchIdsResponse.value.data.length : detailedMatches.length,
      matches: detailedMatches.sort((a, b) => b.gameCreation - a.gameCreation),
      rankedStats,
      masteryWithNames,
      currentGame
    };

    res.json(comprehensiveData);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch comprehensive player data');
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const staticPath = process.env.STATIC_PATH || path.join(__dirname, '..', '..', 'dist');
  app.use(express.static(staticPath));

  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`LoL Professor server running on port ${PORT}`);
  console.log(`API Key configured: ${RIOT_API_KEY !== 'RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' ? 'Yes' : 'No - Set RIOT_API_KEY in .env file'}`);
});
