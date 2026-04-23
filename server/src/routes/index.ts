import { Router, Request, Response } from 'express';
import { RiotApiClient } from '../services/riot-api.client';
import { asyncHandler, handleApiError } from '../utils/errors';
import { sendSuccess, sendError } from '../utils/response';
import { getChampionName } from '../utils/champions';
import { getMatchAnalysis, setMatchAnalysis, setMatchParticipants, getMultipleSummonerNames, setSummonerName } from '../cache';

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

  // Get comprehensive player data (player + matches + mastery + ranked + current game)
  router.get(
    '/api/player/:gameName/:tagLine/comprehensive',
    asyncHandler(async (req: Request, res: Response) => {
      const { gameName, tagLine } = req.params;

      // Get player account
      const account = await riotApi.get<any>(
        `${baseUrl}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
      );
      const summoner = await riotApi.get<any>(
        `${regionalUrl}/lol/summoner/v4/summoners/by-puuid/${account.puuid}`
      );

      const playerData: any = {
        puuid: account.puuid,
        summonerId: summoner.id,
        gameName: account.gameName,
        tagLine: account.tagLine,
        summonerLevel: summoner.summonerLevel,
        profileIconId: summoner.profileIconId,
        region: 'EUW',
      };

      // Get ranked stats
      try {
        const ranked = await riotApi.get<any[]>(
          `${regionalUrl}/lol/league/v4/entries/by-puuid/${account.puuid}`
        );
        if (ranked && ranked.length > 0) {
          const soloQueue = ranked.find((q: any) => q.queueType === 'RANKED_SOLO_5x5');
          const flexQueue = ranked.find((q: any) => q.queueType === 'RANKED_FLEX_SR');

          if (soloQueue || flexQueue) {
            playerData.rankedStats = {};
            if (soloQueue) {
              playerData.rankedStats.solo = {
                leagueId: soloQueue.leagueId,
                queueType: soloQueue.queueType,
                tier: soloQueue.tier,
                rank: soloQueue.rank,
                leaguePoints: soloQueue.leaguePoints,
                wins: soloQueue.wins,
                losses: soloQueue.losses,
                hotStreak: soloQueue.hotStreak,
              };
            }
            if (flexQueue) {
              playerData.rankedStats.flex = {
                leagueId: flexQueue.leagueId,
                queueType: flexQueue.queueType,
                tier: flexQueue.tier,
                rank: flexQueue.rank,
                leaguePoints: flexQueue.leaguePoints,
                wins: flexQueue.wins,
                losses: flexQueue.losses,
                hotStreak: flexQueue.hotStreak,
              };
            }
          }
        }
      } catch (e) {
        console.warn('Failed to fetch ranked stats');
      }

      // Get champion mastery
      try {
        const mastery = await riotApi.get<any[]>(
          `${regionalUrl}/lol/champion-mastery/v4/champion-masteries/by-puuid/${account.puuid}`
        );
        playerData.mastery = mastery.map((m: any) => ({
          ...m,
          championName: getChampionName(m.championId),
        }));
      } catch (e) {
        console.warn('Failed to fetch mastery');
        playerData.mastery = [];
      }

      // Get match history with full participant data
      try {
        const matchIds = await riotApi.get<string[]>(
          `${baseUrl}/lol/match/v5/matches/by-puuid/${account.puuid}/ids`,
          { count: 20 }
        );

        const matches: any[] = [];
        for (const matchId of matchIds) {
          try {
            const matchData = await riotApi.get<any>(`${baseUrl}/lol/match/v5/matches/${matchId}`);

            // Save match data to cache for AI analysis
            setMatchParticipants(matchId, matchData.info, matchData.info.participants);

            const participant = matchData.info.participants.find((p: any) => p.puuid === account.puuid);
            if (participant) {
              matches.push({
                gameId: matchId,
                gameCreation: matchData.info.gameCreation,
                gameDuration: matchData.info.gameDuration,
                gameMode: matchData.info.gameMode,
                gameType: matchData.info.gameType,
                gameVersion: matchData.info.gameVersion,
                mapId: matchData.info.mapId,
                queueId: matchData.info.queueId,
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
                neutralMinionsKilled: participant.neutralMinionsKilled,
                visionWardsBoughtInGame: participant.visionWardsBoughtInGame || 0,
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
                participants: matchData.info.participants.map((p: any) => ({
                  participantId: p.participantId,
                  puuid: p.puuid,
                  summonerName: p.summonerName || '',
                  championName: p.championName,
                  championId: p.championId,
                  teamId: p.teamId,
                  win: p.win,
                  kills: p.kills,
                  deaths: p.deaths,
                  assists: p.assists,
                  goldEarned: p.goldEarned,
                  totalMinionsKilled: p.totalMinionsKilled,
                  neutralMinionsKilled: p.neutralMinionsKilled,
                  visionScore: p.visionScore || 0,
                  visionWardsBoughtInGame: p.visionWardsBoughtInGame || 0,
                  wardsPlaced: p.wardsPlaced || 0,
                  wardsKilled: p.wardsKilled || 0,
                  champLevel: p.champLevel,
                  timePlayed: p.timePlayed,
                  damageDealtToChampions: p.totalDamageDealtToChampions,
                  damageTaken: p.totalDamageTaken,
                  item0: p.item0,
                  item1: p.item1,
                  item2: p.item2,
                  item3: p.item3,
                  item4: p.item4,
                  item5: p.item5,
                  item6: p.item6,
                })),
              });
            }
          } catch (e) {
            console.warn(`Failed to fetch match ${matchId}`);
          }
        }
        playerData.matches = matches;

        // Fetch summoner names from cache first, then API for missing ones
        const allPuuids = new Set<string>()
        for (const m of matches) {
          for (const p of m.participants || []) {
            if (p.puuid) allPuuids.add(p.puuid)
          }
        }
        if (allPuuids.size > 0) {
          try {
            const puuidArray = Array.from(allPuuids)
            const cached = getMultipleSummonerNames(puuidArray)
            const missingPuuids = puuidArray.filter(p => !cached.has(p))

            // Fetch missing from API
            if (missingPuuids.length > 0) {
              const accountPromises = missingPuuids.slice(0, 10).map(async (puuid) => {
                try {
                  const account = await riotApi.get<any>(`${baseUrl}/riot/account/v1/accounts/by-puuid/${puuid}`)
                  setSummonerName(puuid, account.gameName, account.tagLine, account.profileIconId || 1)
                  return { puuid, gameName: account.gameName, tagLine: account.tagLine }
                } catch {
                  return { puuid, gameName: '', tagLine: '' }
                }
              })
              const accounts = await Promise.all(accountPromises)
              for (const a of accounts) {
                if (a.gameName) cached.set(a.puuid, { gameName: a.gameName, tagLine: a.tagLine, icon: 1 })
              }
            }

            // Apply names to participants
            for (const m of playerData.matches) {
              for (const p of m.participants || []) {
                if (!p.summonerName && cached.has(p.puuid)) {
                  const acc = cached.get(p.puuid)!
                  p.summonerName = `${acc.gameName}#${acc.tagLine}`
                }
              }
            }
          } catch (e) {
            console.warn('Failed to fetch summoner names')
          }
        }
      } catch (e) {
        console.warn('Failed to fetch matches');
        playerData.matches = [];
      }

      // Get current game (spectator)
      try {
        const spectator = await riotApi.get<any>(
          `${regionalUrl}/lol/spectator/v5/active-games/by-summoner/${summoner.id}`
        );
        playerData.currentGame = spectator;
      } catch (e) {
        // Player not in game - that's fine
        playerData.currentGame = null;
      }

      sendSuccess(res, playerData);
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

          // Save match data to cache for AI analysis
          setMatchParticipants(matchId, matchData.info, matchData.info.participants);

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
        } catch (err: any) {
          console.warn(`Failed to fetch match ${matchId}:`, err.message || err);
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

  // Analyze match with AI
  router.post(
    '/api/analyze-match',
    asyncHandler(async (req: Request, res: Response) => {
      const { matchId, puuid } = req.body

      if (!matchId || !puuid) {
        sendError(res, 'matchId and puuid are required', 400)
        return
      }

      if (!process.env.GROQ_API_KEY) {
        sendError(res, 'GROQ_API_KEY not configured', 503)
        return
      }

      // Check cache first
      const cached = getMatchAnalysis(matchId, puuid)
      if (cached) {
        sendSuccess(res, JSON.parse(cached.analysis))
        return
      }

      // Call AI service
      const { analyzeMatch } = await import('../services/ai-analysis.service')
      const result = await analyzeMatch(matchId, puuid)

      // Save to cache
      setMatchAnalysis(matchId, puuid, JSON.stringify(result))

      sendSuccess(res, result)
    })
  );

  return router;
};