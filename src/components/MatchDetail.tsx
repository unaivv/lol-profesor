import { useState, useEffect, useRef } from 'react'
import { DetailedMatch, Participant, MatchTimeline } from '../types/api'
import { getChampionItems, getTrinket, calculateKDARatio } from './MatchCard'
import { Skull, Shield, Target, Zap, X, Sparkles, Loader2 } from 'lucide-react'

interface MatchDetailProps {
  match: DetailedMatch
  playerPuuid?: string
  onClose: () => void
}

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const formatTimestamp = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const formatGold = (gold: number): string => {
  if (gold >= 1000) return `${(gold / 1000).toFixed(1)}k`
  return gold.toString()
}

const getItemIcon = (itemId: number): string => {
  if (itemId === 0) return ''
  return `https://ddragon.leagueoflegends.com/cdn/14.5.1/img/item/${itemId}.png`
}

const getChampionIcon = (championId: number, championName?: string): string => {
  if (championName) {
    return `https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${championName}.png`
  }
  return `https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${championId}.png`
}

const getQueueName = (queueId?: number): string => {
  const queues: Record<number, string> = {
    420: 'Clasificatoria Solo/Dúo',
    440: 'Clasificatoria Flex',
    450: 'ARAM',
    400: 'Normal Reclutamiento',
    430: 'Normal Selección Oculta'
  }
  return queues[queueId || 0] || 'Otro Modo'
}

interface PlayerRowProps {
  player: Participant
  isCurrentPlayer: boolean
  isMVP: boolean
}

const PlayerRow = ({ player, isCurrentPlayer, isMVP }: PlayerRowProps) => {
  const kdaRatio = calculateKDARatio(player.kills, player.deaths, player.assists)
  const kdaColor = kdaRatio >= 4 ? '#10b981' : kdaRatio >= 2.5 ? '#2563eb' : kdaRatio >= 1 ? '#d97706' : '#dc2626'
  const items = getChampionItems(player)
  const trinket = getTrinket(player)
  const visionScore = (player.visionScore ?? 0) ||
    ((player.visionWardsBoughtInGame || 0) + (player.wardsPlaced || 0) + (player.wardsKilled || 0))

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 10px',
      borderRadius: '8px',
      background: isCurrentPlayer ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
      border: isCurrentPlayer ? '2px solid #eab308' : isMVP ? '2px solid #8b5cf6' : '1px solid transparent',
      position: 'relative',
    }}>
      {isCurrentPlayer && (
        <div style={{
          position: 'absolute',
          top: '-4px',
          left: '-4px',
          background: '#eab308',
          color: 'white',
          fontSize: '8px',
          fontWeight: 'bold',
          padding: '2px 4px',
          borderRadius: '4px',
          zIndex: 10
        }}>
          {isMVP ? 'TÚ MVP' : 'TÚ'}
        </div>
      )}
      {!isCurrentPlayer && isMVP && (
        <div style={{
          position: 'absolute',
          top: '-4px',
          left: '-4px',
          background: '#8b5cf6',
          color: 'white',
          fontSize: '8px',
          fontWeight: 'bold',
          padding: '2px 4px',
          borderRadius: '4px',
          zIndex: 10
        }}>
          MVP
        </div>
      )}
      <img
        src={getChampionIcon(player.championId, player.championName)}
        alt={player.championName}
        style={{ width: '32px', height: '32px', borderRadius: '6px' }}
      />
      <div style={{ flex: 1, minWidth: '0' }}>
        <div style={{
          fontSize: '12px',
          fontWeight: isCurrentPlayer ? 700 : 500,
          color: isCurrentPlayer ? '#b45309' : '#1e293b',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {player.summonerName || player.championName || 'Unknown'}
        </div>
        <div style={{ fontSize: '10px', color: '#64748b' }}>{player.championName}</div>
      </div>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', minWidth: '60px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: kdaColor }}>{player.kills}</span>
        <span style={{ color: '#94a3b8', fontSize: '10px' }}>/</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444' }}>{player.deaths}</span>
        <span style={{ color: '#94a3b8', fontSize: '10px' }}>/</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: kdaColor }}>{player.assists}</span>
      </div>
      <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
        {[0, 1, 2, 3, 4, 5].map(idx => {
          const item = items[idx]
          return (
            <div key={idx} style={{
              width: '20px',
              height: '20px',
              background: item > 0 ? '#0f172a' : 'rgba(15, 23, 42, 0.3)',
              borderRadius: '3px',
              overflow: 'hidden',
              border: item === 0 ? '1px dashed #475569' : 'none'
            }}>
              {item > 0 && <img src={getItemIcon(item)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />}
            </div>
          )
        })}
      </div>
      {trinket > 0 && (
        <div style={{
          width: '20px',
          height: '20px',
          background: '#0f172a',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <img src={getItemIcon(trinket)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
      )}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        minWidth: '40px',
        padding: '2px 6px',
        background: visionScore >= 25 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(100, 116, 139, 0.1)',
        borderRadius: '4px'
      }}>
        <span style={{ fontSize: '10px' }}>👁️</span>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: visionScore >= 25 ? '#3b82f6' : '#64748b'
        }}>
          {visionScore}
        </span>
      </div>
    </div>
  )
}

export function MatchDetail({ match, playerPuuid, onClose }: MatchDetailProps) {
  const [timeline, setTimeline] = useState<MatchTimeline | null>(null)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineError, setTimelineError] = useState<string | null>(null)
  const [activeEventTime, setActiveEventTime] = useState<string | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const blueListRef = useRef<HTMLDivElement>(null)
  // @ts-expect-error - refs kept for future use
  const redListRef = useRef<HTMLDivElement>(null)

  const participants = match.participants || []
  const currentPlayer = playerPuuid ? participants.find(p => p.puuid === playerPuuid) : participants[0]
  const teamWon = currentPlayer?.win || false

  const blueTeam = participants.filter(p => p.teamId === 100)
  const redTeam = participants.filter(p => p.teamId === 200)

  const findMVP = (teamPlayers: Participant[]): number => {
    if (!teamPlayers.length) return -1
    let mvpId = teamPlayers[0].participantId
    let maxScore = 0
    for (const p of teamPlayers) {
      const score = (p.kills * 3 + p.assists * 2 + (p.damageDealtToChampions || 0) / 5000) - (p.deaths * 1.5)
      if (score > maxScore) {
        maxScore = score
        mvpId = p.participantId
      }
    }
    return mvpId
  }

  const blueMVP = findMVP(blueTeam)
  const redMVP = findMVP(redTeam)

  useEffect(() => {
    const fetchTimeline = async () => {
      setTimelineLoading(true)
      setTimelineError(null)
      try {
        const response = await fetch(`/api/match/${match.gameId}/timeline`)
        if (response.ok) {
          const res = await response.json()
          setTimeline(res.data)
        } else {
          setTimelineError('Timeline no disponible para esta partida')
        }
      } catch {
        setTimelineError('Error al cargar timeline')
      } finally {
        setTimelineLoading(false)
      }
    }

    fetchTimeline()
  }, [match.gameId])

  // @ts-ignore - temporarily unused
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'CHAMPION_KILL':
        return <Skull size={12} />
      case 'ELITE_MONSTER_KILL':
        return <Shield size={12} style={{ color: '#f97316' }} />
      case 'BUILDING_KILL':
        return <Target size={12} style={{ color: '#ef4444' }} />
      case 'ITEM_PURCHASED':
      case 'ITEM_SOLD':
      case 'ITEM_DESTROYED':
        return <Zap size={12} style={{ color: '#10b981' }} />
      case 'SKILL_LEVEL_UP':
      case 'LEVEL_UP':
        return <Target size={12} style={{ color: '#8b5cf6' }} />
      case 'WARD_PLACED':
        return <Target size={12} style={{ color: '#06b6d4' }} />
      case 'WARD_KILL':
        return <Target size={12} style={{ color: '#f59e0b' }} />
      default:
        return <Target size={12} />
    }
  }

  const extractKeyEvents = () => {
    if (!timeline?.frames || !match?.participants) return { blue: [], red: [], merged: [] }

    // Create participant map with summonerName and teamId
    const participantMap = new Map(
      match.participants.map(p => [p.participantId, {
        summonerName: p.summonerName || p.championName || 'Unknown',
        teamId: p.teamId
      }])
    )

    interface TimelineEvent {
      id: string
      time: string
      seconds: number
      type: string
      typeLabel: string
      killer?: string
      team: 'blue' | 'red'
    }

    const blueEvents: TimelineEvent[] = []
    const redEvents: TimelineEvent[] = []

    // Collect all events from all frames
    for (const frame of timeline.frames) {
      for (const event of (frame.events || [])) {
        const eventTimeStr = formatTimestamp(event.timestamp)
        const eventSeconds = Math.floor(event.timestamp / 1000)
        const eventType = event.type

        if (eventType === 'CHAMPION_KILL' && event.killerId != null && event.victimId != null) {
          const killerInfo = participantMap.get(event.killerId)
          const killerName = killerInfo ? killerInfo.summonerName : 'Unknown'
          const victimInfo = participantMap.get(event.victimId)
          const victimName = victimInfo ? victimInfo.summonerName : 'Unknown'
          const killerTeamId = killerInfo ? killerInfo.teamId : 0
          const eventLabel = `${killerName} 💀 ${victimName}`
          const ev: TimelineEvent = {
            id: `kill-${event.killerId}-${event.victimId}-${eventSeconds}`,
            time: eventTimeStr,
            seconds: eventSeconds,
            type: eventType,
            typeLabel: eventLabel,
            killer: killerName,
            team: killerTeamId === 100 ? 'blue' : 'red'
          }
          if (killerTeamId === 100) blueEvents.push(ev)
          else if (killerTeamId === 200) redEvents.push(ev)

        } else if (eventType === 'ELITE_MONSTER_KILL' && event.killerId != null) {
          const killerInfo = participantMap.get(event.killerId)
          const killerName = killerInfo ? killerInfo.summonerName : 'Unknown'
          const killerTeamId = killerInfo ? killerInfo.teamId : 0
          let monsterName = event.monsterType || 'monstruo épico'
          if (event.monsterSubType) monsterName += ` (${event.monsterSubType})`
          const eventLabel = `${killerName} 🐉 Mata ${monsterName}`
          const ev: TimelineEvent = {
            id: `monster-${eventSeconds}-${killerName}`,
            time: eventTimeStr,
            seconds: eventSeconds,
            type: eventType,
            typeLabel: eventLabel,
            killer: killerName,
            team: killerTeamId === 100 ? 'blue' : 'red'
          }
          if (killerTeamId === 100) blueEvents.push(ev)
          else if (killerTeamId === 200) redEvents.push(ev)

        } else if (eventType === 'BUILDING_KILL' && event.killerId != null) {
          const killerInfo = participantMap.get(event.killerId)
          const killerName = killerInfo ? killerInfo.summonerName : 'Unknown'
          const killerTeamId = killerInfo ? killerInfo.teamId : 0
          const buildingType = event.buildingType || 'estructura'
          const teamLabel = killerTeamId === 100 ? 'enemiga' : 'aliada'
          const eventLabel = `${killerName} 🏰 Destruye ${buildingType} ${teamLabel}`
          const ev: TimelineEvent = {
            id: `build-${eventSeconds}-${killerName}`,
            time: eventTimeStr,
            seconds: eventSeconds,
            type: eventType,
            typeLabel: eventLabel,
            killer: killerName,
            team: killerTeamId === 100 ? 'blue' : 'red'
          }
          if (killerTeamId === 100) blueEvents.push(ev)
          else if (killerTeamId === 200) redEvents.push(ev)
        }
      }
    }

    // Sort by time
    const sortEvents = (events: TimelineEvent[]) => events.sort((a, b) => a.seconds - b.seconds)

    // Deduplicate events using a Map (keep first occurrence)
    const deduplicate = (events: TimelineEvent[]) => {
      const seen = new Map<string, TimelineEvent>()
      for (const event of events) {
        if (!seen.has(event.id)) {
          seen.set(event.id, event)
        }
      }
      return Array.from(seen.values())
    }

    const sortedBlue = deduplicate(sortEvents(blueEvents))
    const sortedRed = deduplicate(sortEvents(redEvents))

    // Create merged timeline - pair events that happen at the same time
    const merged: Array<{ id: string; time: string; seconds: number; blue?: TimelineEvent; red?: TimelineEvent }> = []
    let blueIdx = 0
    let redIdx = 0

    while (blueIdx < sortedBlue.length || redIdx < sortedRed.length) {
      const blue = sortedBlue[blueIdx]
      const red = sortedRed[redIdx]

      if (blue && (!red || blue.seconds <= red.seconds)) {
        merged.push({
          id: `merged-${blue.seconds}`,
          time: blue.time,
          seconds: blue.seconds,
          blue
        })
        // Check if there's also a red event at exactly the same second
        if (red && red.seconds === blue.seconds) {
          merged[merged.length - 1].red = red
          redIdx++
        }
        blueIdx++
      } else if (red) {
        merged.push({
          id: `merged-${red.seconds}`,
          time: red.time,
          seconds: red.seconds,
          red
        })
        redIdx++
      }
    }

    return { blue: sortedBlue, red: sortedRed, merged }
  }

  const keyEvents = extractKeyEvents()

  const gameDurationMin = Math.floor(match.gameDuration / 60)
  const csPerMin = currentPlayer ? Math.round((currentPlayer.totalMinionsKilled / gameDurationMin) * 10) / 10 : 0
  const goldPerMin = currentPlayer ? Math.round((currentPlayer.goldEarned / gameDurationMin) * 10) / 10 : 0
  const dmgPerMin = currentPlayer ? Math.round(((currentPlayer.damageDealtToChampions || 0) / gameDurationMin) * 10) / 10 : 0

  const items = currentPlayer ? getChampionItems(currentPlayer) : []

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      overflow: 'hidden'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '-12px',
            right: '-12px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '1px solid #e2e8f0',
            background: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10
          }}
        >
          <X size={20} color="#64748b" />
        </button>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingBottom: '100px'
        }}>
          <div style={{
            background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)',
            margin: '-24px -24px 24px -24px',
            padding: '20px 24px',
            borderRadius: '16px 16px 0 0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: teamWon ? '#10b981' : '#ef4444',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '14px'
                }}>
                  {teamWon ? 'VICTORIA' : 'DERROTA'}
                </div>
                <div style={{ color: 'white' }}>
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>{getQueueName(match.queueId)}</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>{formatDuration(match.gameDuration)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={getChampionIcon(currentPlayer?.championId || 0, currentPlayer?.championName)}
                  alt={currentPlayer?.championName}
                  style={{ width: '56px', height: '56px', borderRadius: '12px', border: '3px solid #eab308' }}
                />
                <div>
                  <div style={{ color: 'white', fontSize: '16px', fontWeight: 600 }}>{currentPlayer?.championName}</div>
                  <div style={{ color: '#94a3b8', fontSize: '13px' }}>Nivel {currentPlayer?.championLevel}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={16} color="#3b82f6" />
                Tu Performance
              </h3>
              <div style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #93c5fd'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
                      {currentPlayer?.kills}/{currentPlayer?.deaths}/{currentPlayer?.assists}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>KDA</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#ca8a04' }}>
                      {formatGold(currentPlayer?.goldEarned || 0)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Gold</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#059669' }}>
                      {currentPlayer?.totalMinionsKilled || 0}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>CS</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div style={{ background: 'white', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>{csPerMin}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>CS/min</div>
                  </div>
                  <div style={{ background: 'white', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>{goldPerMin}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>Gold/min</div>
                  </div>
                  <div style={{ background: 'white', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>{dmgPerMin}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>Dmg/min</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Target size={16} color="#f59e0b" />
                Tu Build
              </h3>
              <div style={{
                background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #fde047'
              }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {[0, 1, 2, 3, 4, 5].map(idx => {
                    const item = items[idx]
                    return (
                      <div key={idx} style={{
                        width: '40px',
                        height: '40px',
                        background: item > 0 ? '#0f172a' : 'rgba(15, 23, 42, 0.1)',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: item === 0 ? '1px dashed #94a3b8' : 'none'
                      }}>
                        {item > 0 && <img src={getItemIcon(item)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Trinket:</span>
                    {currentPlayer?.item6 && currentPlayer.item6 > 0 && (
                      <div style={{ width: '28px', height: '28px', background: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
                        <img src={getItemIcon(currentPlayer.item6)} alt="" style={{ width: '100%', height: '100%' }} />
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {(currentPlayer?.damageDealtToChampions || 0).toLocaleString()} dmg
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#3b82f6' }}>🔵</span> Equipo Azul
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {blueTeam.map(player => (
                  <PlayerRow
                    key={player.participantId}
                    player={player}
                    isCurrentPlayer={player.puuid === playerPuuid}
                    isMVP={player.participantId === blueMVP}
                  />
                ))}
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#ef4444' }}>🔴</span> Equipo Rojo
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {redTeam.map(player => (
                  <PlayerRow
                    key={player.participantId}
                    player={player}
                    isCurrentPlayer={player.puuid === playerPuuid}
                    isMVP={player.participantId === redMVP}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={16} color="#8b5cf6" />
              Timeline - Línea de Tiempo
            </h3>

            {/* Timeline Visual con línea horizontal */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              minHeight: '160px',
              overflowX: 'hidden'
            }}>
              {timelineLoading ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                  Cargando timeline...
                </div>
              ) : timelineError ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                  {timelineError}
                </div>
              ) : timeline?.frames ? (
                <div>
                  {/* Barra de tiempo visual */}
                  <div style={{ position: 'relative', height: '120px', marginBottom: '16px' }}>
                    {/* Línea central */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '0',
                      right: '0',
                      height: '3px',
                      background: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 50%, #ef4444 100%)',
                      borderRadius: '2px',
                      transform: 'translateY(-50%)'
                    }} />

                    {/* Marcas de tiempo */}
                    {[0, 25, 50, 75, 100].map((percent) => {
                      const timeMin = Math.floor((match.gameDuration * percent) / 100 / 60)
                      return (
                        <div key={percent} style={{
                          position: 'absolute',
                          top: '55%',
                          left: `${percent}%`,
                          transform: 'translate(-50%, -50%)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center'
                        }}>
                          <div style={{
                            width: '1px',
                            height: '12px',
                            background: '#cbd5e1'
                          }} />
                          <div style={{
                            fontSize: '10px',
                            color: '#64748b',
                            marginTop: '4px',
                            whiteSpace: 'nowrap'
                          }}>
                            {timeMin}:00
                          </div>
                        </div>
                      )
                    })}

                    {/* Puntos del Equipo Azul - clickables */}
                    {keyEvents.blue.map((event, idx) => {
                      const percent = match.gameDuration > 0 ? (event.seconds / match.gameDuration) * 100 : 0
                      const isActive = activeEventTime === `${event.seconds}`
                      return (
                        <div
                          key={`blue-${idx}`}
                          onClick={() => {
                            setActiveEventTime(`${event.seconds}`)
                            const el = document.getElementById(`timeline-${event.seconds}`)
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          }}
                          title={event.typeLabel}
                          style={{
                            position: 'absolute',
                            top: 'calc(50% - 24px)',
                            left: `${percent}%`,
                            transform: 'translateX(-50%)',
                            width: isActive ? '16px' : '12px',
                            height: isActive ? '16px' : '12px',
                            background: '#3b82f6',
                            borderRadius: '50%',
                            border: '2px solid white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            cursor: 'pointer',
                            zIndex: 10
                          }}
                        >
                          <div style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginBottom: '4px',
                            background: '#1e293b',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            whiteSpace: 'nowrap',
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            pointerEvents: 'none'
                          }} className="event-tooltip">
                            {event.time} - {event.typeLabel}
                          </div>
                        </div>
                      )
                    })}

                    {/* Puntos del Equipo Rojo - clickables */}
                    {keyEvents.red.map((event, idx) => {
                      const percent = match.gameDuration > 0 ? (event.seconds / match.gameDuration) * 100 : 0
                      const isActive = activeEventTime === `${event.seconds}`
                      return (
                        <div
                          key={`red-${idx}`}
                          onClick={() => {
                            setActiveEventTime(`${event.seconds}`)
                            const el = document.getElementById(`timeline-${event.seconds}`)
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          }}
                          title={event.typeLabel}
                          style={{
                            position: 'absolute',
                            top: 'calc(50% - 24px)',
                            left: `${percent}%`,
                            transform: 'translateX(-50%)',
                            width: isActive ? '16px' : '12px',
                            height: isActive ? '16px' : '12px',
                            background: '#ef4444',
                            borderRadius: '50%',
                            border: '2px solid white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            cursor: 'pointer',
                            zIndex: 10
                          }}
                        >
                          <div style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginBottom: '4px',
                            background: '#1e293b',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            whiteSpace: 'nowrap',
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            pointerEvents: 'none'
                          }} className="event-tooltip">
                            {event.time} - {event.typeLabel}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Leyenda */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', background: '#3b82f6', borderRadius: '50%' }} />
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Equipo Azul ({keyEvents.blue.length})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%' }} />
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Equipo Rojo ({keyEvents.red.length})</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                  No hay timeline disponible
                </div>
              )}
            </div>

            {/* Lista de eventos detallada con timeline sincronizado */}
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', marginTop: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={16} color="#8b5cf6" />
              Línea de Tiempo Sincronizada
            </h3>

            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #e2e8f0',
              minHeight: '120px',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              {timelineLoading ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                  Cargando timeline...
                </div>
              ) : timelineError ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                  {timelineError}
                </div>
              ) : keyEvents && keyEvents.merged.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', padding: '4px 4px', fontSize: '10px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ width: '40px', flexShrink: 0 }}>Tiempo</div>
                    <div style={{ flex: 1, minWidth: 0, paddingLeft: '4px' }}>Azul</div>
                    <div style={{ flex: 1, minWidth: 0, paddingLeft: '4px' }}>Rojo</div>
                  </div>

                  {/* Merged events - synced by time */}
                  <div ref={blueListRef} style={{ maxHeight: '300px', overflowY: 'auto', overflowX: 'hidden', width: '100%' }}>
                    {keyEvents.merged.map((row, rowIdx) => {
                      const isActive = activeEventTime === `${row.seconds}`;
                      return (
                        <div
                          key={row.id || `row-${rowIdx}`}
                          id={`timeline-${row.seconds}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px 4px',
                            background: rowIdx % 2 === 0 ? 'white' : '#f8fafc',
                            borderRadius: '4px',
                            fontSize: '11px',
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background 0.2s, border 0.2s',
                            border: isActive ? '2px solid #3b82f6' : '1px solid transparent',
                            width: '100%',
                            boxSizing: 'border-box',
                            overflow: 'hidden'
                          }}
                        >
                          {/* Tiempo */}
                          <div style={{ width: '40px', fontWeight: 600, color: '#64748b', flexShrink: 0 }}>
                            {row.time}
                          </div>

                          {/* Blue event */}
                          <div style={{ flex: 1, minWidth: 0, paddingLeft: '4px', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                            {row.blue ? (
                              <>
                                <div style={{ width: '6px', height: '6px', background: '#3b82f6', borderRadius: '50%', flexShrink: 0 }} />
                                <span style={{ color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.blue.typeLabel}</span>
                              </>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>—</span>
                            )}
                          </div>

                          {/* Red event */}
                          <div style={{ flex: 1, minWidth: 0, paddingLeft: '4px', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                            {row.red ? (
                              <>
                                <div style={{ width: '6px', height: '6px', background: '#ef4444', borderRadius: '50%', flexShrink: 0 }} />
                                <span style={{ color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.red.typeLabel}</span>
                              </>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                  No hay eventos destacados disponibles
                </div>
              )}
            </div>
          </div>

          {/* Fixed Analyze Button - Always visible */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '16px 24px',
            background: 'white',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'center',
            zIndex: 20
          }}>
            <button
              onClick={async () => {
                if (aiAnalysis) {
                  setAiAnalysis(null)
                  return
                }
                setAiLoading(true)
                setAiError(null)

                try {
                  const response = await fetch('/api/analyze-match', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ matchId: match.gameId, puuid: playerPuuid })
                  })
                  if (response.ok) {
                    const data = await response.json()
                    setAiAnalysis(data.data)
                    
                    // Scroll AFTER data is ready
                    setTimeout(() => {
                      const el = document.getElementById('ai-analysis-results')
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }, 100)
                  } else {
                    setAiError('Error al analizar la partida')
                  }
                } catch {
                  setAiError('Error de conexión')
                } finally {
                  setAiLoading(false)
                }
              }}
              disabled={aiLoading}
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: '14px 24px',
                background: aiAnalysis ? '#f1f5f9' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                color: aiAnalysis ? '#475569' : 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: aiLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {aiLoading ? (
                <><Loader2 size={18} className="animate-spin" /> Analizando con IA...</>
              ) : aiAnalysis ? (
                'Ocultar análisis'
              ) : (
                <><Sparkles size={18} /> Analizar con IA</>
              )}
            </button>
          </div>

          {/* Analysis Results - At the very bottom */}
          <div id="ai-analysis-results" style={{ padding: '24px 0', }}>

            {aiError && (
              <div style={{ marginTop: '12px', padding: '12px', background: '#fef2f2', borderRadius: '8px', color: '#dc2626', fontSize: '14px' }}>
                {aiError}
              </div>
            )}

            {aiAnalysis && (
              <div style={{ marginTop: '16px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="#8b5cf6" />
                  Análisis de la partida
                </h4>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>{aiAnalysis.summary}</p>
                {aiAnalysis.insights && aiAnalysis.insights.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Insights:</h5>
                    {aiAnalysis.insights.map((insight: any, idx: number) => (
                      <div key={idx} style={{
                        marginBottom: '8px',
                        padding: '10px',
                        background: insight.type === 'positive' ? '#dcfce7' : insight.type === 'negative' ? '#fee2e2' : '#fef3c7',
                        borderRadius: '8px',
                        borderLeft: `4px solid ${insight.type === 'positive' ? '#22c55e' : insight.type === 'negative' ? '#ef4444' : '#f59e0b'}`
                      }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>{insight.title}</div>
                        <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>{insight.description}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
