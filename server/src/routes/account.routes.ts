import { Router, Request, Response } from 'express';
import { RiotApiClient } from '../services/riot-api.client';
import { AccountService } from '../services/account.service';
import { asyncHandler, handleApiError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

/**
 * Create account routes
 */
export const createAccountRoutes = (riotApi: RiotApiClient): Router => {
  const router = Router();
  const accountService = new AccountService(riotApi);

  /**
   * GET /api/player/:gameName/:tagLine
   * Get player by Riot ID
   */
  router.get(
    '/player/:gameName/:tagLine',
    asyncHandler(async (req: Request, res: Response) => {
      const { gameName, tagLine } = req.params;
      const player = await accountService.getByRiotId(gameName, tagLine);
      sendSuccess(res, player);
    })
  );

  return router;
};