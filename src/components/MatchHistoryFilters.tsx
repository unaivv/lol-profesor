import { useEffect, useMemo, useState } from 'react'
import { DetailedMatch } from '../types/api'

interface MatchHistoryFiltersProps {
  matches: DetailedMatch[]
  playerPuuid?: string
  onFilterChange: (filtered: DetailedMatch[]) => void
}

const QUEUE_LABELS: Record<number, string> = {
  420: 'Ranked Solo/Duo',
  440: 'Ranked Flex',
  400: 'Normal',
  430: 'Normal',
  450: 'ARAM',
}

export function getQueueLabel(queueId?: number): string {
  if (queueId === undefined || queueId === null) return 'Otro'
  return QUEUE_LABELS[queueId] ?? 'Otro'
}

export function getPlayerOutcome(match: DetailedMatch, playerPuuid?: string): boolean | null {
  if (!match.participants?.length) return null
  const p = playerPuuid
    ? match.participants.find((x) => x.puuid === playerPuuid)
    : match.participants[0]
  return p?.win ?? null
}

export function getPlayerChampion(match: DetailedMatch, playerPuuid?: string): string | null {
  if (!match.participants?.length) return null
  const p = playerPuuid
    ? match.participants.find((x) => x.puuid === playerPuuid)
    : match.participants[0]
  return p?.championName ?? null
}

export type OutcomeFilter = 'all' | 'win' | 'loss'

export function filterMatches(
  matches: DetailedMatch[],
  outcome: OutcomeFilter,
  champion: string,
  queue: string,
  playerPuuid?: string,
): DetailedMatch[] {
  return matches.filter((m) => {
    if (outcome !== 'all') {
      const win = getPlayerOutcome(m, playerPuuid)
      if (win === null) return false
      if (outcome === 'win' && !win) return false
      if (outcome === 'loss' && win) return false
    }
    if (champion !== 'all') {
      if (getPlayerChampion(m, playerPuuid) !== champion) return false
    }
    if (queue !== 'all') {
      const label = getQueueLabel(m.queueId)
      if (label !== queue) return false
    }
    return true
  })
}

export function MatchHistoryFilters({ matches, playerPuuid, onFilterChange }: MatchHistoryFiltersProps) {
  const [outcome, setOutcome] = useState<OutcomeFilter>('all')
  const [champion, setChampion] = useState<string>('all')
  const [queue, setQueue] = useState<string>('all')

  // Reset filters when the match list itself changes (new data loaded)
  useEffect(() => {
    setOutcome('all')
    setChampion('all')
    setQueue('all')
  }, [matches])

  const uniqueChampions = useMemo(() => {
    const names = new Set<string>()
    for (const m of matches) {
      const name = getPlayerChampion(m, playerPuuid)
      if (name) names.add(name)
    }
    return Array.from(names).sort()
  }, [matches, playerPuuid])

  const uniqueQueues = useMemo(() => {
    const ids = new Set<number>()
    for (const m of matches) {
      if (m.queueId !== undefined && m.queueId !== null) ids.add(m.queueId)
    }
    // Group 400+430 as "Normal", keep others distinct
    const result: Array<{ id: string; label: string }> = []
    const seen = new Set<string>()
    for (const id of Array.from(ids).sort((a, b) => a - b)) {
      const label = getQueueLabel(id)
      if (!seen.has(label)) {
        seen.add(label)
        // Use the first id we see for this label as the key
        result.push({ id: String(id), label })
      }
    }
    return result
  }, [matches])

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      // Outcome filter
      if (outcome !== 'all') {
        const win = getPlayerOutcome(m, playerPuuid)
        if (win === null) return false
        if (outcome === 'win' && !win) return false
        if (outcome === 'loss' && win) return false
      }
      // Champion filter
      if (champion !== 'all') {
        if (getPlayerChampion(m, playerPuuid) !== champion) return false
      }
      // Queue filter
      if (queue !== 'all') {
        const label = getQueueLabel(m.queueId)
        if (label !== queue) return false
      }
      return true
    })
  }, [matches, outcome, champion, queue, playerPuuid])

  useEffect(() => {
    onFilterChange(filtered)
  }, [filtered, onFilterChange])

  const isFiltering = outcome !== 'all' || champion !== 'all' || queue !== 'all'

  const selectStyle: React.CSSProperties = {
    appearance: 'none',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontSize: '12px',
    fontWeight: 500,
    padding: '6px 28px 6px 10px',
    cursor: 'pointer',
    outline: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
  }

  const outcomeButtons: Array<{ value: OutcomeFilter; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'win', label: 'Victorias' },
    { value: 'loss', label: 'Derrotas' },
  ]

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 16px',
      borderBottom: '1px solid #1e293b',
      background: '#0f172a',
    }}>
      {/* Outcome segmented control */}
      <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
        {outcomeButtons.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setOutcome(value)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: outcome === value ? '#2563eb' : '#1e293b',
              color: outcome === value ? '#ffffff' : '#94a3b8',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Champion select */}
      <select
        value={champion}
        onChange={(e) => setChampion(e.target.value)}
        style={selectStyle}
      >
        <option value="all">Todos los campeones</option>
        {uniqueChampions.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>

      {/* Queue select */}
      <select
        value={queue}
        onChange={(e) => setQueue(e.target.value)}
        style={selectStyle}
      >
        <option value="all">Todas las colas</option>
        {uniqueQueues.map(({ id, label }) => (
          <option key={id} value={label}>{label}</option>
        ))}
      </select>

      {/* Match count */}
      <div style={{
        marginLeft: 'auto',
        fontSize: '12px',
        color: isFiltering ? '#f1f5f9' : '#475569',
        fontWeight: isFiltering ? 600 : 400,
        whiteSpace: 'nowrap',
      }}>
        {isFiltering
          ? `${filtered.length} de ${matches.length} partidas`
          : `${matches.length} partidas`
        }
      </div>
    </div>
  )
}
