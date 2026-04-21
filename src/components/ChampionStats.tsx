import { useState, useMemo } from 'react'
import { Users, Trophy, TrendingUp, BarChart3, Target, Swords } from 'lucide-react'
import { DetailedMatch } from '../types/api'

interface ChampionStatsProps {
  matches: DetailedMatch[]
}

interface ChampionStat {
  championId: number
  championName: string
  games: number
  wins: number
  losses: number
  winRate: number
  kills: number
  deaths: number
  assists: number
  kda: number
  avgKills: number
  avgDeaths: number
  avgAssists: number
  totalDamage: number
  avgDamage: number
  goldEarned: number
  avgGold: number
  csPerMinute: number
  avgCsPerMinute: number
}

type SortKey = 'winRate' | 'games' | 'kda' | 'avgDamage' | 'avgCsPerMinute'

const getChampionIcon = (championId: number): string => {
  return `https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${championId}.png`
}

const getWinRateColor = (winRate: number): string => {
  if (winRate >= 60) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (winRate >= 50) return 'bg-blue-100 text-blue-700 border-blue-200'
  if (winRate >= 40) return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-rose-100 text-rose-700 border-rose-200'
}

const getKDAColor = (kda: number): string => {
  if (kda >= 5) return 'bg-purple-100 text-purple-700 border-purple-200'
  if (kda >= 3) return 'bg-blue-100 text-blue-700 border-blue-200'
  if (kda >= 2) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

const sortOptions: { key: SortKey; label: string; icon: React.ElementType }[] = [
  { key: 'winRate', label: 'Win Rate', icon: Trophy },
  { key: 'games', label: 'Partidas', icon: BarChart3 },
  { key: 'kda', label: 'KDA', icon: Target },
  { key: 'avgDamage', label: 'Daño', icon: Swords },
  { key: 'avgCsPerMinute', label: 'CS/min', icon: TrendingUp },
]

export function ChampionStats({ matches }: ChampionStatsProps) {
  const [sortBy, setSortBy] = useState<SortKey>('winRate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const championStats = useMemo(() => {
    const stats: { [key: number]: ChampionStat } = {}

    matches.forEach((match) => {
      if (!match.participants) return

      match.participants.forEach((participant) => {
        const key = participant.championId
        if (!stats[key]) {
          stats[key] = {
            championId: participant.championId,
            championName: participant.championName,
            games: 0, wins: 0, losses: 0, winRate: 0,
            kills: 0, deaths: 0, assists: 0, kda: 0,
            avgKills: 0, avgDeaths: 0, avgAssists: 0,
            totalDamage: 0, avgDamage: 0,
            goldEarned: 0, avgGold: 0,
            csPerMinute: 0, avgCsPerMinute: 0
          }
        }

        const stat = stats[key]
        stat.games++
        if (participant.win) stat.wins++
        else stat.losses++

        stat.kills += participant.kills
        stat.deaths += participant.deaths
        stat.assists += participant.assists
        stat.totalDamage += participant.damageDealtToChampions
        stat.goldEarned += participant.goldEarned
        stat.csPerMinute += (participant.totalMinionsKilled / (participant.timePlayed / 60)) || 0
      })
    })

    Object.values(stats).forEach((stat) => {
      stat.winRate = stat.games > 0 ? (stat.wins / stat.games) * 100 : 0
      stat.kda = stat.deaths === 0 ? (stat.kills + stat.assists) : (stat.kills + stat.assists) / stat.deaths
      stat.avgKills = stat.games > 0 ? stat.kills / stat.games : 0
      stat.avgDeaths = stat.games > 0 ? stat.deaths / stat.games : 0
      stat.avgAssists = stat.games > 0 ? stat.assists / stat.games : 0
      stat.avgDamage = stat.games > 0 ? stat.totalDamage / stat.games : 0
      stat.avgGold = stat.games > 0 ? stat.goldEarned / stat.games : 0
      stat.avgCsPerMinute = stat.games > 0 ? stat.csPerMinute / stat.games : 0
    })

    return Object.values(stats).sort((a, b) => {
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
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Estadísticas por Campeón</h2>
              <p className="text-sm text-slate-400">{championStats.length} campeones jugados</p>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Ordenar por:</span>
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
                        ? 'bg-blue-500 text-white'
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

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Campeón
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Partidas
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Win Rate
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                KDA
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                K/D/A Prom
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Daño Prom
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                CS/min
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {championStats.map((champion) => (
              <tr key={champion.championId} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <img
                      src={getChampionIcon(champion.championId)}
                      alt={champion.championName}
                      className="w-10 h-10 rounded-lg border-2 border-slate-200 shadow-sm"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = 'https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/Aatrox.png'
                      }}
                    />
                    <div>
                      <div className="font-semibold text-slate-900">{champion.championName}</div>
                      <div className="text-xs text-slate-500">{champion.wins}V {champion.losses}D</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <div className="font-semibold text-slate-900">{champion.games}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${getWinRateColor(champion.winRate)}`}>
                    {champion.winRate.toFixed(1)}%
                    <div className="w-8 h-1.5 bg-black/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-current"
                        style={{ width: `${champion.winRate}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getKDAColor(champion.kda)}`}>
                    {champion.kda.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <div className="text-sm font-medium text-slate-700">
                    {champion.avgKills.toFixed(1)}/<span className="text-rose-500">{champion.avgDeaths.toFixed(1)}</span>/{champion.avgAssists.toFixed(1)}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <div className="text-sm font-medium text-slate-700">
                    {(champion.avgDamage / 1000).toFixed(1)}k
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <div className={`text-sm font-medium ${champion.avgCsPerMinute >= 7 ? 'text-emerald-600' :
                      champion.avgCsPerMinute >= 5 ? 'text-blue-600' : 'text-slate-600'
                    }`}>
                    {champion.avgCsPerMinute.toFixed(1)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {championStats.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">Sin datos de campeones</h3>
          <p className="text-sm text-slate-500">No hay partidas disponibles para calcular estadísticas</p>
        </div>
      )}
    </div>
  )
}
