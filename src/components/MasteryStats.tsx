import { useState, useMemo } from 'react'
import { Star, Trophy, Target, Zap, Crown, Clock } from 'lucide-react'
import { DetailedMatch, Participant } from '../types/api'

interface MasteryStatsProps {
  matches: DetailedMatch[]
}

interface ChampionMastery {
  championId: number
  championName: string
  masteryLevel: number
  masteryPoints: number
  lastPlayTime: number
  chestGranted: boolean
  gamesPlayed: number
  avgKDA: number
  winRate: number
  totalKills: number
  totalDeaths: number
  totalAssists: number
  csPerMinute: number
  goldPerMinute: number
}

type SortKey = 'masteryLevel' | 'masteryPoints' | 'winRate' | 'gamesPlayed'

const getChampionIcon = (championId: number): string => {
  return `https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${championId}.png`
}

const getMasteryLevelColor = (level: number): string => {
  switch (level) {
    case 7: return 'from-rose-500 to-orange-500'
    case 6: return 'from-purple-500 to-pink-500'
    case 5: return 'from-blue-500 to-cyan-500'
    case 4: return 'from-emerald-500 to-green-500'
    case 3: return 'from-amber-500 to-yellow-500'
    case 2: return 'from-slate-500 to-gray-500'
    case 1: return 'from-gray-400 to-gray-500'
    default: return 'from-slate-300 to-slate-400'
  }
}

const getWinRateColor = (winRate: number): string => {
  if (winRate >= 60) return 'text-emerald-600'
  if (winRate >= 50) return 'text-blue-600'
  if (winRate >= 40) return 'text-amber-600'
  return 'text-rose-600'
}

const sortOptions: { key: SortKey; label: string; icon: React.ElementType }[] = [
  { key: 'masteryLevel', label: 'Nivel', icon: Crown },
  { key: 'masteryPoints', label: 'Puntos', icon: Star },
  { key: 'winRate', label: 'Win Rate', icon: Target },
  { key: 'gamesPlayed', label: 'Partidas', icon: Zap },
]

export function MasteryStats({ matches }: MasteryStatsProps) {
  const [sortBy, setSortBy] = useState<SortKey>('masteryLevel')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const championMastery = useMemo(() => {
    const mastery: { [key: number]: ChampionMastery } = {}

    matches.forEach((match) => {
      if (!match.participants) return

      match.participants.forEach((participant) => {
        const key = participant.championId
        if (!mastery[key]) {
          mastery[key] = {
            championId: participant.championId,
            championName: participant.championName,
            masteryLevel: 0,
            masteryPoints: 0,
            lastPlayTime: match.gameCreation,
            chestGranted: false,
            gamesPlayed: 0,
            avgKDA: 0,
            winRate: 0,
            totalKills: 0,
            totalDeaths: 0,
            totalAssists: 0,
            csPerMinute: 0,
            goldPerMinute: 0
          }
        }

        const m = mastery[key]
        m.gamesPlayed++
        m.totalKills += participant.kills
        m.totalDeaths += participant.deaths
        m.totalAssists += participant.assists

        const csPerMin = (participant.totalMinionsKilled / (participant.timePlayed / 60)) || 0
        const goldPerMin = (participant.goldEarned / (participant.timePlayed / 60)) || 0
        m.csPerMinute += csPerMin
        m.goldPerMinute += goldPerMin

        if (match.gameCreation > m.lastPlayTime) {
          m.lastPlayTime = match.gameCreation
        }

        const kda = participant.deaths === 0
          ? (participant.kills + participant.assists) * 2
          : (participant.kills + participant.assists) / participant.deaths
        m.masteryPoints += Math.round(kda * 100 + participant.totalMinionsKilled)

        if (m.masteryPoints >= 10000) m.masteryLevel = 7
        else if (m.masteryPoints >= 5000) m.masteryLevel = 6
        else if (m.masteryPoints >= 2500) m.masteryLevel = 5
        else if (m.masteryPoints >= 1000) m.masteryLevel = 4
        else if (m.masteryPoints >= 500) m.masteryLevel = 3
        else if (m.masteryPoints >= 200) m.masteryLevel = 2
        else if (m.masteryPoints >= 50) m.masteryLevel = 1
      })
    })

    Object.values(mastery).forEach((m) => {
      const wins = matches.filter(match =>
        match.participants?.some(p => p.championId === m.championId && p.win)
      ).length
      m.winRate = m.gamesPlayed > 0 ? (wins / m.gamesPlayed) * 100 : 0
      m.avgKDA = m.totalDeaths === 0
        ? (m.totalKills + m.totalAssists)
        : (m.totalKills + m.totalAssists) / m.totalDeaths
      m.csPerMinute = m.gamesPlayed > 0 ? m.csPerMinute / m.gamesPlayed : 0
      m.goldPerMinute = m.gamesPlayed > 0 ? m.goldPerMinute / m.gamesPlayed : 0
    })

    return Object.values(mastery).sort((a, b) => {
      const aValue = a[sortBy]
      const bValue = b[sortBy]
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue
    })
  }, [matches, sortBy, sortOrder])

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Maestría de Campeones</h2>
              <p className="text-sm text-slate-400">{championMastery.length} campeones</p>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Ordenar:</span>
            <div className="flex flex-wrap gap-1">
              {sortOptions.map((option) => {
                const Icon = option.icon
                const isActive = sortBy === option.key
                return (
                  <button
                    key={option.key}
                    onClick={() => {
                      if (sortBy === option.key) {
                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                      } else {
                        setSortBy(option.key)
                        setSortOrder('desc')
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isActive
                        ? 'bg-yellow-500 text-slate-900'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
                      }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{option.label}</span>
                    {isActive && (
                      <span className="text-[10px]">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {championMastery.map((mastery) => (
          <div
            key={mastery.championId}
            className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            {/* Champion Header */}
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <img
                    src={getChampionIcon(mastery.championId)}
                    alt={mastery.championName}
                    className="w-14 h-14 rounded-xl border-2 border-slate-200 shadow-sm"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = 'https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/Aatrox.png'
                    }}
                  />
                  <div className={`absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gradient-to-br ${getMasteryLevelColor(mastery.masteryLevel)} flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-md`}>
                    {mastery.masteryLevel || '-'}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">{mastery.championName}</h3>
                  <p className="text-xs text-slate-500">{mastery.masteryPoints.toLocaleString()} pts</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-xl p-2.5 border border-slate-100">
                  <div className="text-xs text-slate-500 mb-0.5">Partidas</div>
                  <div className="font-semibold text-slate-900">{mastery.gamesPlayed}</div>
                </div>
                <div className="bg-white rounded-xl p-2.5 border border-slate-100">
                  <div className="text-xs text-slate-500 mb-0.5">Win Rate</div>
                  <div className={`font-semibold ${getWinRateColor(mastery.winRate)}`}>
                    {mastery.winRate.toFixed(0)}%
                  </div>
                </div>
                <div className="bg-white rounded-xl p-2.5 border border-slate-100">
                  <div className="text-xs text-slate-500 mb-0.5">KDA</div>
                  <div className="font-semibold text-slate-900">{mastery.avgKDA.toFixed(2)}</div>
                </div>
                <div className="bg-white rounded-xl p-2.5 border border-slate-100">
                  <div className="text-xs text-slate-500 mb-0.5">CS/min</div>
                  <div className="font-semibold text-slate-900">{mastery.csPerMinute.toFixed(1)}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Progreso M{Math.min(mastery.masteryLevel + 1, 7)}</span>
                  <span>{Math.min(100, (mastery.masteryPoints / 10000) * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${getMasteryLevelColor(mastery.masteryLevel)}`}
                    style={{ width: `${Math.min(100, (mastery.masteryPoints / 10000) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(mastery.lastPlayTime).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                </div>
                {mastery.chestGranted && (
                  <div className="flex items-center gap-1 text-amber-600">
                    <Trophy className="w-3 h-3" />
                    <span>Cofre disponible</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {championMastery.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">Sin datos de maestría</h3>
          <p className="text-sm text-slate-500">No hay partidas disponibles para calcular maestría</p>
        </div>
      )}
    </div>
  )
}
