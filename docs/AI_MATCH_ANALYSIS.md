# AI Match Analysis System

## Overview
Analyze League of Legends matches using Groq's free LLM API to provide actionable insights for the active player.

## Architecture

### Flow
1. User searches for a player on StatsPage
2. Backend fetches match data from Riot API
3. For each match, check if analysis exists in DB
4. If not cached, call Groq API with match data
5. Save analysis to DB (matchId + puuid as key)
6. Return insights to frontend

### Database Schema (SQLite)

```sql
CREATE TABLE IF NOT EXISTS match_analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT NOT NULL,
  player_puuid TEXT NOT NULL,
  analysis TEXT NOT NULL, -- JSON string with insights
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(match_id, player_puuid)
);

CREATE INDEX idx_match_player ON match_analyses(match_id, player_puuid);
```

### API Endpoint

**POST** `/api/analyze-match`

Request:
```json
{
  "matchId": "EUW1_123456789",
  "puuid": "player-puuid-here"
}
```

Response:
```json
{
  "matchId": "EUW1_123456789",
  "insights": [
    {
      "type": "positive|negative|improvement",
      "title": "Good Vision Control",
      "description": "You placed 15 control wards and had 80% vision score compared to enemy support.",
      "priority": 1
    },
    {
      "type": "improvement",
      "title": "Positioning in Teamfights",
      "description": "You died 3 times to enemy assassin. Try to stay behind your frontline.",
      "priority": 2
    }
  ],
  "summary": "Overall decent performance. Focus on positioning in late game.",
  "playerStats": {
    "kda": "5/3/8",
    "damage": 25000,
    "visionScore": 45,
    "cs": 180
  }
}
```

## Data to Send to AI

### Match Metadata
- Match ID, queue type (ranked solo/flex), duration, timestamp
- Player's champion, role, team (blue/red)

### Player Stats (active player only)
- KDA, kills, deaths, assists
- Total damage, damage to champions
- Gold earned, CS, CS per minute
- Vision score, wards placed, wards cleared
- Kill participation %
- Crowd control score
- Objective damage (turret, epic monsters)

### Team Stats
- Both teams' total kills, gold, dragons, barons, towers
- Player's team composition (class: assassin, mage, tank, etc.)

### Timeline (simplified)
- Player's kills and deaths with timestamp
- Objectives taken (dragons, barons, towers)
- Large gold leads/disadvances

## Prompt for Groq

```
You are a League of Legends analyst. Analyze this match data and provide actionable insights for the player.

MATCH DATA:
- Queue: {queue_type}
- Duration: {duration}
- Player Champion: {champion} | Role: {role} | Team: {team}
- Result: {win/loss}

PLAYER STATS:
- KDA: {kills}/{deaths}/{assists}
- Damage: {damage} | Gold: {gold} | CS: {cs} ({cs_per_min} cs/min)
- Vision: {vision_score} (wards: {wards_placed}, cleared: {wards_cleared})
- Kill Participation: {kill_participation}%
- CC Score: {cc_score}

TEAM STATS:
- Blue Team: {blue_kills} kills, {blue_gold} gold, {blue_towers} towers, {blue_dragons} dragons
- Red Team: {red_kills} kills, {red_gold} gold, {red_towers} towers, {red_dragons} dragons

TIMELINE HIGHLIGHTS:
{list of key events with timestamps}

Respond with a JSON object:
{
  "insights": [
    {
      "type": "positive" | "negative" | "improvement",
      "title": "Short descriptive title (max 50 chars)",
      "description": "Detailed explanation with specific numbers and advice (max 200 chars)",
      "priority": 1-3 (1 = most important)
    }
  ],
  "summary": "2-3 sentence overall performance summary (max 150 chars)",
  "playerStats": {
    "kda": "string",
    "damage": number,
    "visionScore": number,
    "cs": number
  }
}

Provide 3-6 insights. Focus on actionable advice the player can use.
```

## Implementation Plan

### Phase 1: Backend
1. Add Groq dependency: `npm install groq`
2. Add new table to SQLite schema
3. Create `/api/analyze-match` endpoint
4. Implement cache check before API call
5. Implement Groq API call with prompt

### Phase 2: Frontend Integration
1. Create `useMatchAnalysis` hook
2. Add analysis tab or section in MatchDetail
3. Display insights with icons and priority sorting

### Phase 3: Optimization
1. Add rate limiting for Groq calls
2. Batch analysis for multiple matches
3. Background job option for bulk analysis

## Environment Variables
```
GROQ_API_KEY=your_groq_api_key_here
```

## Notes
- Groq has rate limits (free tier: ~50 requests/min)
- Cache all analyses to avoid redundant API calls
- Keep prompts consistent for comparable results
- Consider async processing for multiple matches
