import { useState } from 'react'
import { PlayerData, RankedStats, DetailedMatch } from '../types'

export function usePlayerData() {
  const [playerData, setPlayerData] = useState<PlayerData | null>(null)
  const [matches, setMatches] = useState<DetailedMatch[]>([])
  const [rankedStats, setRankedStats] = useState<RankedStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchPlayer = async (searchQuery: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const [gameName, tagLine] = searchQuery.includes('#')
        ? searchQuery.split('#')
        : [searchQuery, '']

      const playerResponse = await fetch(`/api/player/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`)

      if (!playerResponse.ok) {
        throw new Error('Jugador no encontrado')
      }

      const player = await playerResponse.json()
      setPlayerData(player)

      // Use the new details endpoint to get all participants
      const matchesResponse = await fetch(`/api/matches/${player.puuid}/details`)
      if (matchesResponse.ok) {
        const matchesData = await matchesResponse.json()
        setMatches(matchesData)
      }

      const rankedResponse = await fetch(`/api/ranked/${player.summonerId}`)
      if (rankedResponse.ok) {
        const rankedData = await rankedResponse.json()
        setRankedStats(rankedData)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar jugador')
      setPlayerData(null)
      setMatches([])
      setRankedStats(null)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    playerData,
    matches,
    rankedStats,
    isLoading,
    error,
    searchPlayer
  }
}
