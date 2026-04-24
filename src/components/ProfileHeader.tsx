import { Trophy, Shield, Zap, TrendingUp, Calendar, Clock, RefreshCw } from 'lucide-react'
import { PlayerData, RankedStats, RankedStatsExtended } from '../types/api'

interface ProfileHeaderProps {
  playerData: PlayerData
  rankedStats: RankedStats | RankedStatsExtended | null | undefined
  cachedAt?: number | null
  isRefreshing?: boolean
  onRefresh?: () => Promise<void>
}

const formatTimeAgo = (timestamp: number | null | undefined): string => {
  if (!timestamp) return 'Nunca actualizada'

  const nowMs = Date.now()
  const timestampMs = timestamp * 1000 // Convert seconds to milliseconds
  const seconds = Math.floor((nowMs - timestampMs) / 1000)

  if (seconds < 0) return 'Nunca actualizada'
  if (seconds < 60) return 'Actualizado ahora'
  if (seconds < 3600) return `Actualizado hace ${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `Actualizado hace ${Math.floor(seconds / 3600)} h`
  if (seconds < 2592000) return `Actualizado hace ${Math.floor(seconds / 86400)} días`

  return `Actualizado el ${new Date(timestampMs).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

// Helper para obtener solo ranked
function getSoloRanked(stats: RankedStats | RankedStatsExtended | null | undefined): RankedStats | null {
  if (!stats) return null
  if ('solo' in stats) return (stats as RankedStatsExtended).solo
  return stats as RankedStats
}

const getRankColor = (tier: string): string => {
  const colors: Record<string, string> = {
    'IRON': '#8B4513',
    'BRONZE': '#CD7F32',
    'SILVER': '#C0C0C0',
    'GOLD': '#FFD700',
    'PLATINUM': '#00A8B5',
    'EMERALD': '#50C878',
    'DIAMOND': '#3B82F6',
    'MASTER': '#9D4EDD',
    'GRANDMASTER': '#FF4444',
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

export function ProfileHeader({ playerData, rankedStats, cachedAt, isRefreshing, onRefresh }: ProfileHeaderProps) {
  const soloRanked = getSoloRanked(rankedStats)
  const winRate = soloRanked
    ? Math.round((soloRanked.wins / (soloRanked.wins + soloRanked.losses)) * 100)
    : 0

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Main Profile Section with Gradient */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6">
          {/* Avatar Section */}
          <div className="relative shrink-0">
            <div className="w-28 h-28 rounded-3xl overflow-hidden ring-4 ring-white/20 shadow-2xl">
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/14.5.1/img/profileicon/${playerData.profileIconId || '1'}.png`}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = 'https://ddragon.leagueoflegends.com/cdn/14.5.1/img/profileicon/1.png'
                }}
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl px-3 py-1 font-bold text-sm border-2 border-slate-800 shadow-lg">
              {playerData.summonerLevel}
            </div>
            {soloRanked && (
              <div
                className={`absolute -top-2 -left-2 w-8 h-8 rounded-full bg-gradient-to-br ${getRankGradient(soloRanked.tier)} flex items-center justify-center text-xs font-bold border-2 border-slate-800 shadow-lg`}
              >
                {soloRanked.tier[0]}
              </div>
            )}
          </div>

          {/* Player Info */}
          <div className="flex-1 text-center lg:text-left">
            <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 mb-3">
              <h1 className="text-3xl lg:text-4xl font-bold">
                {playerData.gameName}
                <span className="text-slate-400 font-normal">#{playerData.tagLine}</span>
              </h1>
              {soloRanked && (
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                  style={{ backgroundColor: getRankColor(soloRanked.tier), color: '#fff' }}
                >
                  {soloRanked.tier} {soloRanked.rank}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-slate-400 text-sm">
              <span className="flex items-center gap-1.5">
                <Shield size={14} className="text-blue-400" />
                <span className="uppercase font-medium">{playerData.region || 'EUW'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Trophy size={14} className="text-yellow-400" />
                <span>Nivel {playerData.summonerLevel}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-green-400" />
                <span>S2026</span>
              </span>
            </div>
          </div>

          {/* Ranked Stats Cards */}
          {soloRanked ? (
            <div className="flex flex-col gap-3 w-full lg:w-auto">
              {/* LP Card */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getRankGradient(soloRanked.tier)} flex items-center justify-center text-xl font-bold shadow-lg`}>
                    {soloRanked.tier[0]}
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{soloRanked.leaguePoints} LP</div>
                    <div className="text-slate-400 text-sm">{soloRanked.tier} {soloRanked.rank}</div>
                  </div>
                </div>
              </div>

              {/* Win/Loss Card */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="flex items-center justify-between gap-6">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-400">{soloRanked.wins}</div>
                    <div className="text-xs text-slate-400">Victorias</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-400">{soloRanked.losses}</div>
                    <div className="text-xs text-slate-400">Derrotas</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold ${winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                      {winRate}%
                    </div>
                    <div className="text-xs text-slate-400">Win Rate</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-600 flex items-center justify-center text-2xl">
                  -
                </div>
                <div>
                  <div className="text-lg font-bold">Unranked</div>
                  <div className="text-slate-400 text-sm">Sin datos clasificatorios</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="bg-slate-50 border-t border-slate-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {soloRanked?.hotStreak && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-orange-600">
                <TrendingUp size={14} />
                Racha de victorias
              </span>
            )}
            {soloRanked?.veteran && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-purple-600">
                <Zap size={14} />
                Veterano
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock size={12} />
            <span>{formatTimeAgo(cachedAt)}</span>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                {isRefreshing ? 'Actualizando...' : 'Actualizar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
