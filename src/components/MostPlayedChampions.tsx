import { useMemo } from 'react'
import { Star } from 'lucide-react'
import { ChampionMasteryCard } from './ChampionMasteryCard'
import { getChampionName } from '../lib/champions'
import type { DetailedMatch, ChampionMastery } from '../types/api'

interface MostPlayedChampionsProps {
  matches: DetailedMatch[]
  playerPuuid: string
  mastery: ChampionMastery[]
}

export function MostPlayedChampions({ matches, playerPuuid, mastery }: MostPlayedChampionsProps) {
  const topChampions = useMemo(() => {
    if (!matches || !playerPuuid) return []

    const championCounts: Record<number, { championId: number; games: number; wins: number }> = {}

    matches.forEach(match => {
      if (!match.participants) return
      const player = match.participants.find(p => p.puuid === playerPuuid)
      if (!player) return

      const cid = player.championId
      if (!championCounts[cid]) {
        championCounts[cid] = { championId: cid, games: 0, wins: 0 }
      }
      championCounts[cid].games++
      if (player.win) championCounts[cid].wins++
    })

    return Object.values(championCounts)
      .sort((a, b) => b.games - a.games)
      .slice(0, 3)
      .map(c => {
        const masteryEntry = mastery?.find(m => m.championId === c.championId)
        return {
          championId: c.championId,
          championName: getChampionName(c.championId),
          championPoints: masteryEntry?.championPoints || 0,
          championLevel: masteryEntry?.championLevel || 0,
          championPointsSinceLastLevel: masteryEntry?.championPointsSinceLastLevel || 0,
          championPointsUntilNextLevel: masteryEntry?.championPointsUntilNextLevel || 0,
          chestGranted: masteryEntry?.chestGranted || false,
          tokensEarned: masteryEntry?.tokensEarned || 0,
          lastPlayTime: masteryEntry?.lastPlayTime || 0,
          games: c.games,
          wins: c.wins
        }
      })
  }, [matches, playerPuuid, mastery])

  if (topChampions.length === 0) return null

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4">
      <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
        <Star className="w-5 h-5 text-yellow-500" />
        Más Jugados
      </h3>
      <div className="space-y-3">
        {topChampions.map((m, idx) => (
          <ChampionMasteryCard key={idx} mastery={m} />
        ))}
      </div>
    </div>
  )
}
