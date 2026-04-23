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

## Data Sent to AI

### Match Metadata
- Match ID, queue type (ranked solo/flex), duration, timestamp
- Player's champion, role, team (blue/red)
- **Role Detection**: Automatically detected from lane position or champion name

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
- **Per-player percentages**: Gold, damage, CS breakdown by team member

### Timeline (enhanced)
- Player's kills and deaths with timestamp and location
- Objectives taken (dragons, barons, towers)
- Large gold leads/disadvantages
- **Pattern detection**: 
  - Early deaths (before 4 minutes)
  - Deaths in base (suspicious positioning)
  - Solo kills
  - Multi-kills
  - First blood

## Prompt for Groq

### Role-Specific Benchmarks

The AI uses different benchmarks based on detected role:

| Role    | CS/min (optimal) | Damage (optimal) | Vision (optimal) | Gold (optimal) |
|--------|-----------------|-----------------|------------------|---------------|
| TOP    | 7-8             | 12k-18k         | 20-30           | 14k-18k       |
| JUNGLE | 6-7             | 10k-15k         | 25-35           | 12k-16k       |
| MID    | 8-9             | 15k-22k         | 20-28           | 15k-20k       |
| ADC    | 8-10            | 20k-30k         | 15-22           | 18k-24k       |
| SUPPORT| 4-6             | 5k-10k          | 35-50           | 11k-15k       |

### LoL Terms Dictionary (NEVER translate)

The following terms must remain in English in AI responses:
- farming / farmear / farmear minions
- minions / súbditos
- creeps
- wards / vision wards / control wards
- pinks / pink wards / wards permanentes / control wards
- deep warding
- roam / rotar / rotation
- gank
- dive / divear / diving
- freeze / freezeear
- slow push / fast push
- proxy / proxear
- backdoor
- wave management
- CS, cs, creep score
- KDA
- DPS
- burst
- poke
- all-in / allin
- sustain
- engage / disengage
- peel
- zone / zoning
- waveclear
- splitpush
- flank
- reset
- recall
- base
- nexus
- inhibitor
- turret / tower
- dragon / drake
- baron / baron nashor
- elder
- rift herald
- soul
- buff / debuff
- CC (crowd control)
- execute
- snowball
- powerspike
- meta
- counterpick
- counterplay
- outplay
- inting
- feeding
- tilted
- ff / surrender
- dodge
- lp / league points
- rank / ranking
- challenger / grandmaster / master
- OTP (one trick pony)
- main / secondary
- counter jungle
- smite
- ignite / exhaust / heal / flash / teleport
- ghost / cleanse / barrier
- crit / critical
- crit chance
- as / attack speed
- ap / ability power
- ad / attack damage
- armor / magic resist
- hp / health
- mana / energy
- cd / cooldown
- range / melee
- hypercarry
- assassin
- bruiser / fighter
- tank / support mage
- enchanter
- mage / apc
- hybrid
- duo / duoq
- premade
- team comp / teamcomp
- pick / ban phase
- lock in
- meta pick
- off-meta / freestyle
- pocket pick
- comfort pick
- blind pick
- counter pick
- first pick

### Example Prompt Structure

```
You are an expert League of Legends analyst. Analyze this match data and provide personalized insights based on the player's ROLE.

IMPORTANT: NEVER translate these LoL terms - always use them in English in your response:
[Terms dictionary...]

ROLE-SPECIFIC BENCHMARKS (TOP):
- CS/min: 6+ es bajo, 7-8 es óptimo
- Damage: 8000+ es bajo, 12k-18k es óptimo
- Vision Score: 15+ es bajo, 20-30 es óptimo
- Gold: 10000+ es bajo, 14k-18k es óptimo

MATCH DATA:
- Queue: Ranked Solo/Duo
- Duration: 25:30
- Player Champion: Darius | Team: Blue | ROLE: TOP
- Result: VICTORY

PLAYER STATS (your role: top):
- KDA: 8/3/5
- Damage: 15000 (32% del daño equipo; promedio equipo: 12000)
- Gold: 14500 (28% del oro equipo)
- CS: 185 (7.4 cs/min, 24% del CS equipo)
- Vision Score: 28
- Wards Placed: 12
- Kill Participation: 52%
- DPM: 600

GOLD BREAKDOWN - TEAM PERCENTAGE:
  - Darius: 14500 oro (28% del equipo)
  - Lee Sin: 12000 oro (23% del equipo)
  - Ahri: 11000 oro (21% del equipo)
  - Jinx: 8500 oro (16% del equipo)
  - Lulu: 5500 oro (11% del equipo)

TIMELINE ANALYSIS:
[4:30] Muerte temprana en lane contra Garen
[8:15] SOLO KILL contra Garen

IMPORTANT: 
1. Respond in SPANISH
2. Use role-specific benchmarks
3. Reference team member percentages
4. Consider timeline events

Respond with JSON:
{
  "insights": [...],
  "summary": "...",
  "playerStats": {...}
}
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
- Role detection improves accuracy of insights
