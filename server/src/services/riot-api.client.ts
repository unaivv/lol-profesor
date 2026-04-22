import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * Configuration for Riot API
 */
export interface RiotApiConfig {
  apiKey: string;
  baseUrl: string;      // Regional API (e.g., europe.api.riotgames.com)
  regionalUrl: string; // Platform API (e.g., euw1.api.riotgames.com)
}

/**
 * Riot API Client - handles all communication with Riot's APIs
 */
export class RiotApiClient {
  private client: AxiosInstance;
  private config: RiotApiConfig;

  constructor(config: RiotApiConfig) {
    this.config = config;
    this.client = axios.create({
      headers: {
        'X-Riot-Token': config.apiKey,
      },
      timeout: 10000,
    });
  }

  /**
   * Get base URL for regional endpoints
   */
  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * Get regional URL for platform endpoints
   */
  getRegionalUrl(): string {
    return this.config.regionalUrl;
  }

  /**
   * Make GET request with automatic error handling
   */
  async get<T = any>(url: string, params?: Record<string, any>): Promise<T> {
    try {
      const response = await this.client.get<T>(url, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Make GET request with custom timeout
   */
  async getWithTimeout<T = any>(
    url: string,
    params: Record<string, any>,
    timeout: number = 10000
  ): Promise<T> {
    try {
      const response = await this.client.get<T>(url, { params, timeout });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle errors from Riot API
   */
  private handleError(error: unknown): AxiosError {
    const axiosError = error as AxiosError;
    console.error('[RiotApiClient] Request failed:', axiosError.message);
    return axiosError;
  }
}

/**
 * Create configured Riot API client
 */
export const createRiotApiClient = (apiKey: string): RiotApiClient => {
  return new RiotApiClient({
    apiKey,
    baseUrl: process.env.RIOT_BASE_URL || 'https://europe.api.riotgames.com',
    regionalUrl: process.env.RIOT_REGIONAL_URL || 'https://euw1.api.riotgames.com',
  });
};