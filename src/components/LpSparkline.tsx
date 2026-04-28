import { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { getRankColor } from './RankedComparisonCard/RankedComparisonCard.utils'

interface LpSnapshot {
  tier: string
  rank: string
  lp: number
  recordedAt: number
}

interface LpSparklineProps {
  puuid: string
  queueType?: string
  current?: { tier: string; rank: string; lp: number }
}

const TIER_BASE: Record<string, number> = {
  IRON: 0, BRONZE: 400, SILVER: 800, GOLD: 1200,
  PLATINUM: 1600, EMERALD: 2000, DIAMOND: 2400,
  MASTER: 2800, GRANDMASTER: 2800, CHALLENGER: 2800,
}
const RANK_OFFSET: Record<string, number> = { IV: 0, III: 100, II: 200, I: 300 }

const toContinuousLp = (tier: string, rank: string, lp: number): number =>
  (TIER_BASE[tier] ?? 0) + (RANK_OFFSET[rank] ?? 0) + lp

const formatDate = (ts: number): string =>
  new Date(ts * 1000).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

const tierLabel = (tier: string, rank: string, lp: number): string => {
  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier)) return `${tier} ${lp} LP`
  return `${tier} ${rank} · ${lp} LP`
}

export function LpSparkline({ puuid, queueType = 'RANKED_SOLO_5x5', current }: LpSparklineProps) {
  const [data, setData] = useState<LpSnapshot[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(300)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; snap: LpSnapshot } | null>(null)

  useEffect(() => {
    invoke<LpSnapshot[]>('get_lp_history', { puuid, queueType, limit: 30 })
      .then(setData)
      .catch(() => setData([]))
  }, [puuid, queueType])

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => setWidth(entries[0].contentRect.width))
    ro.observe(containerRef.current)
    setWidth(containerRef.current.offsetWidth)
    return () => ro.disconnect()
  }, [])

  // If no historical data but we have current LP, add it as starting point
  let displayData = data
  if (data.length === 0 && current) {
    const now = Math.floor(Date.now() / 1000)
    displayData = [{ tier: current.tier, rank: current.rank, lp: current.lp, recordedAt: now }]
  }

  const H = 56
  const PAD = { t: 6, b: 6, l: 4, r: 4 }
  const W = width
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  const displayValues = displayData.map(d => toContinuousLp(d.tier, d.rank, d.lp))
  const minV = Math.min(...displayValues)
  const maxV = Math.max(...displayValues)
  const range = maxV - minV || 1

  const count = Math.max(displayData.length, 1)
  const px = (i: number) => PAD.l + (i / (count - 1 || 1)) * innerW
  const py = (v: number) => PAD.t + innerH - ((v - minV) / range) * innerH

  const points = displayData.map((d, i) => ({ x: px(i), y: py(displayValues[i]), snap: d }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${(PAD.t + innerH).toFixed(1)} L${PAD.l},${(PAD.t + innerH).toFixed(1)} Z`

  // Use tier color for line, points and tooltip
  const tierColor = current ? getRankColor(current.tier) : '#3B82F6'
  const areaColor = `${tierColor}20`

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <svg
        width={W}
        height={H}
        style={{ display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setTooltip(null)}
      >
        <path d={areaPath} fill={areaColor} />
        <path d={linePath} fill="none" stroke={tierColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={2.5} fill={tierColor} opacity={tooltip?.snap === p.snap ? 1 : 0.5} />
            <rect x={p.x - 10} y={PAD.t} width={20} height={innerH} fill="transparent"
              onMouseEnter={() => setTooltip({ x: p.x, y: p.y, snap: p.snap })} />
          </g>
        ))}
      </svg>

      {tooltip && (
        <div style={{
          position: 'absolute',
          bottom: H - tooltip.y + 8,
          left: Math.min(Math.max(tooltip.x - 56, 0), W - 120),
          background: 'rgba(15,23,42,0.92)', color: '#f1f5f9',
          borderRadius: '6px', padding: '5px 9px', fontSize: '11px',
          fontWeight: 500, pointerEvents: 'none', whiteSpace: 'nowrap',
          zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          <div style={{ color: tierColor, fontWeight: 700 }}>{tierLabel(tooltip.snap.tier, tooltip.snap.rank, tooltip.snap.lp)}</div>
          <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '1px' }}>{formatDate(tooltip.snap.recordedAt)}</div>
        </div>
      )}
    </div>
  )
}