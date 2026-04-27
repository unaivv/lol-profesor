import { useState, useMemo } from 'react'
import { Users, Trophy, TrendingUp, BarChart3, Target, Swords, Star } from 'lucide-react'
import { DetailedMatch, ChampionMastery } from '../types/api'
import { getChampionImageUrl, getChampionName, useChampionMap } from '../utils/ddragon'

interface ChampionStatsProps {
  matches: DetailedMatch[]
  playerPuuid?: string
  mastery?: ChampionMastery[]
}

interface ChampionRow {
  championId: number
  championName: string
  masteryLevel: number
  masteryPoints: number
  // match-derived (null = no recent data)
  games: number
  wins: number
  losses: number
  winRate: number | null
  kda: number | null
  avgKills: number | null
  avgDeaths: number | null
  avgAssists: number | null
  avgDamage: number | null
  avgCsPerMinute: number | null
}

type SortKey = 'masteryPoints' | 'games' | 'winRate' | 'kda' | 'avgDamage' | 'avgCsPerMinute'

const sortOptions: { key: SortKey; label: string; icon: React.ElementType }[] = [
  { key: 'masteryPoints', label: 'Maestría', icon: Star },
  { key: 'games', label: 'Partidas', icon: BarChart3 },
  { key: 'winRate', label: 'Win Rate', icon: Trophy },
  { key: 'kda', label: 'KDA', icon: Target },
  { key: 'avgDamage', label: 'Daño', icon: Swords },
  { key: 'avgCsPerMinute', label: 'CS/min', icon: TrendingUp },
]

const formatPoints = (p: number) =>
  p >= 1_000_000 ? `${(p / 1_000_000).toFixed(1)}M` : p >= 1_000 ? `${(p / 1_000).toFixed(0)}K` : String(p)

const winRateClass = (wr: number) => {
  if (wr >= 60) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (wr >= 50) return 'bg-blue-100 text-blue-700 border-blue-200'
  if (wr >= 40) return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-rose-100 text-rose-700 border-rose-200'
}

const kdaClass = (kda: number) => {
  if (kda >= 5) return 'bg-purple-100 text-purple-700 border-purple-200'
  if (kda >= 3) return 'bg-blue-100 text-blue-700 border-blue-200'
  if (kda >= 2) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

const masteryColor = (level: number) => {
  if (level >= 10) return '#f59e0b'  // gold brillante
  if (level >= 7)  return '#eab308'  // gold
  if (level >= 5)  return '#a855f7'  // purple
  if (level >= 3)  return '#3b82f6'  // blue
  return '#475569'
}

export function ChampionStats({ matches, playerPuuid, mastery = [] }: ChampionStatsProps) {
  const [sortBy, setSortBy] = useState<SortKey>('games')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const champMapReady = useChampionMap()

  const championStats = useMemo(() => {
    // Build match stats indexed by championId
    const matchStats: Record<number, {
      games: number; wins: number; losses: number
      kills: number; deaths: number; assists: number
      totalDamage: number; csPerMinute: number
    }> = {}

    matches.forEach(match => {
      if (!match.participants) return
      const me = playerPuuid
        ? match.participants.find(p => p.puuid === playerPuuid)
        : match.participants[0]
      if (!me) return

      const id = me.championId
      if (!matchStats[id]) {
        matchStats[id] = { games: 0, wins: 0, losses: 0, kills: 0, deaths: 0, assists: 0, totalDamage: 0, csPerMinute: 0 }
      }
      const s = matchStats[id]
      s.games++
      if (me.win) s.wins++; else s.losses++
      s.kills += me.kills
      s.deaths += me.deaths
      s.assists += me.assists
      s.totalDamage += me.damageDealtToChampions || 0
      s.csPerMinute += me.timePlayed > 0 ? (me.totalMinionsKilled / (me.timePlayed / 60)) : 0
    })

    // Build rows from mastery as base
    const rows: ChampionRow[] = mastery.map(m => {
      const ms = matchStats[m.championId] ?? null
      return {
        championId: m.championId,
        championName: getChampionName(m.championId),
        masteryLevel: m.championLevel,
        masteryPoints: m.championPoints,
        games: ms?.games ?? 0,
        wins: ms?.wins ?? 0,
        losses: ms?.losses ?? 0,
        winRate: ms ? (ms.wins / ms.games) * 100 : null,
        kda: ms ? (ms.deaths === 0 ? ms.kills + ms.assists : (ms.kills + ms.assists) / ms.deaths) : null,
        avgKills: ms ? ms.kills / ms.games : null,
        avgDeaths: ms ? ms.deaths / ms.games : null,
        avgAssists: ms ? ms.assists / ms.games : null,
        avgDamage: ms ? ms.totalDamage / ms.games : null,
        avgCsPerMinute: ms ? ms.csPerMinute / ms.games : null,
      }
    })

    // Add any match champions NOT in mastery (edge case)
    Object.entries(matchStats).forEach(([idStr, ms]) => {
      const id = Number(idStr)
      if (rows.find(r => r.championId === id)) return
      const participant = matches.flatMap(m => m.participants ?? []).find(p => p.championId === id)
      rows.push({
        championId: id,
        championName: getChampionName(id),
        masteryLevel: 0,
        masteryPoints: 0,
        games: ms.games,
        wins: ms.wins,
        losses: ms.losses,
        winRate: (ms.wins / ms.games) * 100,
        kda: ms.deaths === 0 ? ms.kills + ms.assists : (ms.kills + ms.assists) / ms.deaths,
        avgKills: ms.kills / ms.games,
        avgDeaths: ms.deaths / ms.games,
        avgAssists: ms.assists / ms.games,
        avgDamage: ms.totalDamage / ms.games,
        avgCsPerMinute: ms.csPerMinute / ms.games,
      })
    })

    return rows.filter(r => r.games > 0).sort((a, b) => {
      let av: number, bv: number
      if (sortBy === 'masteryPoints') { av = a.masteryPoints; bv = b.masteryPoints }
      else if (sortBy === 'games') { av = a.games; bv = b.games }
      else if (sortBy === 'winRate') { av = a.winRate ?? -1; bv = b.winRate ?? -1 }
      else if (sortBy === 'kda') { av = a.kda ?? -1; bv = b.kda ?? -1 }
      else if (sortBy === 'avgDamage') { av = a.avgDamage ?? -1; bv = b.avgDamage ?? -1 }
      else { av = a.avgCsPerMinute ?? -1; bv = b.avgCsPerMinute ?? -1 }
      return sortOrder === 'desc' ? bv - av : av - bv
    })
  }, [matches, mastery, playerPuuid, sortBy, sortOrder, champMapReady])

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Estadísticas por Campeón</h2>
              <p className="text-sm text-slate-400">
                {championStats.length} campeones · W/L/KDA solo en partidas recientes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-slate-400">Ordenar:</span>
            {sortOptions.map(opt => {
              const Icon = opt.icon
              const active = sortBy === opt.key
              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    if (sortBy === opt.key) setSortOrder(o => o === 'desc' ? 'asc' : 'desc')
                    else { setSortBy(opt.key); setSortOrder('desc') }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${active ? 'bg-blue-500 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {opt.label}
                  {active && <span className="text-[10px]">{sortOrder === 'desc' ? '↓' : '↑'}</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Campeón</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Maestría</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Partidas rec.</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Win Rate</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">KDA</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">K/D/A Prom</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">CS/min</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {championStats.map(c => (
              <tr key={c.championId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <img src={getChampionImageUrl(c.championId)} alt={c.championName} className="w-10 h-10 rounded-lg border-2 border-slate-200 shadow-sm" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{c.championName}</div>
                      {c.games > 0 && <div className="text-xs text-slate-500 dark:text-slate-400">{c.wins}V {c.losses}D</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs font-bold" style={{ color: masteryColor(c.masteryLevel) }}>
                      M{c.masteryLevel}
                    </span>
                    <span className="text-xs text-slate-500">{formatPoints(c.masteryPoints)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  {c.games > 0
                    ? <span className="font-semibold text-slate-900 dark:text-slate-100">{c.games}</span>
                    : <span className="text-slate-300 dark:text-slate-600">—</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  {c.winRate !== null
                    ? <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${winRateClass(c.winRate)}`}>{c.winRate.toFixed(1)}%</span>
                    : <span className="text-slate-300 dark:text-slate-600">—</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  {c.kda !== null
                    ? <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${kdaClass(c.kda)}`}>{c.kda.toFixed(2)}</span>
                    : <span className="text-slate-300 dark:text-slate-600">—</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  {c.avgKills !== null
                    ? <span className="text-sm font-medium text-slate-700">{c.avgKills.toFixed(1)}/<span className="text-rose-500">{c.avgDeaths!.toFixed(1)}</span>/{c.avgAssists!.toFixed(1)}</span>
                    : <span className="text-slate-300 dark:text-slate-600">—</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  {c.avgCsPerMinute !== null
                    ? <span className={`text-sm font-medium ${c.avgCsPerMinute >= 7 ? 'text-emerald-600' : c.avgCsPerMinute >= 5 ? 'text-blue-600' : 'text-slate-600'}`}>{c.avgCsPerMinute.toFixed(1)}</span>
                    : <span className="text-slate-300 dark:text-slate-600">—</span>}
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
          <h3 className="text-lg font-semibold text-slate-800 mb-1">Sin datos</h3>
          <p className="text-sm text-slate-500">No hay datos de maestría ni partidas disponibles</p>
        </div>
      )}
    </div>
  )
}
