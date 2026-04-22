import { RiotApiClient } from './riot-api.client';
import { Participant, DetailedMatch, Match } from '../types';

export interface SummonerInfo {
  puuid: string;
  gameName: string;
  tagLine: string;
  summonerId: string;
  summonerLevel: number;
  profileIconId: number;
  region: string;
}

/**
 * Account Service - handles Riot ID and account-related API calls
 */
export class AccountService {
  constructor(private riotApi: RiotApiClient) {}

  /**
   * Get player by Riot ID (gameName + tagLine)
   */
  async getByRiotId(gameName: string, tagLine: string): Promise<SummonerInfo> {
    const account = await this.riotApi.get<any>(
      `${this.riotApi.getBaseUrl()}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    );

    const summoner = await this.riotApi.get<any>(
      `${this.riotApi.getRegionalUrl()}/lol/summoner/v4/summoners/by-puuid/${account.puuid}`
    );

    return {
      puuid: account.puuid,
      gameName: account.gameName,
      tagLine: account.tagLine,
      summonerId: summoner.id,
      summonerLevel: summoner.summonerLevel,
      profileIconId: summoner.profileIconId,
      region: 'EUW',
    };
  }

  /**
   * Get account by PUUID
   */
  async getByPuuid(puuid: string): Promise<any> {
    return this.riotApi.get(
      `${this.riotApi.getBaseUrl()}/riot/account/v1/accounts/by-puuid/${puuid}`
    );
  }
}

/**
 * Summoner Service - handles summoner data
 */
export class SummonerService {
  constructor(private riotApi: RiotApiClient) {}

  /**
   * Get summoner by PUUID
   */
  async getByPuuid(puuid: string): Promise<any> {
    return this.riotApi.get(
      `${this.riotApi.getRegionalUrl()}/lol/summoner/v4/summoners/by-puuid/${puuid}`
    );
  }

  /**
   * Get summoner by ID
   */
  async getById(summonerId: string): Promise<any> {
    return this.riotApi.get(
      `${this.riotApi.getRegionalUrl()}/lol/summoner/v4/summoners/${summonerId}`
    );
  }
}