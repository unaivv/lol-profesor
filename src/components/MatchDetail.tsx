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

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 10px',
      borderRadius: '8px',
      background: isCurrentPlayer ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
      border: isCurrentPlayer ? '2px solid #eab308' : '1px solid transparent',
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
          TÚ
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
          {isMVP && (
            <span style={{
              marginLeft: '4px',
              background: '#8b5cf6',
              color: 'white',
              fontSize: '7px',
              fontWeight: 'bold',
              padding: '1px 3px',
              borderRadius: '3px'
            }}>MVP</span>
          )}
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
        {[0,1,2,3,4,5,6].map(idx => {
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
    if (type === 'CHAMPION_KILL') return <Skull size={12} />
    if (type === 'ELITE_MONSTER_KILL') {
      return <Shield size={12} style={{ color: '#f97316' }} />
    }
    if (type === 'BUILDING_KILL') return <Target size={12} style={{ color: '#ef4444' }} />
    return <Target size={12} />
  }

  const extractKeyEvents = () => {
    if (!timeline?.frames) return []
    
    const keyEvents: Array<{ time: string; type: string; typeLabel: string }> = []
    
    timeline.frames.forEach((frame) => {
      const minute = Math.floor(frame.timestamp / 60000)
      const seconds = Math.floor((frame.timestamp % 60000) / 1000)
      const timeStr = `${minute}:${seconds.toString().padStart(2, '0')}`
      
      frame.events?.forEach(event => {
        if (['CHAMPION_KILL', 'ELITE_MONSTER_KILL', 'BUILDING_KILL'].includes(event.type)) {
          let typeLabel = 'Evento'
          if (event.type === 'CHAMPION_KILL') typeLabel = 'Kill'
          else if (event.type === 'ELITE_MONSTER_KILL') {
            typeLabel = event.monsterSubType || event.monsterType || 'Objetivo'
          }
          else if (event.type === 'BUILDING_KILL') typeLabel = 'Torre'
          
          keyEvents.push({
            time: timeStr,
            type: event.type,
            typeLabel
          })
        }
      })
    })
    
    return keyEvents.slice(0, 12)
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
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
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

        <div style={{ padding: '24px' }}>
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
                  {[0,1,2,3,4,5,6].map(idx => {
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
              ) : keyEvents.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {keyEvents.map((event, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      background: 'white',
                      borderRadius: '6px',
                      fontSize: '12px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <span style={{ fontWeight: 600, color: '#64748b' }}>{event.time}</span>
                      {getEventIcon(event.type)}
                      <span style={{ color: '#1e293b' }}>{event.typeLabel}</span>
                    </div>
                  ))}
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
