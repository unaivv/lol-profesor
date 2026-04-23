import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchBar } from '../components/SearchBar'
import { Header } from '../components/layout/Header'
import { Footer } from '../components/layout/Footer'
import { PlayerData, RankedStats, RankedStatsExtended } from '../types/api'
import { Sparkles, Trophy, Target, Shield, AlertCircle, Loader2 } from 'lucide-react'

// Helper para obtener solo ranked
function getSoloRanked(stats: RankedStats | RankedStatsExtended | null | undefined): RankedStats | null {
  if (!stats) return null
  if ('solo' in stats) return (stats as RankedStatsExtended).solo
  return stats as RankedStats
}

export function LandingPage() {
  const navigate = useNavigate()
  const [playerData, setPlayerData] = useState<PlayerData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePlayerFound = (data: PlayerData) => {
    console.log('Player found:', data)
    setPlayerData(data)
    setError(null)
    setIsLoading(false)

    // Store in localStorage
    const dataToStore = JSON.stringify(data)
    console.log('Storing data:', dataToStore)
    localStorage.setItem('lolProfessorPlayer', dataToStore)

    // Verify data was stored
    const storedData = localStorage.getItem('lolProfessorPlayer')
    console.log('Verification - stored data:', storedData)

    // Redirect to stats page with player info (same route as clicking user in matchDetails)
    const region = data.region || 'na1'
    const tagLine = data.tagLine || 'NA1'
    navigate(`/stats/${region}/${encodeURIComponent(data.gameName)}/${encodeURIComponent(tagLine)}`)
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
    setIsLoading(false)
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #f3e8ff 100%)', minHeight: '100vh' }}>
      {/* Generic Header */}
      <Header />

      {/* Hero Section */}
      <div style={{ padding: '80px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '16px', lineHeight: '1.2' }}>
            Analiza tu rendimiento como un{' '}
            <span style={{ background: 'linear-gradient(135deg, #3b82f6, #9333ea)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Profesional
            </span>
          </h2>
          <p style={{ fontSize: '20px', color: '#6b7280', maxWidth: '800px', margin: '0 auto 32px' }}>
            Estadísticas detalladas, historial completo de partidas y análisis en tiempo real para llevar tu juego al siguiente nivel
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 32px' }}>
          <SearchBar onPlayerFound={handlePlayerFound} onError={handleError} />

          {error && (
            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginBottom: '8px' }}>
                <AlertCircle size={16} style={{ color: '#dc2626' }} />
              </div>
              <p style={{ color: '#dc2626', fontWeight: '500' }}>{error}</p>
            </div>
          )}

          {isLoading && (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <Loader2 size={64} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
                <div style={{ position: 'absolute', top: 0, left: 0, width: '64px', height: '64px', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '50%', animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' }}></div>
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>Analizando Datos...</h3>
              <p style={{ color: '#6b7280' }}>Obteniendo información de Riot Games API</p>
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%', animation: 'bounce 1s infinite' }}></div>
                <div style={{ width: '8px', height: '8px', background: '#9333ea', borderRadius: '50%', animation: 'bounce 1s infinite', animationDelay: '0.15s' }}></div>
                <div style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%', animation: 'bounce 1s infinite', animationDelay: '0.3s' }}></div>
              </div>
            </div>
          )}

          {playerData && !isLoading && !error && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{
                maxWidth: '800px',
                margin: '0 auto',
                padding: '40px',
                background: 'white',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '2px solid #e5e7eb',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Decorative gradient overlay */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '120px',
                  background: 'linear-gradient(135deg, #3b82f6, #9333ea)',
                  zIndex: 0
                }}></div>

                {/* Player info */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                    <div style={{ position: 'relative' }}>
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${playerData.profileIconId || '1'}.png`}
                        alt="Champion"
                        className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg"
                        style={{
                          border: '4px solid white',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = 'https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/Aatrox.png'
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: '-4px',
                        right: '-4px',
                        background: '#10b981',
                        color: 'white',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        border: '3px solid white'
                      }}>
                        {playerData.summonerLevel || '1'}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '32px' }}>
                    <h2 style={{
                      fontSize: '32px',
                      fontWeight: 'bold',
                      color: 'white',
                      marginBottom: '8px',
                      textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      {playerData.gameName}#{playerData.tagLine}
                    </h2>
                    <p style={{
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '18px',
                      marginBottom: '8px'
                    }}>
                      Invocador Nivel {playerData.summonerLevel}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        {playerData.region || 'EUW'}
                      </div>
                      {(() => {
                        const soloRanked = getSoloRanked(playerData.rankedStats)
                        return soloRanked && (
                          <div style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}>
                            {soloRanked.tier} {soloRanked.rank}
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Stats preview */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '16px',
                    marginBottom: '32px',
                    padding: '0 20px'
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid #bae6fd'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0369a1', marginBottom: '4px' }}>
                        {playerData.matches?.length || 0}
                      </div>
                      <div style={{ fontSize: '14px', color: '#0c4a6e' }}>Partidas</div>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid #fbbf24'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706', marginBottom: '4px' }}>
                        {(() => {
                          const soloRanked = getSoloRanked(playerData.rankedStats)
                          return soloRanked ? `${soloRanked.wins + soloRanked.losses}` : '0'
                        })()}
                      </div>
                      <div style={{ fontSize: '14px', color: '#92400e' }}>Ranked</div>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid #86efac'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a', marginBottom: '4px' }}>
                        {(() => {
                          const soloRanked = getSoloRanked(playerData.rankedStats)
                          return soloRanked ? `${Math.round((soloRanked.wins / (soloRanked.wins + soloRanked.losses)) * 100)}%` : '0%'
                        })()}
                      </div>
                      <div style={{ fontSize: '14px', color: '#15803d' }}>Win Rate</div>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, #f3e8ff, #e9d5ff)',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid #d8b4fe'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#9333ea', marginBottom: '4px' }}>
                        {(() => {
                          const soloRanked = getSoloRanked(playerData.rankedStats)
                          return soloRanked ? soloRanked.leaguePoints : '0'
                        })()}
                      </div>
                      <div style={{ fontSize: '14px', color: '#7c3aed' }}>LP</div>
                    </div>
                  </div>

                  {/* Action button */}
                  <button
                    onClick={() => {
                      const region = playerData?.region || 'na1'
                      const tagLine = playerData?.tagLine || 'NA1'
                      navigate(`/stats/${region}/${encodeURIComponent(playerData?.gameName || '')}/${encodeURIComponent(tagLine)}`)
                    }}
                    className="button-primary"
                    style={{
                      padding: '16px 32px',
                      fontSize: '18px',
                      borderRadius: '12px',
                      width: '100%',
                      maxWidth: '400px',
                      margin: '0 auto',
                      display: 'block',
                      background: 'linear-gradient(135deg, #3b82f6, #9333ea)',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '600',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.25)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    Ver Estadísticas Completas
                  </button>

                  {/* Search another button */}
                  <button
                    onClick={() => {
                      setPlayerData(null)
                      localStorage.removeItem('lolProfessorPlayer')
                    }}
                    style={{
                      padding: '12px 24px',
                      fontSize: '16px',
                      borderRadius: '8px',
                      width: '100%',
                      maxWidth: '400px',
                      margin: '16px auto 0 auto',
                      display: 'block',
                      background: 'transparent',
                      color: '#6b7280',
                      border: '1px solid #d1d5db',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Buscar Otro Jugador
                  </button>
                </div>
              </div>
            </div>
          )}

          {!playerData && !isLoading && !error && (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ position: 'relative', marginBottom: '32px', display: 'inline-block' }}>
                <div style={{ width: '128px', height: '128px', background: 'linear-gradient(135deg, #dbeafe, #f3e8ff)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                  <Trophy size={64} style={{ color: '#3b82f6' }} />
                </div>
                <div style={{ position: 'absolute', top: '-8px', right: '-8px', width: '32px', height: '32px', background: '#fbbf24', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={16} style={{ color: 'white' }} />
                </div>
              </div>
              <h2 style={{ fontSize: '36px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>
                Comienza tu Análisis Profesional
              </h2>
              <p style={{ fontSize: '20px', color: '#6b7280', maxWidth: '600px', margin: '0 auto 32px' }}>
                Busca cualquier jugador de League of Legends para descubrir estadísticas detalladas,
                patrones de juego y áreas de mejora
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
                <div style={{ background: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', background: '#dbeafe', color: '#1e40af' }}>
                    <Target size={24} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>Estadísticas Precisas</h3>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>Datos en tiempo real directamente de Riot Games</p>
                </div>
                <div style={{ background: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', background: '#f3e8ff', color: '#6b21a8' }}>
                    <Shield size={24} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>Análisis Profundo</h3>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>Historial completo y métricas de rendimiento</p>
                </div>
                <div style={{ background: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', background: '#dcfce7', color: '#166534' }}>
                    <Trophy size={24} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>Mejora Continua</h3>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>Identifica fortalezas y áreas de oportunidad</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Generic Footer */}
      <Footer />
    </div>
  )
}
