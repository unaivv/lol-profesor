import { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { getRankColor } from './RankedComparisonCard/RankedComparisonCard.utils'

interface LpSnapshot {
  tier: string
  rank: string
  lp: number
  recordedAt: number
}

type QueueType = 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR'

interface RankedProgressProps {
  puuid: string
  queueType?: QueueType
}

// Mirror of LpSparkline internals — shared logic
const TIER_BASE: Record<string, number> = {
  IRON: 0, BRONZE: 400, SILVER: 800, GOLD: 1200,
  PLATINUM: 1600, EMERALD: 2000, DIAMOND: 2400,
  MASTER: 2800, GRANDMASTER: 2800, CHALLENGER: 2800,
}
const RANK_OFFSET: Record<string, number> = { IV: 0, III: 100, II: 200, I: 300 }

const toContinuousLp = (tier: string, rank: string, lp: number): number =>
  (TIER_BASE[tier] ?? 0) + (RANK_OFFSET[rank] ?? 0) + lp

const tierLabel = (tier: string, rank: string, lp: number): string => {
  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier)) return `${tier} ${lp} LP`
  return `${tier} ${rank} · ${lp} LP`
}

const formatDate = (ts: number): string =>
  new Date(ts * 1000).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

// Session stats derived from LP history (sorted newest-first from backend)
interface SessionStats {
  lpToday: number
  streak: { count: number; direction: 'win' | 'loss' | 'none' }
  gamesToday: number
}

function computeSessionStats(snapshots: LpSnapshot[]): SessionStats {
  const nowSec = Date.now() / 1000
  const cutoff = nowSec - 86400 // 24h

  // Snapshots sorted newest-first from backend
  const todaySnaps = snapshots.filter(s => s.recordedAt > cutoff)

  const gamesToday = todaySnaps.length

  // LP today: difference between most recent and oldest-in-window snapshot on continuous scale
  let lpToday = 0
  if (todaySnaps.length >= 2) {
    const newest = toContinuousLp(todaySnaps[0].tier, todaySnaps[0].rank, todaySnaps[0].lp)
    const oldest = toContinuousLp(
      todaySnaps[todaySnaps.length - 1].tier,
      todaySnaps[todaySnaps.length - 1].rank,
      todaySnaps[todaySnaps.length - 1].lp,
    )
    lpToday = newest - oldest
  }

  // Streak: walk newest-first, count consecutive same-direction LP changes
  let streakCount = 0
  let streakDirection: 'win' | 'loss' | 'none' = 'none'

  for (let i = 0; i < snapshots.length - 1; i++) {
    const curr = toContinuousLp(snapshots[i].tier, snapshots[i].rank, snapshots[i].lp)
    const prev = toContinuousLp(snapshots[i + 1].tier, snapshots[i + 1].rank, snapshots[i + 1].lp)
    const diff = curr - prev
    if (diff === 0) continue // same LP — skip (could be a manual snapshot, no game played)

    const dir: 'win' | 'loss' = diff > 0 ? 'win' : 'loss'

    if (streakDirection === 'none') {
      streakDirection = dir
      streakCount = 1
    } else if (dir === streakDirection) {
      streakCount++
    } else {
      break
    }
  }

  return { lpToday, streak: { count: streakCount, direction: streakDirection }, gamesToday }
}

// Full-size LP chart (reuses the same drawing logic as LpSparkline but taller)
function LpChart({ data, tierColor }: { data: LpSnapshot[]; tierColor: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(400)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; snap: LpSnapshot } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => setWidth(entries[0].contentRect.width))
    ro.observe(containerRef.current)
    setWidth(containerRef.current.offsetWidth)
    return () => ro.disconnect()
  }, [])

  if (data.length === 0) return null

  const H = 200
  const PAD = { t: 16, b: 24, l: 8, r: 8 }
  const W = width
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  const values = data.map(d => toContinuousLp(d.tier, d.rank, d.lp))
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const range = maxV - minV || 1

  const count = Math.max(data.length, 1)
  const px = (i: number) => PAD.l + (i / (count - 1 || 1)) * innerW
  const py = (v: number) => PAD.t + innerH - ((v - minV) / range) * innerH

  const points = data.map((d, i) => ({ x: px(i), y: py(values[i]), snap: d }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${(PAD.t + innerH).toFixed(1)} L${PAD.l},${(PAD.t + innerH).toFixed(1)} Z`
  const areaColor = `${tierColor}25`

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <svg
        width={W}
        height={H}
        style={{ display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setTooltip(null)}
      >
        <path d={areaPath} fill={areaColor} />
        <path d={linePath} fill="none" stroke={tierColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill={tierColor} opacity={tooltip?.snap === p.snap ? 1 : 0.6} />
            <rect
              x={p.x - 12} y={PAD.t} width={24} height={innerH}
              fill="transparent"
              onMouseEnter={() => setTooltip({ x: p.x, y: p.y, snap: p.snap })}
            />
          </g>
        ))}
      </svg>

      {tooltip && (
        <div style={{
          position: 'absolute',
          bottom: H - tooltip.y + 10,
          left: Math.min(Math.max(tooltip.x - 60, 0), W - 130),
          background: 'rgba(15,23,42,0.95)',
          color: '#f1f5f9',
          borderRadius: '6px',
          padding: '6px 10px',
          fontSize: '11px',
          fontWeight: 500,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ color: tierColor, fontWeight: 700 }}>
            {tierLabel(tooltip.snap.tier, tooltip.snap.rank, tooltip.snap.lp)}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '1px' }}>
            {formatDate(tooltip.snap.recordedAt)}
          </div>
        </div>
      )}
    </div>
  )
}

// Stat mini-card
function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div style={{
      flex: 1,
      background: 'rgba(30,41,59,0.6)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '10px',
      padding: '14px 12px',
      textAlign: 'center',
    }}>
      <div style={{ color, fontSize: '20px', fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ color: '#64748b', fontSize: '11px', marginTop: '5px', fontWeight: 500 }}>{label}</div>
    </div>
  )
}

export function RankedProgress({ puuid }: RankedProgressProps) {
  const [queue, setQueue] = useState<QueueType>('RANKED_SOLO_5x5')
  const [snapshots, setSnapshots] = useState<LpSnapshot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    invoke<LpSnapshot[]>('get_lp_history', { puuid, queueType: queue, limit: 100 })
      .then(data => setSnapshots(data))
      .catch(() => setSnapshots([]))
      .finally(() => setLoading(false))
  }, [puuid, queue])

  const stats = computeSessionStats(snapshots)
  const latestSnap = snapshots[0]
  const tierColor = latestSnap ? getRankColor(latestSnap.tier) : '#3B82F6'

  const lpTodayStr = stats.lpToday === 0
    ? '±0 LP'
    : stats.lpToday > 0
      ? `+${stats.lpToday} LP`
      : `${stats.lpToday} LP`
  const lpTodayColor = stats.lpToday > 0 ? '#4ade80' : stats.lpToday < 0 ? '#f87171' : '#94a3b8'

  const streakStr = stats.streak.direction === 'none' || stats.streak.count === 0
    ? '—'
    : stats.streak.direction === 'win'
      ? `${stats.streak.count}W`
      : `${stats.streak.count}L`
  const streakColor = stats.streak.direction === 'win'
    ? '#4ade80'
    : stats.streak.direction === 'loss'
      ? '#f87171'
      : '#94a3b8'

  // Queue toggle pill style
  const pillBase: React.CSSProperties = {
    padding: '5px 14px',
    borderRadius: '20px',
    border: 'none',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
  }
  const pillActive: React.CSSProperties = { background: '#2563eb', color: '#fff' }
  const pillInactive: React.CSSProperties = { background: 'rgba(30,41,59,0.7)', color: '#64748b' }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
      {/* Header + queue toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
          Progreso Ranked
        </h2>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(15,23,42,0.4)', padding: '3px', borderRadius: '24px' }}>
          <button
            style={{ ...pillBase, ...(queue === 'RANKED_SOLO_5x5' ? pillActive : pillInactive) }}
            onClick={() => setQueue('RANKED_SOLO_5x5')}
          >
            Solo/Duo
          </button>
          <button
            style={{ ...pillBase, ...(queue === 'RANKED_FLEX_SR' ? pillActive : pillInactive) }}
            onClick={() => setQueue('RANKED_FLEX_SR')}
          >
            Flex
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Skeleton stats bar */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{ flex: 1, height: '68px', borderRadius: '10px', background: 'rgba(30,41,59,0.5)', animation: 'pulse 1.5s ease-in-out infinite' }}
              />
            ))}
          </div>
          {/* Skeleton chart */}
          <div style={{ height: '200px', borderRadius: '10px', background: 'rgba(30,41,59,0.5)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      ) : snapshots.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#475569' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>📊</div>
          <p style={{ fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Sin historial de LP</p>
          <p style={{ fontSize: '13px', color: '#475569' }}>
            Jugá partidas clasificatorias para ver tu progreso aquí.
          </p>
        </div>
      ) : (
        <>
          {/* Session stats bar */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <StatCard label="Hoy" value={lpTodayStr} color={lpTodayColor} />
            <StatCard label="Racha" value={streakStr} color={streakColor} />
            <StatCard label="Partidas hoy" value={stats.gamesToday.toString()} color="#94a3b8" />
          </div>

          {/* LP History chart */}
          <div style={{
            background: 'rgba(15,23,42,0.3)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '12px',
            padding: '12px 8px 8px',
          }}>
            <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '8px' }}>
              Historial de LP
            </div>
            <LpChart data={[...snapshots].reverse()} tierColor={tierColor} />
          </div>
        </>
      )}
    </div>
  )
}
