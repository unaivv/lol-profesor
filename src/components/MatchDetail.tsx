import { useState, useEffect } from 'react'
import { DetailedMatch, Participant, MatchTimeline } from '../types/api'
import { getChampionItems, calculateKDARatio } from './MatchCard'
import { Skull, Shield, Target, Zap, X } from 'lucide-react'

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
        {[0,1,2,3,4,5].map(idx => {
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
          const data = await response.json()
          setTimeline(data)
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
    if (!timeline?.frames || !match?.participants) return { blue: [], red: [] }
    
    // Create participant map with summonerName and teamId
    const participantMap = new Map(
        match.participants.map(p => [p.participantId, { 
            summonerName: p.summonerName || p.championName || 'Unknown',
            teamId: p.teamId
        }])
    )
    
    const blueEvents: Array<{ time: string; type: string; typeLabel: string; killer?: string }> = []
    const redEvents: Array<{ time: string; type: string; typeLabel: string; killer?: string }> = []
    
    // Collect all events from all frames
    for (const frame of timeline.frames) {
        for (const event of (frame.events || [])) {
            // Use event.timestamp for precise timing (relative to game start)
            const eventTimeStr = formatTimestamp(event.timestamp)
            const eventType = event.type
            
            // Filter to keep ONLY kills, objectives, dragons, and Baron
            if (eventType === 'CHAMPION_KILL' && event.killerId != null && event.victimId != null) {
                const killerInfo = participantMap.get(event.killerId)
                const killerName = killerInfo ? killerInfo.summonerName : 'Unknown'
                const victimInfo = participantMap.get(event.victimId)
                const victimName = victimInfo ? victimInfo.summonerName : 'Unknown'
                const killerTeamId = killerInfo ? killerInfo.teamId : 0
                
                const eventLabel = `${killerName} 💀 ${victimName}`
                
                if (killerTeamId === 100) {
                    blueEvents.push({
                        time: eventTimeStr,
                        type: eventType,
                        typeLabel: eventLabel,
                        killer: killerName
                    })
                } else if (killerTeamId === 200) {
                    redEvents.push({
                        time: eventTimeStr,
                        type: eventType,
                        typeLabel: eventLabel,
                        killer: killerName
                    })
                }
            } else if (eventType === 'ELITE_MONSTER_KILL' && event.killerId != null) {
                const killerInfo = participantMap.get(event.killerId)
                const killerName = killerInfo ? killerInfo.summonerName : 'Unknown'
                const killerTeamId = killerInfo ? killerInfo.teamId : 0
                let monsterName = event.monsterType || 'monstruo épico'
                if (event.monsterSubType) {
                    monsterName += ` (${event.monsterSubType})`
                }
                const eventLabel = `${killerName} 🐉 Mata ${monsterName}`
                
                if (killerTeamId === 100) {
                    blueEvents.push({
                        time: eventTimeStr,
                        type: eventType,
                        typeLabel: eventLabel,
                        killer: killerName
                    })
                } else if (killerTeamId === 200) {
                    redEvents.push({
                        time: eventTimeStr,
                        type: eventType,
                        typeLabel: eventLabel,
                        killer: killerName
                    })
                }
            } else if (eventType === 'BUILDING_KILL' && event.killerId != null) {
                const killerInfo = participantMap.get(event.killerId)
                const killerName = killerInfo ? killerInfo.summonerName : 'Unknown'
                const killerTeamId = killerInfo ? killerInfo.teamId : 0
                const buildingType = event.buildingType || 'estructura'
                
                // For building kills, determine if it's allied or enemy building based on teamId in event
                // When you destroy a building, you belong to the team that did the destroying
                // The building itself belongs to the opposite team
                // So if killer is blue (100) and they destroyed a building, that building was red's
                const teamLabel = killerTeamId === 100 ? 'enemiga' : 'aliada'
                
                const eventLabel = `${killerName} 🏰 Destruye ${buildingType} ${teamLabel}`
                
                if (killerTeamId === 100) {
                    blueEvents.push({
                        time: eventTimeStr,
                        type: eventType,
                        typeLabel: eventLabel,
                        killer: killerName
                    })
                } else if (killerTeamId === 200) {
                    redEvents.push({
                        time: eventTimeStr,
                        type: eventType,
                        typeLabel: eventLabel,
                        killer: killerName
                    })
                }
            }
            // Ignore all other events: ITEM_*, SKILL_LEVEL_UP, WARD_*, LEVEL_UP, etc.
        }
    }
    
    // Sort each team's events by time (earliest first - oldest at top)
    const sortEvents = (events: any[]) => {
        return events
            .sort((a, b) => {
                // Convert time strings back to seconds for comparison
                const timeA = parseInt(a.time.split(':')[0]) * 60 + parseInt(a.time.split(':')[1])
                const timeB = parseInt(b.time.split(':')[0]) * 60 + parseInt(b.time.split(':')[1])
                return timeA - timeB // Earliest first
            })
    }
    
    return {
        blue: sortEvents(blueEvents),
        red: sortEvents(redEvents)
    }
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
      overflow: 'hidden' // Prevent scrolling outside modal
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
          padding: '24px'
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
                  {[0,1,2,3,4,5].map(idx => {
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
              Timeline - Eventos Clave
            </h3>
            <div style={{ 
              background: '#f8fafc', 
              borderRadius: '12px', 
              padding: '16px',
              border: '1px solid #e2e8f0',
              minHeight: '80px'
            }}>
              {timelineLoading ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                  Cargando timeline...
                </div>
              ) : timelineError ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                  {timelineError}
                </div>
              ) : keyEvents ? (
                <div style={{ display: 'flex', gap: '20px' }}>
                  {/* Blue Team Events (Left) */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#3b82f6', marginBottom: '8px' }}>
                      Equipo Azul
                    </h4>
                    <div style={{ 
                      maxHeight: '300px', 
                      overflowY: 'auto',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px'
                    }}>
                      {keyEvents.blue.length > 0 ? (
                        keyEvents.blue.map((event, idx) => (
                          <div key={idx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            background: 'white',
                            borderRadius: '6px',
                            fontSize: '11px',
                            border: '1px solid #f1f5f9'
                          }}>
                            <span style={{ fontWeight: 600, color: '#64748b' }}>{event.time}</span>
                            {getEventIcon(event.type)}
                            <span style={{ color: '#1e293b', flex: 1, minWidth: 0 }}>{event.typeLabel}</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '16px' }}>
                          No hay eventos
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Red Team Events (Right) */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444', marginBottom: '8px' }}>
                      Equipo Rojo
                    </h4>
                    <div style={{ 
                      maxHeight: '300px', 
                      overflowY: 'auto',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px'
                    }}>
                      {keyEvents.red.length > 0 ? (
                        keyEvents.red.map((event, idx) => (
                          <div key={idx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            background: 'white',
                            borderRadius: '6px',
                            fontSize: '11px',
                            border: '1px solid #f1f5f9'
                          }}>
                            <span style={{ fontWeight: 600, color: '#64748b' }}>{event.time}</span>
                            {getEventIcon(event.type)}
                            <span style={{ color: '#1e293b', flex: 1, minWidth: 0 }}>{event.typeLabel}</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '16px' }}>
                          No hay eventos
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                  No hay eventos destacados disponibles
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
