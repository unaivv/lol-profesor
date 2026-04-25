import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { PlayerStats } from '../components/PlayerStats'
import { StatsOverview } from '../components/StatsOverview'
import { MatchHistory } from '../components/MatchHistory'
import { ChampionStats } from '../components/ChampionStats'
import { RankedComparisonCard } from '../components/RankedComparisonCard'
import { SpectatorCard } from '../components/SpectatorCard'
import { ChampionMasteryCard } from '../components/ChampionMasteryCard'
import { PerformanceRadar } from '../components/PerformanceRadar'
import { MostPlayedChampions } from '../components/MostPlayedChampions'
import { ProfileHeader } from '../components/ProfileHeader'
import { PlayerData } from '../types/api'
import { Trophy, Star, Target, X } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { useMyProfile } from '../hooks/useMyProfile'

type TabId = 'summary' | 'champions' | 'mastery' | 'live'

const formatPoints = (points: number): string => {
  if (points >= 1000000) return `${(points / 1000000).toFixed(1)}M`
  if (points >= 1000) return `${(points / 1000).toFixed(1)}K`
  return points.toString()
}

export function StatsPage() {
  const params = useParams<{ region?: string; gameName?: string; tagLine?: string }>()
  const { getMyProfile } = useMyProfile()
  const [searchParams] = useSearchParams()
  const activeTab = (searchParams.get('tab') || 'summary') as TabId

  const [playerData, setPlayerData] = useState<PlayerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cachedAt, setCachedAt] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [extendedMatches, setExtendedMatches] = useState<any[] | null>(null)
  const [loadingExtended, setLoadingExtended] = useState(false)

  const myProfile = getMyProfile()
  const urlRegion = params.region
  const urlGameName = params.gameName
  const urlTagLine = params.tagLine

  // Use URL params if present (other player), fall back to myProfile (own profile at /me)
  const region = urlRegion || myProfile?.region
  const gameName = urlGameName || myProfile?.gameName
  const tagLine = urlTagLine || myProfile?.tagLine

  const handleRefresh = useCallback(async () => {
    if (!gameName || !tagLine || !region) return
    setIsRefreshing(true)
    try {
      const response = await invoke<any>('get_comprehensive_player', {
        gameName,
        tagLine,
        forceRefresh: true,
        region,
      })
      const player: PlayerData = { ...response.data, region }
      setPlayerData(player)
      setCachedAt(response.cachedAt ?? null)
      localStorage.setItem('lolProfessorPlayer', JSON.stringify(player))
      if (response.cachedAt) localStorage.setItem('lolProfessorCachedAt', response.cachedAt.toString())
    } catch (e) {
      console.error('Error refreshing player:', e)
    } finally {
      setIsRefreshing(false)
    }
  }, [gameName, tagLine, region])

  useEffect(() => {
    const loadPlayerData = async () => {
      if (!region || !gameName || !tagLine) {
        setError('No hay perfil configurado. Configurá tu perfil primero.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await invoke<any>('get_comprehensive_player', {
          gameName,
          tagLine,
          forceRefresh: false,
          region,
        })
        const player: PlayerData = { ...response.data, region }
        setPlayerData(player)
        setCachedAt(response.cachedAt ?? null)
        localStorage.setItem('lolProfessorPlayer', JSON.stringify(player))
        if (response.cachedAt) localStorage.setItem('lolProfessorCachedAt', response.cachedAt.toString())
      } catch {
        setError('Jugador no encontrado o error de conexión.')
      } finally {
        setIsLoading(false)
      }
    }

    loadPlayerData()
  }, [region, gameName, tagLine])

  useEffect(() => {
    if (activeTab !== 'champions' || !playerData?.puuid || extendedMatches !== null) return
    setLoadingExtended(true)
    invoke<any[]>('get_extended_match_details', { puuid: playerData.puuid, count: 100 })
      .then(data => setExtendedMatches(data))
      .catch(() => setExtendedMatches([]))
      .finally(() => setLoadingExtended(false))
  }, [activeTab, playerData?.puuid, extendedMatches])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px' }}>
        <img src="/logo_sin_texto_sin_fondo.png" alt="" style={{ width: '56px', height: '56px', objectFit: 'contain', marginBottom: '16px', opacity: 0.8, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Cargando estadísticas...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px' }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '32px', maxWidth: '360px', width: '100%', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <X size={32} style={{ color: '#ef4444', marginBottom: '12px' }} />
          <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '8px' }}>Error al cargar</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{error}</p>
        </div>
      </div>
    )
  }

  if (!playerData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px' }}>
        <Trophy size={32} style={{ color: '#94a3b8', marginBottom: '12px' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No hay datos del jugador</p>
      </div>
    )
  }

  const hasMatches = (playerData?.matches?.length || 0) > 0

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <ProfileHeader
          playerData={playerData}
          rankedStats={playerData.rankedStats as any}
          cachedAt={cachedAt}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      </div>

      <StatsOverview playerData={playerData} />

      <div style={{ marginTop: '20px' }}>
        {activeTab === 'summary' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8 space-y-6">
              <RankedComparisonCard rankedStats={playerData.rankedStats as any} />
              {hasMatches ? (
                <MatchHistory matches={playerData.matches || []} playerPuuid={playerData.puuid} currentPlayerData={playerData} />
              ) : (
                <EmptyState icon={Target} title="Sin historial de partidas" description="No se encontraron partidas recientes." />
              )}
            </div>
            <div className="xl:col-span-4 space-y-6">
              <PerformanceRadar matches={playerData.matches || []} playerPuuid={playerData.puuid} />
              <MostPlayedChampions matches={playerData.matches || []} playerPuuid={playerData.puuid} mastery={playerData.mastery || []} />
            </div>
          </div>
        )}

        {activeTab === 'champions' && (
          loadingExtended ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px' }}>
              <img src="/logo_sin_texto_sin_fondo.png" alt="" style={{ width: '48px', height: '48px', objectFit: 'contain', marginBottom: '16px', opacity: 0.6, animation: 'pulse 1.5s ease-in-out infinite' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Cargando últimas 100 partidas...</p>
            </div>
          ) : (
            <ChampionStats
              matches={extendedMatches ?? playerData.matches?.filter(m => m.participants) ?? []}
              playerPuuid={playerData.puuid}
              mastery={playerData.mastery || []}
            />
          )
        )}

        {activeTab === 'mastery' && (
          playerData.mastery && playerData.mastery.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-500" />
                Maestría de Campeones
              </h2>
              <p className="text-slate-500 mb-4">
                {playerData.mastery.length} campeones · {formatPoints(playerData.mastery.reduce((acc, m) => acc + m.championPoints, 0))} puntos
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {playerData.mastery.map((m, idx) => (
                  <ChampionMasteryCard key={idx} mastery={m} />
                ))}
              </div>
            </div>
          ) : (
            <EmptyState icon={Star} title="Sin datos de maestría" description="No se encontraron datos de maestría." />
          )
        )}

        {activeTab === 'live' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8">
              <SpectatorCard puuid={playerData.puuid} />
            </div>
            <div className="xl:col-span-4 space-y-6">
              <PlayerStats rankedStats={playerData.rankedStats} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface EmptyStateProps {
  icon: React.ElementType
  title: string
  description: string
}

function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-slate-400" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm">{description}</p>
    </div>
  )
}
