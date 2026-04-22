/**
 * LoL Professor Server
 * 
 * Express server for League of Legends stats application
 * Connects to Riot API to provide player data, match history, and ranked stats
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import https from 'https';

import { createRiotApiClient } from './services/riot-api.client';
import { createRoutes } from './routes';
import { errorMiddleware } from './utils/errors';
import { initCache } from './cache';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Initialize SQLite cache
initCache();

// Middleware
app.use(cors());
app.use(express.json());

// Create Riot API client
const riotApiKey = process.env.RIOT_API_KEY || 'RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
const riotApi = createRiotApiClient(riotApiKey);

// Mount routes
app.use(createRoutes(riotApi));

// Error handling
app.use(errorMiddleware);

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
  console.log(`
╔═══════════════════════════════════════════╗
║         LoL Professor Server             ║
║         ────────────────────             ║
║  Port: ${PORT}                              ║
║  API Key: ${riotApiKey !== 'RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' ? '✓ Configured' : '✗ Not set'}                    ║
╚═══════════════════════════════════════════╝
  `);
});

export default app;