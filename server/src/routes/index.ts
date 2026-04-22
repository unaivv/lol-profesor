import { Router, Request, Response } from 'express';
import { RiotApiClient } from '../services/riot-api.client';
import { asyncHandler, handleApiError } from '../utils/errors';
import { sendSuccess, sendError } from '../utils/response';
import { getChampionName } from '../utils/champions';

/**
 * Mount all routes on the router
 */
export const createRoutes = (riotApi: RiotApiClient): Router => {
  const router = Router();
  const baseUrl = riotApi.getBaseUrl();
  const regionalUrl = riotApi.getRegionalUrl();

  // Health check
  router.get('/api/health', (req: Request, res: Response) => {
    sendSuccess(res, { status: 'healthy', version: '1.0.0' });
  });

  // Get player by Riot ID
  router.get(
    '/api/player/:gameName/:tagLine',
    asyncHandler(async (req: Request, res: Response) => {
      const { gameName, tagLine } = req.params;
      
      const account = await riotApi.get<any>(
        `${baseUrl}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
      );
      const summoner = await riotApi.get<any>(
        `${regionalUrl}/lol/summoner/v4/summoners/by-puuid/${account.puuid}`
      );
      
      sendSuccess(res, {
        puuid: account.puuid,
        summonerId: summoner.id,
        gameName: account.gameName,
        tagLine: account.tagLine,
        summonerLevel: summoner.summonerLevel,
        profileIconId: summoner.profileIconId,
        region: 'EUW',
      });
    })
  );

  // Get match history
  router.get(
    '/api/matches/:puuid',
    asyncHandler(async (req: Request, res: Response) => {
      const { puuid } = req.params;
      const count = Math.min(parseInt(req.query.count as string) || 20, 20);
      const start = parseInt(req.query.start as string) || 0;

      const matchIds = await riotApi.get<string[]>(
        `${baseUrl}/lol/match/v5/matches/by-puuid/${puuid}/ids`,
        { count, start }
      );

      const matches: any[] = [];
      for (const matchId of matchIds.slice(0, 10)) {
        try {
          const matchData = await riotApi.get<any>(`${baseUrl}/lol/match/v5/matches/${matchId}`);
          const participant = matchData.info.participants.find((p: any) => p.puuid === puuid);
          if (participant) {
            matches.push({
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
              perkSubStyle: participant.perks?.styles?.[1]?.style || 0,
            });
          }
        } catch (err) {
          console.warn(`Failed to fetch match ${matchId}`);
        }
      }

      sendSuccess(res, matches);
    })
  );

  // Get detailed match history
  router.get(
    '/api/matches/:puuid/details',
    asyncHandler(async (req: Request, res: Response) => {
      const { puuid } = req.params;
      const count = Math.min(parseInt(req.query.count as string) || 10, 20);
      const start = parseInt(req.query.start as string) || 0;

      const matchIds = await riotApi.get<string[]>(
        `${baseUrl}/lol/match/v5/matches/by-puuid/${puuid}/ids`,
        { count, start }
      );

      const detailedMatches: any[] = [];
      for (const matchId of matchIds.slice(0, count)) {
        try {
          const matchData = await riotApi.get<any>(`${baseUrl}/lol/match/v5/matches/${matchId}`);
          const participantPuuids = matchData.metadata.participants || [];

          // Fetch names
          const namePromises = participantPuuids.map(async (p: string) => {
            if (!p) return { name: '', icon: 1 };
            try {
              const acc = await riotApi.get<any>(`${baseUrl}/riot/account/v1/accounts/by-puuid/${p}`);
              return { name: acc.gameName || '', icon: 1 };
            } catch {
              try {
                const sum = await riotApi.get<any>(`${regionalUrl}/lol/summoner/v4/summoners/by-puuid/${p}`);
                return { name: sum.name || '', icon: sum.profileIconId || 1 };
              } catch { return { name: '', icon: 1 }; }
            }
          });

          const names = await Promise.all(namePromises);
          const participants = matchData.info.participants.map((p: any, i: number) => ({
            participantId: p.participantId,
            teamId: p.teamId,
            win: p.win,
            championId: p.championId,
            championName: p.championName,
            summonerName: names[i]?.name || '',
            profileIconId: names[i]?.icon || 1,
            puuid: participantPuuids[i] || '',
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
            item0: p.item0, item1: p.item1, item2: p.item2,
            item3: p.item3, item4: p.item4, item5: p.item5, item6: p.item6,
            championLevel: p.champLevel,
            summoner1Id: p.summoner1Id, summoner2Id: p.summoner2Id,
            perk0: p.perks?.styles?.[0]?.selections?.[0]?.perk || 0,
            perk1: p.perks?.styles?.[0]?.selections?.[1]?.perk || 0,
            perk2: p.perks?.styles?.[0]?.selections?.[2]?.perk || 0,
            perk3: p.perks?.styles?.[1]?.selections?.[0]?.perk || 0,
            perk4: p.perks?.styles?.[1]?.selections?.[1]?.perk || 0,
            perk5: p.perks?.styles?.[1]?.selections?.[2]?.perk || 0,
            perkPrimaryStyle: p.perks?.styles?.[0]?.style || 0,
            perkSubStyle: p.perks?.styles?.[1]?.style || 0,
          }));

          detailedMatches.push({
            gameId: matchId,
            gameCreation: matchData.info.gameCreation,
            gameDuration: matchData.info.gameDuration,
            gameMode: matchData.info.gameMode,
            gameType: matchData.info.gameType,
            gameVersion: matchData.info.gameVersion,
            mapId: matchData.info.mapId,
            queueId: matchData.info.queueId,
            participants,
          });
        } catch (err) {
          console.warn(`Failed to fetch ${matchId}`);
        }
      }

      sendSuccess(res, detailedMatches);
    })
  );

  // Get match timeline
  router.get(
    '/api/match/:matchId/timeline',
    asyncHandler(async (req: Request, res: Response) => {
      const { matchId } = req.params;
      const timeline = await riotApi.get<any>(`${baseUrl}/lol/match/v5/matches/${matchId}/timeline`);
      sendSuccess(res, {
        gameId: matchId,
        frames: timeline.info.frames?.slice(0, 60) || [],
        participants: timeline.info.participants?.map((p: any) => ({
          participantId: p.participantId,
          puuid: p.puuid,
          championId: p.championId,
          championName: p.championName,
        })) || [],
      });
    })
  );

  // Get ranked stats
  router.get(
    '/api/ranked/:summonerId',
    asyncHandler(async (req: Request, res: Response) => {
      const { summonerId } = req.params;
      const ranked = await riotApi.get<any[]>(`${regionalUrl}/lol/league/v4/entries/by-summoner/${summonerId}`);
      const soloQueue = ranked.find((e: any) => e.queueType === 'RANKED_SOLO_5x5');
      if (soloQueue) {
        sendSuccess(res, {
          tier: soloQueue.tier,
          rank: soloQueue.rank,
          leaguePoints: soloQueue.leaguePoints,
          wins: soloQueue.wins,
          losses: soloQueue.losses,
          veteran: soloQueue.veteran,
          inactive: soloQueue.inactive,
          freshBlood: soloQueue.freshBlood,
          hotStreak: soloQueue.hotStreak,
          queueType: soloQueue.queueType,
        });
      } else {
        sendError(res, 'No ranked data found', 404);
      }
    })
  );

  // Get mastery
  router.get(
    '/api/mastery/:puuid',
    asyncHandler(async (req: Request, res: Response) => {
      const { puuid } = req.params;
      const mastery = await riotApi.get<any[]>(`${regionalUrl}/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`);
      const masteryWithNames = mastery.map((m: any) => ({
        ...m,
        championName: getChampionName(m.championId),
      }));
      sendSuccess(res, masteryWithNames);
    })
  );

  // Get spectator
  router.get(
    '/api/spectator/:puuid',
    asyncHandler(async (req: Request, res: Response) => {
      const { puuid } = req.params;
      try {
        const game = await riotApi.get<any>(`${regionalUrl}/lol/spectator/v5/active-games/by-summoner/${puuid}`);
        sendSuccess(res, game);
      } catch (err: any) {
        if (err.response?.status === 404) {
          sendError(res, 'Player not in active game', 404);
        } else {
          throw err;
        }
      }
    })
  );

  return router;
};