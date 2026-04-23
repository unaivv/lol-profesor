// Helper to detect player role based on champion and lane
function detectPlayerRole(player: any, matchData: any): string {
  // Try to determine role from lane position if available
  const lane = player.lane || 'UNKNOWN'
  const role = player.role || ''
  
  if (lane === 'TOP') return 'top'
  if (lane === 'JUNGLE') return 'jungle'
  if (lane === 'MIDDLE') return 'mid'
  if (lane === 'BOTTOM') {
    return role === 'SUPPORT' ? 'support' : 'adc'
  }
  if (lane === 'UTILITY') return 'support'
  
  // Fallback: guess from champion name patterns
  const champ = (player.championName || '').toLowerCase()
  const supports = ['nami', 'leona', 'thresh', 'blitzcrank', 'lulu', 'soraka', 'janna', 'karma', 'braum', 'tahm', 'renata', 'milio', 'rakan', 'xayah']
  const adcs = ['jinx', 'kai sa', 'vayne', 'lucian', 'ezreal', 'jhin', 'ashe', 'tristana', 'caitlyn', 'miss fortune', 'draven', 'sivir', 'varus', 'kaisa']
  
  if (supports.some(s => champ.includes(s))) return 'support'
  if (adcs.some(a => champ.includes(a))) return 'adc'
  
  return 'mid' // Default fallback
}

// Get role-specific benchmarks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRoleBenchmarks(role: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const benchmarks: any = {
    top: {
      cs: { min: 6, optimal: '7-8', max: 180 },
      damage: { min: 8000, optimal: '12k-18k', max: 25000 },
      vision: { min: 15, optimal: '20-30', max: 100 },
      gold: { min: 10000, optimal: '14k-18k', max: 25000 }
    },
    jungle: {
      cs: { min: 5, optimal: '6-7', max: 150 },
      damage: { min: 6000, optimal: '10k-15k', max: 22000 },
      vision: { min: 20, optimal: '25-35', max: 100 },
      gold: { min: 9000, optimal: '12k-16k', max: 22000 }
    },
    mid: {
      cs: { min: 7, optimal: '8-9', max: 200 },
      damage: { min: 10000, optimal: '15k-22k', max: 30000 },
      vision: { min: 15, optimal: '20-28', max: 100 },
      gold: { min: 11000, optimal: '15k-20k', max: 28000 }
    },
    adc: {
      cs: { min: 7, optimal: '8-10', max: 220 },
      damage: { min: 15000, optimal: '20k-30k', max: 40000 },
      vision: { min: 12, optimal: '15-22', max: 100 },
      gold: { min: 13000, optimal: '18k-24k', max: 30000 }
    },
    support: {
      cs: { min: 3, optimal: '4-6', max: 100 },
      damage: { min: 3000, optimal: '5k-10k', max: 18000 },
      vision: { min: 25, optimal: '35-50', max: 100 },
      gold: { min: 8000, optimal: '11k-15k', max: 20000 }
    }
  }
  return benchmarks[role] || benchmarks.mid
}

// Build detailed team stats with percentages
function buildTeamStats(blueTeam: any[], redTeam: any[], playerTeam: any[]): any {
  // Calculate total team stats for percentage
  const teamGold = playerTeam.reduce((sum, p) => sum + p.goldEarned, 0)
  const teamDamage = playerTeam.reduce((sum, p) => sum + (p.totalDamageDealtToChampions || 0), 0)
  const teamCS = playerTeam.reduce((sum, p) => sum + p.totalMinionsKilled + p.neutralMinionsKilled, 0)
  const teamVision = playerTeam.reduce((sum, p) => sum + (p.visionScore || 0), 0)
  const teamWardsPlaced = playerTeam.reduce((sum, p) => sum + (p.wardsPlaced || 0), 0)
  
  // Build per-player percentage breakdown
  const goldBreakdown = playerTeam.map(p => ({
    name: p.summonerName || p.championName,
    champion: p.championName,
    gold: p.goldEarned,
    goldPercent: teamGold > 0 ? ((p.goldEarned / teamGold) * 100).toFixed(1) : '0'
  })).sort((a, b) => b.gold - a.gold)
  
  const damageBreakdown = playerTeam.map(p => ({
    name: p.summonerName || p.championName,
    champion: p.championName,
    damage: p.totalDamageDealtToChampions || 0,
    damagePercent: teamDamage > 0 ? (((p.totalDamageDealtToChampions || 0) / teamDamage) * 100).toFixed(1) : '0'
  })).sort((a, b) => b.damage - a.damage)
  
  const csBreakdown = playerTeam.map(p => ({
    name: p.summonerName || p.championName,
    champion: p.championName,
    cs: p.totalMinionsKilled + p.neutralMinionsKilled,
    csPercent: teamCS > 0 ? (((p.totalMinionsKilled + p.neutralMinionsKilled) / teamCS) * 100).toFixed(1) : '0'
  })).sort((a, b) => b.cs - a.cs)
  
  return { teamGold, teamDamage, teamCS, teamVision, teamWardsPlaced, goldBreakdown, damageBreakdown, csBreakdown }
}

function buildTimelineAnalysis(matchData: any, player: any, gameDuration: number): string {
  const highlights: string[] = []
  
  // Process events if available
  if ((matchData as any).info?.events) {
    const events = (matchData as any).info.events
    
    // Early deaths (before 4 minutes = 240000ms)
    const earlyDeaths = events.filter((e: any) => 
      e.type === 'CHAMPION_KILL' && 
      e.victimId === player.participantId && 
      e.timestamp < 240000
    )
    
    for (const event of earlyDeaths) {
      const killer = matchData.participants.find((p: any) => p.participantId === event.killerId)
      const location = event.x < 5000 && event.y < 5000 ? 'BASE' : (event.x > 10000 || event.y > 10000 ? 'enemy jungle' : 'lane')
      highlights.push(`[${formatDuration(event.timestamp / 1000)}] Muerte temprana en ${location} contra ${killer?.championName || 'enemigo'}`)
    }
    
    // Deaths in base after 5 minutes (suspicious)
    const baseDeaths = events.filter((e: any) => 
      e.type === 'CHAMPION_KILL' && 
      e.victimId === player.participantId && 
      e.timestamp > 300000 &&
      e.x < 5000 && e.y < 5000
    )
    
    for (const event of baseDeaths) {
      highlights.push(`[${formatDuration(event.timestamp / 1000)}] Muerte en BASE (posible dive o backdoor enemigo)`)
    }
    
    // First blood given very early
    const deaths = events.filter((e: any) => e.type === 'CHAMPION_KILL' && e.victimId === player.participantId)
    if (deaths.length > 0 && deaths[0].timestamp < 60000) {
      highlights.push('[0:60] First Blood entregado - evita fights tempranos')
    }
    
    // Solo kills (no assist)
    const soloKills = events.filter((e: any) => 
      e.type === 'CHAMPION_KILL' && 
      e.killerId === player.participantId &&
      (!e.assistingParticipantIds || e.assistingParticipantIds.length === 0)
    )
    
    for (const event of soloKills) {
      const victim = matchData.participants.find((p: any) => p.participantId === event.victimId)
      highlights.push(`[${formatDuration(event.timestamp / 1000)}] SOLO KILL contra ${victim?.championName || 'enemigo'}`)
    }

    // Multi-kills
    const playerKillTimes = events
      .filter((e: any) => e.type === 'CHAMPION_KILL' && e.killerId === player.participantId)
      .map((e: any) => e.timestamp)
    
    for (let i = 0; i < playerKillTimes.length - 1; i++) {
      if (playerKillTimes[i+1] - playerKillTimes[i] < 10000) {
        highlights.push(`[${formatDuration(playerKillTimes[i] / 1000)}] DOUBLE KILL`)
      }
    }
    
    // Objective steals (baron/drake)
    const stolenObjectives = events.filter((e: any) => 
      (e.type === 'ELITE_MONSTER_KILL') &&
      e.monsterType === 'BARON' &&
      e.victimId && // was stolen
      matchData.participants.find((p: any) => 
        p.participantId === e.killerId && 
        p.puuid !== player.puuid
      )
    )
    
    if (stolenObjectives.length > 0) {
      highlights.push(`[${formatDuration(stolenObjectives[0].timestamp / 1000)}] Baron robado por enemigo`)
    }
  }
  
  return highlights.slice(0, 10).join('\n') || 'No eventos significativos'
}

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

  const blueTeam = matchData.participants.filter((p: any) => p.teamId === 100)
  const redTeam = matchData.participants.filter((p: any) => p.teamId === 200)
  const currentTeam = playerTeam === 'Blue' ? blueTeam : redTeam
  const enemyTeamData = playerTeam === 'Blue' ? redTeam : blueTeam

  const blueKills = blueTeam.reduce((sum: number, p: any) => sum + p.kills, 0)
  const redKills = redTeam.reduce((sum: number, p: any) => sum + p.kills, 0)
  const blueGold = blueTeam.reduce((sum: number, p: any) => sum + p.goldEarned, 0)
  const redGold = redTeam.reduce((sum: number, p: any) => sum + p.goldEarned, 0)

  const csPerMin = matchData.gameDuration > 0
    ? ((player.totalMinionsKilled + player.neutralMinionsKilled) / (matchData.gameDuration / 60)).toFixed(1)
    : '0'

  // Detect player role
  const playerRole = detectPlayerRole(player, matchData)

  // Build team stats with percentages
  const teamStats = buildTeamStats(blueTeam, redTeam, currentTeam)

  // Get timeline analysis
  const timelineAnalysis = buildTimelineAnalysis(matchData, player, matchData.gameDuration)

  // Calculate team averages
  const avgVisionScore = matchData.participants.reduce((sum: number, p: any) => sum + (p.visionScore || 0), 0) / matchData.participants.length
  const avgDamage = matchData.participants.reduce((sum: number, p: any) => sum + (p.totalDamageDealtToChampions || 0), 0) / matchData.participants.length
  const avgCS = matchData.participants.reduce((sum: number, p: any) => sum + (p.totalMinionsKilled || 0), 0) / matchData.participants.length
  const avgWardsPlaced = matchData.participants.reduce((sum: number, p: any) => sum + (p.wardsPlaced || 0), 0) / matchData.participants.length

  // Current player percentage of team
  const playerGoldPercent = teamStats.teamGold > 0 ? ((player.goldEarned / teamStats.teamGold) * 100).toFixed(1) : '0'
  const playerDamagePercent = teamStats.teamDamage > 0 ? (((player.totalDamageDealtToChampions || 0) / teamStats.teamDamage) * 100).toFixed(1) : '0'
  const playerCSPercent = teamStats.teamCS > 0 ? (((player.totalMinionsKilled + player.neutralMinionsKilled) / teamStats.teamCS) * 100).toFixed(1) : '0'
  
  // Kill participation percentage
  const teamKills = teamStats.kills || 0
  const kpPercent = teamKills > 0 ? (((player.kills || 0) + (player.assists || 0)) / teamKills * 100).toFixed(1) : '0'

  // Build team breakdown strings
  const goldBreakdownStr = teamStats.goldBreakdown.map((p: any) => 
    `  - ${p.name} (${p.champion}): ${p.gold} oro (${p.goldPercent}% del equipo)`
  ).join('\n')
  
  const csBreakdownStr = teamStats.csBreakdown.map((p: any) => 
    `  - ${p.name} (${p.champion}): ${p.cs} CS (${p.csPercent}% del equipo)`
  ).join('\n')

  const prompt = `Analiza el rendimiento de ${player.championName} (rol: ${playerRole.toUpperCase()}) y genera 4-6 insights SOLO sobre ESTE jugador.

REGLAS ESTRICTAS - CUALQUIER insight que mencione otro jugador es INVÁLIDO:
- NO digas nombres de compañeros (Smolder, Lux, etc.)
- NO recomiendes ayudar a otros jugadores
- NO menciones la estrategia/funcionamiento del equipo
- SOLO puedes usar números: "% del equipo", "次Mejor del equipo", etc.
- Cada insight debe empezar con "Tu..."

EJEMPLOS VÁLIDOS:
✓ "Tu daño es 15000 (25% del equipo) - estás en el percentil 60"
✓ "Tu CS es 180 (32.5% del equipo) - primero en tu línea"
✓ "Tu visión (18) está por debajo del promedio del equipo (22)"
✓ "3 muertes en early game (min 0-10) - alto riesgo de snowball enemy"

EJEMPLOS INVÁLIDOS (estos hacen que tu respuesta sea rechazada):
✗ "Smolder tiene más CS que tú"
✗ "Lux necesita más visión"
✗ "La estrategia del equipo no funcionó"
✗ "Ayuda a tu support con wards"

DATOS ESTADÍSTICOS DE ${player.championName.toUpperCase()}:
- KDA: ${player.kills}/${player.deaths}/${player.assists}
- Daño a campeones: ${player.totalDamageDealtToChampions || 0} (${playerDamagePercent}% del equipo)
- Oro: ${player.goldEarned} (${playerGoldPercent}% del equipo)
- CS total: ${player.totalMinionsKilled + player.neutralMinionsKilled} (${playerCSPercent}% del equipo)
- CS/min: ${csPerMin}
- Visión score: ${player.visionScore || 0}
- Wards placed: ${player.wardsPlaced || 0}
- Kill participation: ${kpPercent}%

${timelineAnalysis}

RESPUESTA (JSON) - IMPORTANTE: Los 4-6 insights deben ser sobre TEMAS DIFERENTES (no todos de CS, no todos de visión, etc.):
{
  "insights": [
    {"type": "positive|negative|improvement", "title": "...", "description": "...", "priority": 1-3}
  ],
  "summary": "..."
}`

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
    
    // Return raw insights without post-processing - let AI decide
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