import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { ChampionMastery } from '../types'

export function useChampionMastery(puuid: string | undefined) {
  const [mastery, setMastery] = useState<ChampionMastery[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!puuid) {
      setMastery([])
      return
    }

    const fetchMastery = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await invoke<ChampionMastery[]>('get_mastery', { puuid })
        setMastery(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        setMastery([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchMastery()
  }, [puuid])

  return { mastery, isLoading, error }
}
