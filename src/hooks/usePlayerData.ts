import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { PlayerData, DetailedMatch } from '../types'

export function usePlayerData() {
  const [playerData, setPlayerData] = useState<PlayerData | null>(null)
  const [matches, setMatches] = useState<DetailedMatch[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchPlayer = async (searchQuery: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const [gameName, tagLine] = searchQuery.includes('#')
        ? searchQuery.split('#')
        : [searchQuery, '']

      const response = await invoke<any>('get_comprehensive_player', {
        gameName,
        tagLine,
        region: 'EUW',
      })
      const data = response.data

      setPlayerData({
        puuid: data.puuid,
        summonerId: data.summonerId,
        gameName: data.gameName,
        tagLine: data.tagLine,
        summonerLevel: data.summonerLevel,
        profileIconId: data.profileIconId,
        region: data.region,
        rankedStats: data.rankedStats ?? null,
        mastery: data.mastery ?? [],
        currentGame: data.currentGame ?? null,
      })

      setMatches(data.matches ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setPlayerData(null)
      setMatches([])
    } finally {
      setIsLoading(false)
    }
  }

  return {
    playerData,
    matches,
    rankedStats: playerData?.rankedStats ?? null,
    isLoading,
    error,
    searchPlayer,
  }
}
