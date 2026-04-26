import { useState, useEffect } from 'react'
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, TrendingUp, Sword, Eye, Target } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { PerformanceMetrics } from '../PerformanceRadar'

interface Insight {
  type: 'positive' | 'negative' | 'improvement'
  title: string
  description: string
  priority: number
}

interface PlayerStats {
  kda: string
  damage: number
  visionScore: number
  cs: number
}

interface AIAnalysisResult {
  summary: string
  insights: Insight[]
  playerStats: PlayerStats
}

interface InsightsProps {
  matchGameId: string
  playerPuuid?: string
  recentMetrics?: PerformanceMetrics | null
}

const INSIGHT_CONFIG = {
  positive:    { Icon: CheckCircle2, color: '#22c55e', bg: '#dcfce7', border: '#22c55e' },
  negative:    { Icon: AlertTriangle, color: '#ef4444', bg: '#fee2e2', border: '#ef4444' },
  improvement: { Icon: TrendingUp,   color: '#f59e0b', bg: '#fef3c7', border: '#f59e0b' },
}

const fmt = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)

export default function Insights({ matchGameId, playerPuuid, recentMetrics }: InsightsProps) {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (!playerPuuid) return
    runAnalysis()
  }, [matchGameId, playerPuuid])

  const runAnalysis = async () => {
    if (loading) return
    setLoading(true)
    setError(null)
    setCollapsed(false)

    try {
      const data = await invoke<AIAnalysisResult>('analyze_match', {
        matchId: matchGameId,
        puuid: playerPuuid,
        recentMetrics: recentMetrics ?? null,
      })
      setAnalysis(data)
    } catch {
      setError('No se pudo analizar la partida.')
    } finally {
      setLoading(false)
    }
  }

  const sorted = analysis
    ? [...analysis.insights].sort((a, b) => a.priority - b.priority)
    : []

  return (
    <div style={{ marginTop: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Sparkles size={18} color="#8b5cf6" />
          Análisis IA
        </h4>
        {analysis && (
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
          >
            {collapsed ? 'Mostrar' : 'Ocultar'}
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '20px', background: 'var(--bg-card-subtle)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <Loader2 size={18} color="#8b5cf6" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Analizando partida con IA...</span>
        </div>
      )}

      {/* Error + retry */}
      {error && !loading && (
        <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
          <p style={{ fontSize: '14px', color: '#dc2626', marginBottom: '10px' }}>{error}</p>
          <button
            onClick={runAnalysis}
            style={{ fontSize: '13px', fontWeight: 600, color: '#8b5cf6', background: 'none', border: '1px solid #8b5cf6', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer' }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Results */}
      {analysis && !collapsed && !loading && (
        <div style={{ background: 'var(--bg-card-subtle)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>

          {/* Player stats bar */}
          <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border-color)' }}>
            {[
              { icon: Sword, label: 'KDA', value: analysis.playerStats.kda },
              { icon: Target, label: 'Daño', value: fmt(analysis.playerStats.damage) },
              { icon: Target, label: 'CS', value: String(analysis.playerStats.cs) },
              { icon: Eye, label: 'Visión', value: String(analysis.playerStats.visionScore) },
            ].map(({ icon: Icon, label, value }, i, arr) => (
              <div key={label} style={{ flex: 1, padding: '12px 8px', textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                  <Icon size={11} />
                  {label}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div style={{ padding: '14px 16px', borderBottom: sorted.length > 0 ? '1px solid var(--border-color)' : 'none' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {analysis.summary}
            </p>
          </div>

          {/* Insights */}
          {sorted.length > 0 && (
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sorted.map((insight, idx) => {
                const cfg = INSIGHT_CONFIG[insight.type] ?? INSIGHT_CONFIG.improvement
                const Icon = cfg.Icon
                return (
                  <div key={idx} style={{ padding: '10px 12px', background: cfg.bg, borderRadius: '8px', borderLeft: `3px solid ${cfg.border}`, display: 'flex', gap: '10px' }}>
                    <Icon size={16} color={cfg.color} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b', marginBottom: '2px' }}>{insight.title}</div>
                      <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>{insight.description}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
