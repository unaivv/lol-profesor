import { useState, useEffect } from 'react'
import { MatchTimeline } from '../../types/api'
import { Skull, Shield, Target, Zap } from 'lucide-react'

interface TimelineProps {
  gameId: string
}

interface TEvent {
  id: string
  time: string
  seconds: number
  type: string
  typeLabel: string
  killer: string
  team: 'blue' | 'red'
}

export function Timeline({ gameId }: TimelineProps) {
  const [timeline, setTimeline] = useState<MatchTimeline | null>(null)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineError, setTimelineError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTimeline = async () => {
      setTimelineLoading(true)
      setTimelineError(null)
      try {
        const response = await fetch(`/api/match/${gameId}/timeline`)
        if (response.ok) {
          const res = await response.json()
          setTimeline(res.data)
        } else {
          setTimelineError('Timeline no disponible')
        }
      } catch {
        setTimelineError('Error al cargar timeline')
      } finally {
        setTimelineLoading(false)
      }
    }
    fetchTimeline()
  }, [gameId])

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'CHAMPION_KILL':
        return <Skull size={12} />
      case 'ELITE_MONSTER_KILL':
        return <Shield size={12} style={{ color: '#f97316' }} />
      case 'BUILDING_KILL':
        return <Target size={12} style={{ color: '#ef4444' }} />
      case 'WARD_PLACED':
        return <Target size={12} style={{ color: '#06b6d4' }} />
      case 'WARD_KILL':
        return <Target size={12} style={{ color: '#f59e0b' }} />
      default:
        return <Target size={12} />
    }
  }

  const extractKeyEvents = () => {
    if (!timeline?.frames) return { blue: [] as TEvent[], red: [] as TEvent[] }

    const blueEvents: TEvent[] = []
    const redEvents: TEvent[] = []

    for (const frame of timeline.frames) {
      const timestamp = frame.timestamp
      const eventSeconds = Math.floor(timestamp / 1000)
      const timeStr = `${Math.floor(eventSeconds / 60)}:${(eventSeconds % 60).toString().padStart(2, '0')}`

      for (const event of frame.events || []) {
        const eventType = event.type
        const killerId = event.killerId
        const victimId = event.victimId
        const monsterType = event.monsterType
        const buildingType = event.buildingType

        if (eventType === 'CHAMPION_KILL' && killerId != null) {
          const ev: TEvent = {
            id: `kill-${timestamp}-${killerId}-${victimId}`,
            time: timeStr,
            seconds: eventSeconds,
            type: eventType,
            typeLabel: `Kill`,
            killer: `P${killerId}`,
            team: killerId <= 5 ? 'blue' : 'red'
          }
          if (ev.team === 'blue') blueEvents.push(ev)
          else redEvents.push(ev)
        } else if (eventType === 'ELITE_MONSTER_KILL' && monsterType) {
          const ev: TEvent = {
            id: `monster-${timestamp}-${monsterType}`,
            time: timeStr,
            seconds: eventSeconds,
            type: eventType,
            typeLabel: monsterType,
            killer: killerId ? `P${killerId}` : 'Unknown',
            team: killerId && killerId <= 5 ? 'blue' : 'red'
          }
          if (ev.team === 'blue') blueEvents.push(ev)
          else if (ev.team === 'red') redEvents.push(ev)
        } else if (eventType === 'BUILDING_KILL' && buildingType) {
          const ev: TEvent = {
            id: `build-${timestamp}-${buildingType}`,
            time: timeStr,
            seconds: eventSeconds,
            type: eventType,
            typeLabel: buildingType,
            killer: killerId ? `P${killerId}` : 'Unknown',
            team: killerId && killerId <= 5 ? 'blue' : 'red'
          }
          if (ev.team === 'blue') blueEvents.push(ev)
          else if (ev.team === 'red') redEvents.push(ev)
        }
      }
    }

    const sortEvents = (events: TEvent[]) => events.sort((a, b) => a.seconds - b.seconds)
    const deduplicate = (events: TEvent[]) => {
      const seen = new Map<string, TEvent>()
      for (const event of events) {
        if (!seen.has(event.id)) {
          seen.set(event.id, event)
        }
      }
      return Array.from(seen.values())
    }

    return { blue: deduplicate(sortEvents(blueEvents)), red: deduplicate(sortEvents(redEvents)) }
  }

  const { blue: blueEvents, red: redEvents } = extractKeyEvents()

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
    <div style={{
      background: '#f8fafc',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid #e2e8f0',
      minHeight: '160px'
    }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Zap size={16} color="#8b5cf6" />
        Timeline
      </h3>
      
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#3b82f6', marginBottom: '8px' }}>Equipo Azul</h4>
        {blueEvents.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>Sin eventos</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {blueEvents.slice(0, 10).map((ev, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                background: '#eff6ff',
                borderRadius: '4px',
                fontSize: '11px',
                color: '#1e40af'
              }}>
                <span>{ev.time}</span>
                {getEventIcon(ev.type)}
                <span>{ev.typeLabel}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444', marginBottom: '8px' }}>Equipo Rojo</h4>
        {redEvents.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>Sin eventos</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {redEvents.slice(0, 10).map((ev, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                background: '#fef2f2',
                borderRadius: '4px',
                fontSize: '11px',
                color: '#991b1b'
              }}>
                <span>{ev.time}</span>
                {getEventIcon(ev.type)}
                <span>{ev.typeLabel}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}