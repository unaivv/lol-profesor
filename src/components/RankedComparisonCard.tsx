import { Trophy, TrendingUp, Target, Shield } from 'lucide-react'
import { RankedStatsExtended, RankedStats } from '../types/api'
import { getRankEmblemUrl } from '../lib/utils'

interface RankedComparisonCardProps {
  rankedStats: RankedStatsExtended | null | undefined
}

const getRankColor = (tier: string): string => {
  const colors: Record<string, string> = {
    'IRON': '#3E3E3E',
    'BRONZE': '#CD7F32',
    'SILVER': '#C0C0C0',
    'GOLD': '#FFD700',
    'PLATINUM': '#00A8B5',
    'EMERALD': '#50C878',
    'DIAMOND': '#B9F2FF',
    'MASTER': '#9D4EDD',
    'GRANDMASTER': '#DC143C',
    'CHALLENGER': '#FFA500'
  }
  return colors[tier] || '#6B7280'
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
    'CHALLENGER': 'from-amber-500 to-yellow-400'
  }
  return gradients[tier] || 'from-slate-600 to-slate-500'
}

function RankedCard({ stats, title, icon: Icon }: { stats: RankedStats | null; title: string; icon: React.ElementType }) {
  if (!stats) {
    return (
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
        <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Icon className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="font-bold text-slate-700 mb-1">{title}</h3>
        <p className="text-sm text-slate-500">Sin datos</p>
      </div>
    )
  }

  const winRate = Math.round((stats.wins / (stats.wins + stats.losses)) * 100)

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center gap-4 mb-5">
        <div className="w-14 h-14 rounded-xl overflow-hidden shadow-sm bg-slate-50 flex-shrink-0">
          <img 
            src={stats.tier ? getRankEmblemUrl(stats.tier) : ''} 
            alt={stats.tier}
            className="w-full h-full object-contain p-1"
            onError={(e) => {
              const color = getRankColor(stats.tier)
              ;(e.target as HTMLImageElement).style.display = 'none'
              ;(e.target as HTMLImageElement).parentElement!.style.background = color
              ;(e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-white font-bold text-lg flex items-center justify-center h-full">${stats.tier[0]}</span>`
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base text-slate-700">{title}</h3>
          <p className="text-sm font-bold text-slate-600">{stats.tier} {stats.rank}</p>
        </div>
      </div>

      <div className="mb-5">
        <div className="text-3xl font-bold text-slate-900">{stats.leaguePoints} <span className="text-sm font-normal text-slate-500">LP</span></div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${getRankGradient(stats.tier)}`}
            style={{ width: `${Math.min(stats.leaguePoints, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center py-3 bg-slate-50 rounded-xl">
        <div>
          <div className="text-xl font-bold text-emerald-600">{stats.wins}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wide">Victorias</div>
        </div>
        <div>
          <div className="text-xl font-bold text-rose-600">{stats.losses}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wide">Derrotas</div>
        </div>
        <div>
          <div className={`text-xl font-bold ${winRate >= 50 ? 'text-emerald-600' : 'text-orange-600'}`}>{winRate}%</div>
          <div className="text-xs text-slate-500 uppercase tracking-wide">Win Rate</div>
        </div>
      </div>

      {stats.hotStreak && (
        <div className="mt-4 flex items-center gap-2 text-sm text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>En racha de victorias</span>
        </div>
      )}
    </div>
  )
}

export function RankedComparisonCard({ rankedStats }: RankedComparisonCardProps) {
  const solo = rankedStats?.solo || null
  const flex = rankedStats?.flex || null

  const hasAnyRanked = solo !== null || flex !== null

  if (!hasAnyRanked) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-slate-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Clasificatorias</h2>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Sin datos clasificatorios</h3>
          <p className="text-sm text-slate-500">El jugador no tiene partidas clasificatorias esta temporada</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Estadísticas Clasificatorias</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RankedCard stats={solo} title="Solo/Duo" icon={Target} />
        <RankedCard stats={flex} title="Flex 5v5" icon={Trophy} />
      </div>
    </div>
  )
}
