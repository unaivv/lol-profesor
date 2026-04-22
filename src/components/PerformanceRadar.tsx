import { useMemo } from 'react'
import { DetailedMatch } from '../types/api'

interface PerformanceRadarProps {
  matches: DetailedMatch[]
  playerPuuid?: string
}

interface RadarMetric {
  key: string
  label: string
  icon: string
  value: number
}

const calculateMetrics = (matches: DetailedMatch[], playerPuuid?: string): RadarMetric[] => {
  if (!matches || matches.length === 0) {
    return [
      { key: 'farm', label: 'Farm', icon: '🌾', value: 0 },
      { key: 'survival', label: 'Supervivencia', icon: '🛡️', value: 0 },
      { key: 'vision', label: 'Visión', icon: '👁️', value: 0 },
      { key: 'damage', label: 'Daño', icon: '⚔️', value: 0 },
      { key: 'kda', label: 'KDA', icon: '🎯', value: 0 },
      { key: 'impact', label: 'Impacto', icon: '🏆', value: 0 }
    ]
  }

  const recentMatches = matches.slice(0, 20)
  let totalCsPerMin = 0
  let totalDeaths = 0
  let totalVisionScore = 0
  let totalDpm = 0
  let totalKda = 0
  let totalWins = 0
  let validMatchCount = 0

  recentMatches.forEach((match) => {
    const player = playerPuuid
      ? match.participants?.find(p => p.puuid === playerPuuid)
      : match.participants?.[0]
    
    if (!player) return

    validMatchCount++

    const minutes = player.timePlayed / 60
    const csPerMin = player.totalMinionsKilled / minutes
    const dpm = (player.damageDealtToChampions || 0) / minutes
    const visionScore = player.visionScore || 
                        ((player.visionWardsBoughtInGame || 0) * 2 + (player.wardsPlaced || 0) + (player.wardsKilled || 0) * 1.5)
    
    const killsAndAssists = player.kills + player.assists
    const kdaValue = player.deaths > 0 
      ? (killsAndAssists / player.deaths) * 10 
      : killsAndAssists * 2

    totalCsPerMin += csPerMin
    totalDeaths += player.deaths
    totalVisionScore += visionScore
    totalDpm += dpm
    totalKda += kdaValue
    if (player.win) totalWins++
  })

  const count = validMatchCount
  const avgCsPerMin = totalCsPerMin / count
  const avgDeaths = totalDeaths / count
  const avgVisionScore = totalVisionScore / count
  const avgDpm = totalDpm / count
  const avgKda = totalKda / count
  const winRate = (totalWins / count) * 100

  const farmScore = Math.min(100, (avgCsPerMin / 10) * 100)
  const survivalScore = Math.min(100, Math.max(0, (10 - avgDeaths) * 10))
  const visionScoreCalc = Math.min(100, (avgVisionScore / 30) * 100)
  const damageScore = Math.min(100, (avgDpm / 1500) * 100)
  const kdaScore = Math.min(100, (avgKda / 50) * 100)
  
  const impactScore = winRate

  return [
    { key: 'farm', label: 'Farm', icon: '🌾', value: Math.round(farmScore) },
    { key: 'survival', label: 'Supervivencia', icon: '🛡️', value: Math.round(survivalScore) },
    { key: 'vision', label: 'Visión', icon: '👁️', value: Math.round(visionScoreCalc) },
    { key: 'damage', label: 'Daño', icon: '⚔️', value: Math.round(damageScore) },
    { key: 'kda', label: 'KDA', icon: '🎯', value: Math.round(kdaScore) },
    { key: 'impact', label: 'Impacto', icon: '🏆', value: Math.round(impactScore) }
  ]
}

const RadarChart = ({ metrics }: { metrics: RadarMetric[] }) => {
  const size = 200
  const center = size / 2
  const radius = 80
  const levels = 5

  const angleSlice = (Math.PI * 2) / metrics.length

  const getPoint = (index: number, value: number): string => {
    const angle = angleSlice * index - Math.PI / 2
    const r = (value / 100) * radius
    const x = center + r * Math.cos(angle)
    const y = center + r * Math.sin(angle)
    return `${x},${y}`
  }

const getLabelPoint = (index: number): { x: number; y: number } => {
    const angle = angleSlice * index - Math.PI / 2
    const r = radius + 22
    let x = center + r * Math.cos(angle)
    let y = center + r * Math.sin(angle)
    
    // Ajustar posición para que no se salga del SVG
    const padding = 5
    if (x < padding) x = padding
    if (x > size - padding) x = size - padding
    if (y < padding) y = padding
    if (y > size - padding) y = size - padding
    
    return { x, y }
  }

  const pathD = `${getPoint(0, metrics[0].value)} ${getPoint(1, metrics[1].value)} ${getPoint(2, metrics[2].value)} ${getPoint(3, metrics[3].value)} ${getPoint(4, metrics[4].value)} ${getPoint(5, metrics[5].value)} ${getPoint(0, metrics[0].value)}`

  const gridLines = Array.from({ length: levels }, (_, i) => {
    const levelValue = (i + 1) * 20
    const points = metrics
      .map((_, j) => getPoint(j, levelValue))
      .join(' ')
    return points
  })

  const getColor = (value: number): string => {
    if (value >= 70) return '#10b981'
    if (value >= 40) return '#3b82f6'
    return '#f59e0b'
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
          <stop offset="100%" stopColor="rgba(139, 92, 246, 0.4)" />
        </linearGradient>
      </defs>

      {/* Fill del radar - se dibuja primero */}
      <polygon
        points={pathD}
        fill="#3b82f6"
        fillOpacity={0.3}
      />
      
      {/* Border del radar */}
      <polygon
        points={pathD}
        fill="none"
        stroke="#2563eb"
        strokeWidth={2}
      />
      {gridLines.map((points, i) => (
        <polygon
          key={i}
          points={points}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="1"
        />
      ))}

      {metrics.map((_, i) => {
        const angle = angleSlice * i - Math.PI / 2
        const x2 = center + radius * Math.cos(angle)
        const y2 = center + radius * Math.sin(angle)
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={x2}
            y2={y2}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        )
      })}

      {/* Border del radar */}
      <polygon
        points={pathD}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
      />

      {/* Puntos en los vértices */}
      {metrics.map((m, i) => {
        const [x, y] = getPoint(i, m.value).split(',').map(Number)
        return (
          <g key={m.key}>
            <circle
              cx={x}
              cy={y}
              r="4"
              fill={getColor(m.value)}
              stroke="white"
              strokeWidth="2"
            />
          </g>
        )
      })}

{metrics.map((m, i) => {
        const labelPos = getLabelPoint(i)
        return (
          <text
            key={m.key}
            x={labelPos.x}
            y={labelPos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fontWeight="500"
            fill="#475569"
          >
            {m.icon} {m.value}
          </text>
        )
      })}
    </svg>
  )
}

export function PerformanceRadar({ matches, playerPuuid }: PerformanceRadarProps) {
  const metrics = useMemo(() => calculateMetrics(matches, playerPuuid), [matches, playerPuuid])

  const overallScore = Math.round(
    metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length
  )

  return (
    <div style={{
      padding: '20px',
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: 700, 
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>📊</span> Rendimiento (Últimas 20)
        </h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          background: overallScore >= 60 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          borderRadius: '20px'
        }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: overallScore >= 60 ? '#10b981' : '#f59e0b' }}>
            {overallScore}
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>/100</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <RadarChart metrics={metrics} />
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '8px',
        marginTop: '16px'
      }}>
        {metrics.map(m => (
          <div key={m.key} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 8px',
            background: '#f8fafc',
            borderRadius: '8px'
          }}>
            <span style={{ fontSize: '12px' }}>{m.icon}</span>
            <div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>{m.label}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
                {m.value}/100
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}