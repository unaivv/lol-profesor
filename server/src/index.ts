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
            summoner2Id: p.summoner2Id
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
      riotApi.get<RiotRankedEntry[]>(`${REGIONAL_URL}/lol/league/v4/entries/by-summoner/${summonerData.id}`),
      riotApi.get<ChampionMastery[]>(`${REGIONAL_URL}/lol/champion-mastery/v4/champion-masteries/by-puuid/${accountData.puuid}`),
      riotApi.get<string[]>(`${BASE_URL}/lol/match/v5/matches/by-puuid/${accountData.puuid}/ids`, { params: { count: 20 } }),
      riotApi.get<SpectatorGameData>(`${REGIONAL_URL}/lol/spectator/v5/active-games/by-summoner/${accountData.puuid}`)
    ]);

    // Extract ranked data
    const rankedData = rankedResponse.status === 'fulfilled' ? rankedResponse.value.data : [];
    
    // Filter for different queue types - Riot changed queue type names
    const soloQueue = rankedData.find((entry: any) => 
      entry.queueType === 'RANKED_SOLO_5x5' || entry.queueType === 'RANKED' || entry.queueType?.includes('SOLO')
    );
    const flexQueue = rankedData.find((entry: any) => 
      entry.queueType === 'RANKED_FLEX_SR' || entry.queueType === 'FLEX' || entry.queueType?.includes('FLEX')
    );

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

    // Extract mastery
    const mastery = masteryResponse.status === 'fulfilled' ? masteryResponse.value.data : [];

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
            summoner2Id: p.summoner2Id
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
      matches: detailedMatches.sort((a, b) => b.gameCreation - a.gameCreation),
      rankedStats,
      mastery,
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
