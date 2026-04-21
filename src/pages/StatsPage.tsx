import { useState, useEffect } from 'react'
import { PlayerStats } from '../components/PlayerStats'
import { MatchHistory } from '../components/MatchHistory'
import { ChampionStats } from '../components/ChampionStats'
import { RankedComparisonCard } from '../components/RankedComparisonCard'
import { SpectatorCard } from '../components/SpectatorCard'
import { ChampionMasteryCard } from '../components/ChampionMasteryCard'
import { Header } from '../components/layout/Header'
import { Footer } from '../components/layout/Footer'
import { PlayerData } from '../types/api'
import { Sparkles, Search, Trophy, Users, Star, Zap, Target } from 'lucide-react'

type TabId = 'summary' | 'champions' | 'mastery' | 'live'

// Helper function para formatear puntos
const formatPoints = (points: number): string => {
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1)}M`
  }
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}K`
  }
  return points.toString()
}

const tabs: { id: TabId; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'summary', label: 'Resumen', icon: Target, description: 'Estadísticas generales y historial' },
  { id: 'champions', label: 'Campeones', icon: Users, description: 'Rendimiento por campeón' },
  { id: 'mastery', label: 'Maestría', icon: Star, description: 'Progreso de maestría' },
  { id: 'live', label: 'En Vivo', icon: Zap, description: 'Partida en curso' },
]

export function StatsPage() {
  const [playerData, setPlayerData] = useState<PlayerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('summary')

  useEffect(() => {
    // Load player data from localStorage
    const storedData = localStorage.getItem('lolProfessorPlayer')
    if (storedData) {
      try {
        const data = JSON.parse(storedData)
        console.log('Loaded player data:', data)

        // Check if data has required fields (more lenient validation)
        if (data && data.puuid && data.gameName && data.tagLine) {
          setPlayerData(data)
        } else {
          console.error('Invalid player data structure - missing required fields')
          console.log('Data structure:', Object.keys(data || {}))
          window.location.href = '/'
        }
      } catch (error) {
        console.error('Error loading player data:', error)
        // Clear corrupted data and redirect
        localStorage.removeItem('lolProfessorPlayer')
        window.location.href = '/'
      }
    } else {
      // Redirect to landing page if no data found
      console.log('No player data found in localStorage')
      window.location.href = '/'
    }
    setIsLoading(false)
  }, [])


  const handleSearchNew = () => {
    window.location.href = '/'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl animate-pulse">
              <Sparkles size={40} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white animate-bounce" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Cargando estadísticas...
          </h2>
          <p className="text-slate-500">Preparando tu análisis profesional</p>
          <div className="mt-6 flex justify-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!playerData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Trophy size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">
            No hay datos del jugador
          </h2>
          <p className="text-slate-500 mb-6">
            Por favor, busca un jugador para ver sus estadísticas
          </p>
          <button
            onClick={handleSearchNew}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <Search size={18} />
            <span>Buscar Jugador</span>
          </button>
        </div>
      </div>
    )
  }

  const hasMatches = (playerData.matches?.length || 0) > 0

  // Manejar tanto RankedStats simple como RankedStatsExtended
  const rankedData = playerData.rankedStats
  const isExtended = rankedData && 'solo' in rankedData
  const soloRanked = isExtended ? (rankedData as any).solo : rankedData
  const hasRanked = soloRanked !== null && soloRanked !== undefined

  return (
    <div className="gradient-bg min-h-screen">
      <Header />

      <main className="container" style={{ paddingTop: '32px', paddingBottom: '32px' }}>
        {/* Profile Header */}
        <div className="stats-card mb-6">
          <div className="stats-card-header">
            <h1 className="hero-title" style={{ fontSize: '32px', marginBottom: '8px' }}>
              {playerData.gameName}
              <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 400 }}>#{playerData.tagLine}</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>
              Nivel {playerData.summonerLevel} • {playerData.region}
            </p>
          </div>
        </div>

        {/* Stats Overview Cards */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{playerData.summonerLevel}</div>
              <div className="text-xs text-slate-500">Nivel</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Target className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{playerData.matches?.length || 0}</div>
              <div className="text-xs text-slate-500">Partidas</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Star className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{hasRanked ? soloRanked.tier : '-'}</div>
              <div className="text-xs text-slate-500">Rango</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{playerData.region}</div>
              <div className="text-xs text-slate-500">Región</div>
            </div>
          </div>
        </div>

        {/* Modern Tab Navigation - Design System */}
        <div className="stats-card mb-6" style={{ padding: '16px' }}>
          <div className="flex flex-wrap gap-2 justify-center">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-button flex items-center gap-2 flex-1 min-w-[120px] justify-center ${isActive ? 'tab-button-active' : 'tab-button-inactive'}`}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'summary' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-8 space-y-6">
                <RankedComparisonCard rankedStats={playerData.rankedStats as any} />
                {hasMatches ? (
                  <MatchHistory matches={playerData.matches || []} />
                ) : (
                  <EmptyState
                    icon={Target}
                    title="Sin historial de partidas"
                    description="No se encontraron partidas recientes para este jugador."
                    action="Las partidas pueden tardar en aparecer si el jugador tiene privacidad activada."
                  />
                )}
              </div>
              <div className="xl:col-span-4 space-y-6">
                <SpectatorCard puuid={playerData.puuid} />
                <PlayerStats playerData={playerData} rankedStats={playerData.rankedStats} />
                {playerData.mastery && playerData.mastery.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      Top Maestría
                    </h3>
                    <div className="space-y-3">
                      {playerData.mastery.slice(0, 3).map((m, idx) => (
                        <ChampionMasteryCard key={idx} mastery={m} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'champions' && (
            hasMatches ? (
              <ChampionStats matches={playerData.matches?.filter(m => m.participants) || []} />
            ) : (
              <EmptyState
                icon={Users}
                title="Sin datos de campeones"
                description="Juega partidas para ver estadísticas por campeón."
              />
            )
          )}

          {activeTab === 'mastery' && (
            playerData.mastery && playerData.mastery.length > 0 ? (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                  <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Star className="w-6 h-6 text-yellow-500" />
                    Maestría de Campeones
                  </h2>
                  <p className="text-slate-500 mb-4">
                    {playerData.mastery.length} campeones • {formatPoints(playerData.mastery.reduce((acc, m) => acc + m.championPoints, 0))} puntos totales
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {playerData.mastery.map((m, idx) => (
                      <ChampionMasteryCard key={idx} mastery={m} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Star}
                title="Sin datos de maestría"
                description="No se encontraron datos de maestría para este jugador."
                action="Los datos de maestría pueden tardar en actualizarse."
              />
            )
          )}

          {activeTab === 'live' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-8">
                <SpectatorCard puuid={playerData.puuid} />
              </div>
              <div className="xl:col-span-4 space-y-6">
                <PlayerStats playerData={playerData} rankedStats={playerData.rankedStats} />
                <RankedComparisonCard rankedStats={playerData.rankedStats as any} />
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer playerData={playerData} showPlayerInfo={true} />
    </div>
  )
}

// Empty State Component
interface EmptyStateProps {
  icon: React.ElementType
  title: string
  description: string
  action?: string
}

function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
      <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 mb-3">{description}</p>
      {action && (
        <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 inline-block">
          {action}
        </p>
      )}
    </div>
  )
}
