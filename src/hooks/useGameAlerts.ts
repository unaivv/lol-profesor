import { useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useNavigate, useLocation } from 'react-router-dom'
import { useFavorites, FavoriteSummoner } from './useFavorites'
import { useNotifications } from '../context/NotificationContext'

interface LiveGameMinimal {
  gameId: number | string
}

interface SummonerBasic {
  puuid: string
  gameName?: string
  tagLine?: string
}

const POLL_INTERVAL_MS = 60_000
const STAGGER_MS = 500

async function resolvePuuid(fav: FavoriteSummoner): Promise<string | null> {
  try {
    const result = await invoke<SummonerBasic>('get_summoner', {
      gameName: fav.gameName,
      tagLine: fav.tagLine,
    })
    return result?.puuid ?? null
  } catch {
    return null
  }
}

async function checkLiveGame(puuid: string): Promise<boolean> {
  try {
    const data = await invoke<LiveGameMinimal | null>('get_live_game', { puuid })
    return data !== null && data !== undefined
  } catch {
    return false
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function useGameAlerts(): void {
  const { getFavorites } = useFavorites()
  const { push } = useNotifications()
  const navigate = useNavigate()
  const location = useLocation()

  // puuid -> true for favorites currently known to be in game
  const inGameSet = useRef<Set<string>>(new Set())
  // gameName#tagLine/region -> puuid cache so we don't re-resolve every tick
  const puuidCache = useRef<Map<string, string>>(new Map())
  // track whether first poll is done (suppress alerts on initial load)
  const initialized = useRef(false)

  useEffect(() => {
    let stopped = false

    const favKey = (fav: FavoriteSummoner) =>
      `${fav.gameName.toLowerCase()}#${fav.tagLine.toLowerCase()}/${fav.region}`

    // Returns the player path that would be open for this favorite
    const playerPath = (fav: FavoriteSummoner) =>
      `/player/${fav.region}/${encodeURIComponent(fav.gameName)}/${encodeURIComponent(fav.tagLine)}`

    const poll = async () => {
      if (stopped) return
      const favorites = getFavorites()

      for (let i = 0; i < favorites.length; i++) {
        if (stopped) break
        if (i > 0) await sleep(STAGGER_MS)

        const fav = favorites[i]
        const key = favKey(fav)

        // Resolve puuid (cached)
        let puuid = puuidCache.current.get(key) ?? null
        if (!puuid) {
          puuid = await resolvePuuid(fav)
          if (!puuid) continue
          puuidCache.current.set(key, puuid)
        }

        const isInGame = await checkLiveGame(puuid)
        const wasInGame = inGameSet.current.has(puuid)

        if (isInGame && !wasInGame) {
          inGameSet.current.add(puuid)

          // Skip alert if this is the initial population pass
          if (!initialized.current) continue

          // Skip alert if user is already viewing this player's profile
          if (location.pathname === playerPath(fav)) continue

          const label = `${fav.gameName}#${fav.tagLine}`

          // In-app toast
          push({
            type: 'info',
            title: `${label} está en partida!`,
            action: {
              label: 'Ver partida',
              onClick: () =>
                navigate(
                  `/player/${fav.region}/${encodeURIComponent(fav.gameName)}/${encodeURIComponent(fav.tagLine)}`
                ),
            },
            timeout: 10_000,
          })

          // Native OS notification (best-effort)
          try {
            const { isPermissionGranted, requestPermission, sendNotification } =
              await import('@tauri-apps/plugin-notification')

            let granted = await isPermissionGranted()
            if (!granted) {
              const permission = await requestPermission()
              granted = permission === 'granted'
            }
            if (granted) {
              sendNotification({
                title: 'LoL Professor',
                body: `${label} está en partida!`,
              })
            }
          } catch {
            // Plugin not available or permission denied — silent
          }
        } else if (!isInGame && wasInGame) {
          inGameSet.current.delete(puuid)
        }
      }

      initialized.current = true
    }

    // Run immediately, then on interval
    poll()
    const intervalId = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      stopped = true
      clearInterval(intervalId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
