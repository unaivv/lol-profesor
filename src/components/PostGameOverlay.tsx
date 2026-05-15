import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { X, Sparkles, Loader2, CheckCircle2, AlertTriangle, TrendingUp, Sword, Eye, Target } from 'lucide-react'
import { getChampionImageUrl, getChampionName } from '../utils/ddragon'
import { Match } from '../types/api'

interface Insight {
  type: 'positive' | 'negative' | 'improvement'
  title: string
  description: string
  priority: number
}

interface AIAnalysisResult {
  summary: string
  insights: Insight[]
  playerStats: {
    kda: string
    damage: number
    visionScore: number
    cs: number
  }
}

interface PostGameOverlayProps {
  puuid: string
  onDismiss: () => void
}

const INSIGHT_CONFIG = {
  positive:    { Icon: CheckCircle2,  color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: '#22c55e' },
  negative:    { Icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: '#ef4444' },
  improvement: { Icon: TrendingUp,    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: '#f59e0b' },
}

const fmt = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)

function StatCell({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; color?: string }>; label: string; value: string }) {
  return (
    <div className="flex-1 text-center py-3 px-2 border-r border-slate-700 last:border-r-0">
      <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 mb-1">
        <Icon size={11} />
        {label}
      </div>
      <div className="text-sm font-bold text-slate-100">{value}</div>
    </div>
  )
}

export function PostGameOverlay({ puuid, onDismiss }: PostGameOverlayProps) {
  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    invoke<Match[]>('get_match_history', { puuid, count: 1 })
      .then(matches => {
        if (cancelled) return
        setMatch(matches[0] ?? null)
        if (!matches[0]) setError(true)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [puuid])

  const handleAnalyze = async () => {
    if (!match) return
    setExpanded(true)
    setAnalysisLoading(true)
    setAnalysisError(null)
    try {
      const data = await invoke<AIAnalysisResult>('analyze_match', {
        matchId: match.gameId,
        puuid,
        recentMetrics: null,
      })
      setAnalysis(data)
    } catch {
      setAnalysisError('No se pudo analizar la partida.')
    } finally {
      setAnalysisLoading(false)
    }
  }

  const win = match?.win
  const championId = match?.championId ?? null
  const championName = championId != null ? getChampionName(championId) : null

  const kda = (match && match.kills != null && match.deaths != null && match.assists != null)
    ? `${match.kills}/${match.deaths}/${match.assists}`
    : '-'
  const cs = (match && match.totalMinionsKilled != null)
    ? String(match.totalMinionsKilled)
    : '-'
  const damage = match?.damageDealtToChampions ?? 0
  const vision = match?.visionScore ?? 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onDismiss() }}
    >
      <div className="w-full max-w-lg mx-4 mt-16 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">

        {/* Header */}
        <div className={`px-5 py-4 flex items-center justify-between border-b border-slate-700 ${win === true ? 'bg-emerald-900/40' : win === false ? 'bg-red-900/40' : 'bg-slate-800'}`}>
          <div className="flex items-center gap-3">
            {!loading && !error && championId != null && (
              <img
                src={getChampionImageUrl(championId)}
                alt={championName ?? ''}
                className="w-10 h-10 rounded-lg border border-slate-600"
              />
            )}
            <div>
              <div className="flex items-center gap-2">
                {!loading && !error && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${win === true ? 'bg-emerald-500 text-white' : win === false ? 'bg-red-500 text-white' : 'bg-slate-600 text-slate-200'}`}>
                    {win === true ? 'VICTORIA' : win === false ? 'DERROTA' : '—'}
                  </span>
                )}
                {championName && (
                  <span className="text-sm font-semibold text-slate-200">{championName}</span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Resumen de partida</p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700/60 hover:bg-slate-600 text-slate-300 transition-colors"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-3 animate-pulse">
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex-1 h-14 bg-slate-700 rounded-lg" />
                ))}
              </div>
              <div className="h-10 bg-slate-700 rounded-lg" />
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="text-center py-6">
              <p className="text-sm text-slate-400">No se encontró la partida.</p>
            </div>
          )}

          {/* Stats */}
          {!loading && !error && match && (
            <>
              <div className="flex rounded-xl border border-slate-700 overflow-hidden mb-4">
                <StatCell icon={Sword}   label="KDA"    value={kda} />
                <StatCell icon={Target}  label="Daño"   value={fmt(damage)} />
                <StatCell icon={Target}  label="CS"     value={cs} />
                <StatCell icon={Eye}     label="Visión" value={String(vision)} />
              </div>

              {/* Analyze button */}
              {!expanded && (
                <button
                  onClick={handleAnalyze}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
                >
                  <Sparkles size={15} />
                  Analizar partida
                </button>
              )}

              {/* Analysis section */}
              {expanded && (
                <div className="mt-2">
                  {analysisLoading && (
                    <div className="flex items-center gap-2 py-4 justify-center text-slate-400">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm">Analizando con IA...</span>
                    </div>
                  )}

                  {analysisError && !analysisLoading && (
                    <div className="py-3 text-center">
                      <p className="text-sm text-red-400 mb-2">{analysisError}</p>
                      <button
                        onClick={handleAnalyze}
                        className="text-xs text-violet-400 hover:underline"
                      >
                        Reintentar
                      </button>
                    </div>
                  )}

                  {analysis && !analysisLoading && (
                    <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden">
                      {/* AI stats bar */}
                      <div className="flex border-b border-slate-700">
                        {[
                          { icon: Sword,  label: 'KDA',    value: analysis.playerStats.kda },
                          { icon: Target, label: 'Daño',   value: fmt(analysis.playerStats.damage) },
                          { icon: Target, label: 'CS',     value: String(analysis.playerStats.cs) },
                          { icon: Eye,    label: 'Visión', value: String(analysis.playerStats.visionScore) },
                        ].map(({ icon: Icon, label, value }, i, arr) => (
                          <div
                            key={label}
                            className={`flex-1 py-2 px-1 text-center ${i < arr.length - 1 ? 'border-r border-slate-700' : ''}`}
                          >
                            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
                              <Icon size={10} />
                              {label}
                            </div>
                            <div className="text-xs font-bold text-slate-200">{value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Summary */}
                      <div className="p-3 border-b border-slate-700">
                        <p className="text-xs text-slate-300 leading-relaxed">{analysis.summary}</p>
                      </div>

                      {/* Insights */}
                      {analysis.insights.length > 0 && (
                        <div className="p-3 flex flex-col gap-2">
                          {[...analysis.insights]
                            .sort((a, b) => a.priority - b.priority)
                            .map((insight, idx) => {
                              const cfg = INSIGHT_CONFIG[insight.type] ?? INSIGHT_CONFIG.improvement
                              const Icon = cfg.Icon
                              return (
                                <div
                                  key={idx}
                                  className="flex gap-2 p-2.5 rounded-lg"
                                  style={{ background: cfg.bg, borderLeft: `3px solid ${cfg.border}` }}
                                >
                                  <Icon size={14} color={cfg.color} className="flex-shrink-0 mt-0.5" />
                                  <div>
                                    <div className="text-xs font-semibold text-slate-200 mb-0.5">{insight.title}</div>
                                    <div className="text-[11px] text-slate-400 leading-relaxed">{insight.description}</div>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 flex justify-end">
          <button
            onClick={onDismiss}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
