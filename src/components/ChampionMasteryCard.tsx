import { Star, Lock, Clock } from 'lucide-react'
import { ChampionMastery } from '../types'
import { getChampionName } from '../lib/champions'

interface TopChampionData {
  championId: number
  championName?: string
  championPoints?: number
  championLevel?: number
  games: number
  wins: number
}

interface ChampionMasteryCardProps {
  mastery: ChampionMastery | TopChampionData
}

const getMasteryLevelColor = (level: number): string => {
  switch (level) {
    case 7: return 'from-rose-500 to-orange-500 border-rose-400'
    case 6: return 'from-purple-500 to-pink-500 border-purple-400'
    case 5: return 'from-blue-500 to-cyan-500 border-blue-400'
    case 4: return 'from-emerald-500 to-green-500 border-emerald-400'
    case 3: return 'from-amber-500 to-yellow-500 border-amber-400'
    case 2: return 'from-slate-500 to-gray-500 border-slate-400'
    case 1: return 'from-gray-400 to-gray-500 border-gray-300'
    default: return 'from-slate-300 to-slate-400 border-slate-200'
  }
}

const getMasteryLevelText = (level: number): string => {
  switch (level) {
    case 7: return 'Maestría 7'
    case 6: return 'Maestría 6'
    case 5: return 'Maestría 5'
    case 4: return 'Maestría 4'
    case 3: return 'Maestría 3'
    case 2: return 'Maestría 2'
    case 1: return 'Maestría 1'
    default: return 'Sin Maestría'
  }
}

const formatPoints = (points: number): string => {
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1)}M`
  }
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}K`
  }
  return points.toString()
}

const formatLastPlayed = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`
  return `Hace ${Math.floor(diffDays / 30)} meses`
}

export function ChampionMasteryCard({ mastery }: ChampionMasteryCardProps) {
  const championName = mastery.championName || getChampionName(mastery.championId)
  const masteryData = mastery as ChampionMastery
  const level = mastery.championLevel || 0
  const isTopPlayed = 'games' in mastery && mastery.games > 0 && !masteryData.championPoints

  const progress = masteryData.championPointsUntilNextLevel && masteryData.championPointsUntilNextLevel > 0
    ? Math.round((masteryData.championPointsSinceLastLevel / (masteryData.championPointsSinceLastLevel + masteryData.championPointsUntilNextLevel)) * 100)
    : isTopPlayed ? 100 : 0

  const nextLevel = level < 7 ? level + 1 : null
  const totalGames = 'games' in mastery ? mastery.games : 0
  const wins = 'wins' in mastery ? mastery.wins : 0

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 hover:shadow-xl transition-shadow">
      <div className="flex items-start gap-4 mb-4">
        <div className="relative">
          <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getMasteryLevelColor(level)} p-0.5`}>
            <img
              src={`https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${championName}.png`}
              alt={championName}
              className="w-full h-full rounded-lg bg-slate-900 object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = 'https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/Aatrox.png'
              }}
            />
          </div>
          {level > 0 && (
            <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br ${getMasteryLevelColor(level)} flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-md`}>
              {level}
            </div>
          )}
          {masteryData.chestGranted && (
            <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-white text-[10px] border-2 border-white shadow-sm" title="Cofre obtenido">
              <Lock className="w-3 h-3" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 truncate">{championName}</h3>
          <p className="text-xs text-slate-500">{getMasteryLevelText(level)}</p>
          <div className="flex items-center gap-2 mt-1">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-semibold text-slate-700">{formatPoints(masteryData.championPoints || 0)} pts</span>
          </div>
          {totalGames > 0 && (
            <div className="text-xs text-slate-500 mt-1">
              {totalGames} games • {wins}W {totalGames - wins}L
            </div>
          )}
        </div>
      </div>

      {nextLevel && !isTopPlayed && (
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">Progreso a M{nextLevel}</span>
            <span className="font-medium text-slate-700">{progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${getMasteryLevelColor(level)}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {level >= 6 && masteryData.tokensEarned !== undefined && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-slate-500">Tokens:</span>
          <div className="flex gap-1">
            {[0, 1].map((i) => (
              <div
                key={i}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i < (masteryData.tokensEarned || 0)
                    ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                S
              </div>
            ))}
          </div>
        </div>
      )}

      {masteryData.lastPlayTime && masteryData.lastPlayTime > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          <span>Última partida: {formatLastPlayed(masteryData.lastPlayTime)}</span>
        </div>
      )}
    </div>
  )
}