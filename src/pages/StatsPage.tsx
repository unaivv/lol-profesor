import { useState, useEffect } from 'react'
import { PlayerStats } from '../components/PlayerStats'
import { MatchHistory } from '../components/MatchHistory'
import { ChampionStats } from '../components/ChampionStats'
import { RankedComparisonCard } from '../components/RankedComparisonCard'
import { SpectatorCard } from '../components/SpectatorCard'
import { ChampionMasteryCard } from '../components/ChampionMasteryCard'
import { PerformanceRadar } from '../components/PerformanceRadar'
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
  const flexRanked = isExtended ? (rankedData as any).flex : null
  const hasSoloRanked = soloRanked !== null && soloRanked !== undefined
  const hasFlexRanked = flexRanked !== null && flexRanked !== undefined
  const hasAnyRanked = hasSoloRanked || hasFlexRanked

  return (
    <div style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #f3e8ff 100%)', minHeight: '100vh' }}>
      <Header 
        variant="profile"
        actions={
          <button
            onClick={handleSearchNew}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6, #9333ea)',
              color: 'white',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            <Search size={18} />
            Buscar Otro
          </button>
        }
      />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Profile Header */}
        <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
              {playerData.gameName}
              <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 400 }}>#{playerData.tagLine}</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>
              Nivel {playerData.summonerLevel} • {playerData.region}
            </p>
          </div>
        </div>

        {/* Stats Overview Cards */}
        <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={24} color="#2563eb" />
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>{playerData.summonerLevel}</div>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Nivel</div>
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={24} color="#059669" />
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>{playerData.matches?.length || 0}</div>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Partidas</div>
            </div>
          </div>
          {/* Solo Duo Ranked */}
          {hasSoloRanked && (
            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={20} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clasificatorias</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {soloRanked.tier} {soloRanked.rank}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>{soloRanked.leaguePoints} LP</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{soloRanked.wins}G {soloRanked.losses}P</div>
              </div>
            </div>
          )}
          
          {/* Flex Ranked */}
          {hasFlexRanked && (
            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #ea580c, #c2410c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={20} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Flexible</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', background: 'linear-gradient(135deg, #ea580c, #c2410c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {flexRanked.tier} {flexRanked.rank}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>{flexRanked.leaguePoints} LP</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{flexRanked.wins}G {flexRanked.losses}P</div>
              </div>
            </div>
          )}
          
          {/* No Ranked */}
          {!hasAnyRanked && (
            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={24} color="#94a3b8" />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#94a3b8' }}>Unranked</div>
                <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Sin ranked</div>
              </div>
            </div>
          )}
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={24} color="#ea580c" />
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>{playerData.region}</div>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Región</div>
            </div>
          </div>
        </div>

        {/* Modern Tab Navigation - Design System */}
        <div style={{ padding: '20px', background: 'white', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', marginBottom: '24px' }}>
          <div className="flex flex-wrap gap-3 justify-center">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '14px 28px',
                    borderRadius: '12px',
                    fontWeight: '600',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    justifyContent: 'center',
                    flex: '1',
                    minWidth: '120px',
                    background: isActive ? 'linear-gradient(to right, #2563eb, #9333ea)' : '#f8fafc',
                    color: isActive ? 'white' : '#475569',
                    border: isActive ? 'none' : '1px solid #e2e8f0',
                    boxShadow: isActive ? '0 10px 15px -3px rgba(59, 130, 246, 0.3)' : 'none'
                  }}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ padding: '0 4px' }}>
          {activeTab === 'summary' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-8 space-y-6">
                <RankedComparisonCard rankedStats={playerData.rankedStats as any} />
                {hasMatches ? (
                  <MatchHistory matches={playerData.matches || []} playerPuuid={playerData.puuid} />
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
                <PlayerStats playerData={playerData} rankedStats={playerData.rankedStats} />
                <PerformanceRadar matches={playerData.matches || []} playerPuuid={playerData.puuid} />
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
