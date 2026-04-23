import Groq from 'groq-sdk'
import { getMatchParticipants } from '../cache'
import { getChampionName } from '../utils/champions'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })

export interface MatchInsight {
  type: 'positive' | 'negative' | 'improvement'
  title: string
  description: string
  priority: number
}

export interface MatchAnalysisResult {
  matchId: string
  insights: MatchInsight[]
  summary: string
  playerStats: {
    kda: string
    damage: number
    visionScore: number
    cs: number
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getQueueType(queueId: number): string {
  const queues: Record<number, string> = {
    420: 'Ranked Solo/Duo',
    440: 'Ranked Flex',
    450: 'ARAM',
    400: 'Normal Draft',
    430: 'Blind Pick'
  }
  return queues[queueId] || `Queue ${queueId}`
}

function buildPrompt(matchData: any, playerPuuid: string): string {
  const player = matchData.participants.find((p: any) => p.puuid === playerPuuid)
  if (!player) {
    throw new Error('Player not found in match')
  }

  const playerTeam = player.teamId === 100 ? 'Blue' : 'Red'
  const enemyTeam = playerTeam === 'Blue' ? 'Red' : 'Blue'

  const blueTeam = matchData.participants.filter((p: any) => p.teamId === 100)
  const redTeam = matchData.participants.filter((p: any) => p.teamId === 200)

  const blueKills = blueTeam.reduce((sum: number, p: any) => sum + p.kills, 0)
  const redKills = redTeam.reduce((sum: number, p: any) => sum + p.kills, 0)
  const blueGold = blueTeam.reduce((sum: number, p: any) => sum + p.goldEarned, 0)
  const redGold = redTeam.reduce((sum: number, p: any) => sum + p.goldEarned, 0)
  const blueTowers = blueTeam.filter((p: any) => p.teamId === 100).length // Simplified
  const redTowers = redTeam.filter((p: any) => p.teamId === 200).length

  const csPerMin = matchData.gameDuration > 0
    ? ((player.totalMinionsKilled + player.neutralMinionsKilled) / (matchData.gameDuration / 60)).toFixed(1)
    : '0'

  const timelineHighlights: string[] = []

  // Add key events - kills by player (events might not be in cache)
  if ((matchData as any).info?.events) {
    for (const event of (matchData as any).info.events) {
      if (event.type === 'CHAMPION_KILL' && event.killerId === player.participantId) {
        const victim = matchData.participants.find((p: any) => p.participantId === event.victimId)
        const time = formatDuration(event.timestamp / 1000)
        timelineHighlights.push(`[${time}] Killed ${victim?.championName || 'enemy'}`)
      }
      if (event.type === 'CHAMPION_KILL' && event.victimId === player.participantId) {
        const killer = matchData.participants.find((p: any) => p.participantId === event.killerId)
        const time = formatDuration(event.timestamp / 1000)
        timelineHighlights.push(`[${time}] Died to ${killer?.championName || 'enemy'}`)
      }
    }
  }

  // Calculate team averages for comparison
  const avgVisionScore = matchData.participants.reduce((sum: number, p: any) => sum + (p.visionScore || 0), 0) / matchData.participants.length
  const avgDamage = matchData.participants.reduce((sum: number, p: any) => sum + (p.totalDamageDealtToChampions || 0), 0) / matchData.participants.length
  const avgCS = matchData.participants.reduce((sum: number, p: any) => sum + (p.totalMinionsKilled || 0), 0) / matchData.participants.length
  const avgWardsPlaced = matchData.participants.reduce((sum: number, p: any) => sum + (p.wardsPlaced || 0), 0) / matchData.participants.length

  const prompt = `You are a League of Legends analyst. Analyze this match data and provide actionable insights for the player.

IMPORTANT CONTEXT FOR METRICS:
- Vision Score: Range is 0-100+. Average for a 25min game is ~15-25. Score of 15 is BELOW AVERAGE (not good).
- Wards Placed: Average is ~10-15 per game. 8 wards is BELOW AVERAGE.
- Damage: Varies heavily by role. ADC should do 15k+, Supports ~3-5k. Compare to role average.
- CS: Average is ~7-8 cs/min. Below 6 is poor laning.
- Kill Participation: 40%+ is good participation. Below 30% means you're not in fights.

MATCH DATA:
- Queue: ${getQueueType(matchData.queueId)}
- Duration: ${formatDuration(matchData.gameDuration)}
- Player Champion: ${player.championName} | Team: ${playerTeam}
- Result: ${player.win ? 'VICTORY' : 'DEFEAT'}

PLAYER STATS:
- KDA: ${player.kills}/${player.deaths}/${player.assists}
- Damage: ${player.totalDamageDealtToChampions || 0} (team average: ${Math.round(avgDamage)})
- Gold: ${player.goldEarned} (${((player.goldEarned / (Math.max(blueGold, redGold))) * 100).toFixed(0)}% of team gold)
- CS: ${player.totalMinionsKilled + player.neutralMinionsKilled} (${csPerMin} cs/min, team average: ${Math.round(avgCS)})
- Vision Score: ${player.visionScore || 0} (team average: ${avgVisionScore.toFixed(1)})
- Wards Placed: ${player.wardsPlaced || 0} (team average: ${avgWardsPlaced.toFixed(1)})
- Wards Cleared: ${player.wardsKilled || 0} (enemy wards destroyed)
- Kill Participation: ${playerTeam === 'Blue' && blueKills > 0 ? ((player.kills + player.assists) / blueKills * 100).toFixed(0) : playerTeam === 'Red' && redKills > 0 ? ((player.kills + player.assists) / redKills * 100).toFixed(0) : 0}%
- Damage per minute: ${((player.totalDamageDealtToChampions || 0) / (matchData.gameDuration / 60)).toFixed(0)}

TEAM STATS:
- Blue Team: ${blueKills} kills, ${blueGold} gold
- Red Team: ${redKills} kills, ${redGold} gold

TIMELINE HIGHLIGHTS:
${timelineHighlights.slice(0, 10).join('\n') || 'No major events recorded'}

IMPORTANT: Respond in SPANISH. All titles, descriptions, and summary must be in Spanish.

Respond with a JSON object:
{
  "insights": [
    {
      "type": "positive" | "negative" | "improvement",
      "title": "Short descriptive title in Spanish (max 50 chars)",
      "description": "Detailed explanation in Spanish with specific numbers and advice (max 200 chars)",
      "priority": 1-3 (1 = most important)
    }
  ],
  "summary": "2-3 sentence overall performance summary in Spanish (max 150 chars)",
  "playerStats": {
    "kda": "string",
    "damage": number,
    "visionScore": number,
    "cs": number
  }
}

Provide 3-6 insights. Focus on actionable advice the player can use. Compare to team averages to determine if stats are good or bad.`

  return prompt
}

export async function analyzeMatch(matchId: string, playerPuuid: string): Promise<MatchAnalysisResult> {
  console.log('[AI] Analyzing match:', matchId, 'for player:', playerPuuid)

  const matchData = getMatchParticipants(matchId)
  console.log('[AI] Match data from cache:', matchData ? 'found' : 'not found')

  if (!matchData) {
    throw new Error('Match not found in cache')
  }

  const player = matchData.participants.find((p: any) => p.puuid === playerPuuid)
  console.log('[AI] Player found in match:', player ? 'yes' : 'no')

  if (!player) {
    throw new Error('Player not found in match')
  }

  const prompt = buildPrompt(matchData, playerPuuid)
  console.log('[AI] Prompt built, calling Groq...')

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You are an expert League of Legends analyst. Always respond with valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    model: 'llama-3.1-8b-instant',
    temperature: 0.7,
    max_tokens: 1024,
    response_format: { type: 'json_object' }
  })

  const responseText = completion.choices[0]?.message?.content
  if (!responseText) {
    throw new Error('No response from AI')
  }

  try {
    const parsed = JSON.parse(responseText)
    return {
      matchId,
      insights: parsed.insights || [],
      summary: parsed.summary || '',
      playerStats: {
        kda: `${player.kills}/${player.deaths}/${player.assists}`,
        damage: player.totalDamageDealtToChampions || 0,
        visionScore: player.visionScore || 0,
        cs: player.totalMinionsKilled + player.neutralMinionsKilled
      }
    }
  } catch (e) {
    console.error('[AI] Failed to parse AI response:', responseText)
    throw new Error('Failed to parse AI response')
  }
}
