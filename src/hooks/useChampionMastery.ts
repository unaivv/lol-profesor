import { useState, useEffect } from 'react'
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
        const response = await fetch(`/api/mastery/${puuid}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch mastery data')
        }

        const data = await response.json()
        setMastery(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading mastery data')
        setMastery([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchMastery()
  }, [puuid])

  return { mastery, isLoading, error }
}
