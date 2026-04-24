import { useState, useEffect, useRef } from 'react'
import { DetailedMatch, MatchTimeline } from '../../types/api'
import { Zap } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'

interface TimelineProps {
  gameId: string
  match: DetailedMatch
}

interface TimelineEvent {
  id: string
  time: string
  seconds: number
  type: string
  typeLabel: string
  killer?: string
  team: 'blue' | 'red'
}

const formatTimestamp = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function Timeline({ gameId, match }: TimelineProps) {
  const [timeline, setTimeline] = useState<MatchTimeline | null>(null)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineError, setTimelineError] = useState<string | null>(null)
  const [activeEventTime, setActiveEventTime] = useState<string | null>(null)
  const blueListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchTimeline = async () => {
      setTimelineLoading(true)
      setTimelineError(null)
      try {
        const data = await invoke<MatchTimeline>('get_match_timeline', { matchId: gameId })
        setTimeline(data)
      } catch {
        setTimelineError('Error al cargar timeline')
      } finally {
        setTimelineLoading(false)
      }
    }
    fetchTimeline()
  }, [gameId])

  const extractKeyEvents = () => {
    if (!timeline?.frames || !match?.participants) return { blue: [] as TimelineEvent[], red: [] as TimelineEvent[], merged: [] as Array<{ id: string; time: string; seconds: number; blue?: TimelineEvent; red?: TimelineEvent }> }

    // Create participant map with summonerName and teamId
    const participantMap = new Map(
      match.participants.map(p => [p.participantId, {
        summonerName: p.summonerName || p.championName || 'Unknown',
        teamId: p.teamId
      }])
    )

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
  const gameDuration = match.gameDuration

  if (timelineLoading) {
    return (
      <div style={{
        background: '#f8fafc',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #e2e8f0',
        minHeight: '160px'
      }}>
        <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
          Cargando timeline...
        </div>
      </div>
    )
  }

  if (timelineError) {
    return (
      <div style={{
        background: '#f8fafc',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #e2e8f0',
        minHeight: '160px'
      }}>
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
          {timelineError}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Timeline Visual con línea horizontal */}
      <div style={{
        background: '#f8fafc',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #e2e8f0',
        minHeight: '160px',
        overflowX: 'hidden',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Zap size={16} color="#8b5cf6" />
          Timeline - Línea de Tiempo
        </h3>

        {timeline?.frames ? (
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
                const timeMin = Math.floor((gameDuration * percent) / 100 / 60)
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
                const percent = gameDuration > 0 ? (event.seconds / gameDuration) * 100 : 0
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
                const percent = gameDuration > 0 ? (event.seconds / gameDuration) * 100 : 0
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
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                const isActive = activeEventTime === `${row.seconds}`
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
                )
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
  )
}