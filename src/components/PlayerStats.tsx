import { Trophy, Flame, Award, Shield } from 'lucide-react'
import { PlayerStatsProps, RankedStats, RankedStatsExtended } from '../types/api'

// Type guard para verificar si es RankedStatsExtended
function isRankedStatsExtended(stats: RankedStats | RankedStatsExtended | null | undefined): stats is RankedStatsExtended {
  return stats !== null && stats !== undefined && 'solo' in stats && 'flex' in stats
}

// Helper para obtener solo ranked stats
function getSoloRanked(stats: RankedStats | RankedStatsExtended | null | undefined): RankedStats | null {
  if (!stats) return null
  if (isRankedStatsExtended(stats)) return stats.solo
  return stats
}

const getRankGradient = (tier: string): string => {
  const gradients: Record<string, string> = {
    'IRON': 'from-amber-900 to-amber-700',
    'BRONZE': 'from-orange-700 to-orange-500',
    'SILVER': 'from-slate-400 to-slate-300',
    'GOLD': 'from-yellow-500 to-yellow-400',
    'PLATINUM': 'from-cyan-500 to-cyan-400',
    'EMERALD': 'from-emerald-500 to-emerald-400',
    'DIAMOND': 'from-blue-500 to-blue-400',
    'MASTER': 'from-purple-600 to-purple-500',
    'GRANDMASTER': 'from-red-600 to-red-500',
    'CHALLENGER': 'from-amber-500 to-yellow-400',
  }
  return gradients[tier] || 'from-slate-600 to-slate-500'
}

const getRankColor = (tier: string): string => {
  const colors: Record<string, string> = {
    'IRON': 'text-amber-700',
    'BRONZE': 'text-orange-600',
    'SILVER': 'text-slate-500',
    'GOLD': 'text-yellow-500',
    'PLATINUM': 'text-cyan-500',
    'EMERALD': 'text-emerald-500',
    'DIAMOND': 'text-blue-500',
    'MASTER': 'text-purple-500',
    'GRANDMASTER': 'text-red-500',
    'CHALLENGER': 'text-amber-500',
  }
  return colors[tier] || 'text-slate-500'
}

export function PlayerStats({ playerData, rankedStats }: PlayerStatsProps) {
  // Extraer solo ranked si es RankedStatsExtended
  const soloRanked = getSoloRanked(rankedStats)

  const winRate = soloRanked
    ? Math.round((soloRanked.wins / (soloRanked.wins + soloRanked.losses)) * 100)
    : 0
  const totalGames = soloRanked ? soloRanked.wins + soloRanked.losses : 0

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header Compacto */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-sm">Clasificatoria Solo/Duo</h2>
          </div>
          {soloRanked?.hotStreak && (
            <div className="flex items-center gap-1 text-xs text-orange-400">
              <Flame className="w-3.5 h-3.5" />
              <span>En racha</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        {soloRanked ? (
          <div className="space-y-4">
            {/* Rank Principal - Compacto */}
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getRankGradient(soloRanked.tier)} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                {soloRanked.tier[0]}
              </div>
              <div className="flex-1">
                <div className={`text-2xl font-bold ${getRankColor(soloRanked.tier)}`}>
                  {soloRanked.tier} {soloRanked.rank}
                </div>
                <div className="text-slate-500 text-sm">{soloRanked.leaguePoints} LP</div>
              </div>
            </div>

            {/* Stats Grid Compacto */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-emerald-50 rounded-lg p-2 text-center border border-emerald-100">
                <div className="text-emerald-600 text-xs font-medium mb-0.5">Victorias</div>
                <div className="text-lg font-bold text-emerald-700">{soloRanked.wins}</div>
              </div>
              <div className="bg-rose-50 rounded-lg p-2 text-center border border-rose-100">
                <div className="text-rose-600 text-xs font-medium mb-0.5">Derrotas</div>
                <div className="text-lg font-bold text-rose-700">{soloRanked.losses}</div>
              </div>
              <div className={`rounded-lg p-2 text-center border ${winRate >= 50 ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'}`}>
                <div className={`text-xs font-medium mb-0.5 ${winRate >= 50 ? 'text-emerald-600' : 'text-orange-600'}`}>Win Rate</div>
                <div className={`text-lg font-bold ${winRate >= 50 ? 'text-emerald-700' : 'text-orange-700'}`}>{winRate}%</div>
              </div>
            </div>

            {/* Barra de Progreso */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Progreso hacia siguiente división</span>
                <span className="font-semibold text-slate-700">{soloRanked.leaguePoints}/100 LP</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                  style={{ width: `${Math.min(soloRanked.leaguePoints, 100)}%` }}
                />
              </div>
            </div>

            {/* Badges Compactos */}
            <div className="flex flex-wrap gap-1.5">
              {soloRanked.veteran && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 border border-purple-200">
                  <Award className="w-3 h-3" />
                  Veterano
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                <Trophy className="w-3 h-3" />
                {totalGames} partidas
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Sin datos clasificatorios</h3>
            <p className="text-xs text-slate-500">Completa tus 10 partidas de colocación</p>
          </div>
        )}
      </div>
    </div>
  )
}
