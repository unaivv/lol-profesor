import { useState } from 'react'
import { Search, User, Sparkles, Zap, Target, AlertCircle } from 'lucide-react'

interface SearchBarProps {
  onPlayerFound: (playerData: any) => void
  onError?: (error: string) => void
}

export function SearchBar({ onPlayerFound, onError }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchSuccess, setSearchSuccess] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setSearchError(null)
    setSearchSuccess(null)

    try {
      // Parse search query for Riot ID format (Name#Tag)
      let summonerName = searchQuery.trim()
      let tagLine = 'EUW' // Default region

      if (summonerName.includes('#')) {
        const parts = summonerName.split('#')
        summonerName = parts[0]
        tagLine = parts[1] || 'EUW'
      }

      console.log('Searching for:', { summonerName, tagLine })

      // Call backend API
      const response = await fetch(`/api/player/${encodeURIComponent(summonerName)}/${encodeURIComponent(tagLine)}`)

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.log('Error response:', errorText)
        throw new Error(`Error ${response.status}: ${errorText}`)
      }

      console.log('Fetching comprehensive player data...')
      const comprehensiveResponse = await fetch(`/api/player/${encodeURIComponent(summonerName)}/${encodeURIComponent(tagLine)}/comprehensive`)

      if (!comprehensiveResponse.ok) {
        throw new Error('Error al cargar datos completos del jugador')
      }

      const fullData = await comprehensiveResponse.json()
      console.log('Comprehensive data received:', fullData)
      console.log('Matches:', fullData.matches?.length || 0)
      console.log('Mastery:', fullData.mastery?.length || 0)
      console.log('Current game:', fullData.currentGame ? 'Yes' : 'No')

      // Show success message
      setSearchSuccess(`Estadísticas cargadas: ${fullData.gameName}#${fullData.tagLine} • ${fullData.matches?.length || 0} partidas • ${fullData.mastery?.length || 0} campeones`)

      // Pass data to parent
      onPlayerFound(fullData)

    } catch (error) {
      console.error('Search error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error al buscar jugador'
      setSearchError(errorMessage)
      if (onError) {
        onError(errorMessage)
      }
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="search-container">
      <div className="search-card">
        {/* Decorative Header */}
        <div className="search-header">
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.2)' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, transparent, rgba(255, 255, 255, 0.1))' }}></div>
          </div>
          <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="search-header-content">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '64px', height: '64px', background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(10px)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={32} style={{ color: 'white' }} />
                  </div>
                  <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', background: '#fbbf24', borderRadius: '50%', animation: 'pulse 2s infinite' }}></div>
                </div>
                <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: 'white' }}>
                  LoL Professor
                </h1>
              </div>
              <p style={{ color: 'rgba(219, 234, 254, 1)', fontSize: '20px', fontWeight: '500' }}>
                Análisis Élite de Estadísticas de League of Legends
              </p>
            </div>
          </div>
        </div>

        <div className="search-body">
          <form onSubmit={handleSearch} className="search-form">
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6' }}>
                  <Zap size={20} />
                  <span style={{ fontWeight: '600' }}>Búsqueda Instantánea</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9333ea' }}>
                  <Target size={20} />
                  <span style={{ fontWeight: '600' }}>Datos Precisos</span>
                </div>
              </div>
              <p style={{ color: '#6b7280', fontSize: '18px' }}>
                Ingresa el nombre de invocador o Riot ID para obtener estadísticas detalladas
              </p>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', marginBottom: '16px' }}>
                <User size={20} />
                <span style={{ fontWeight: '600', fontSize: '18px' }}>Buscar Jugador</span>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search
                    size={20}
                    style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af',
                      transition: 'color 0.3s ease',
                      zIndex: 2
                    }}
                  />
                  <span
                    className="badge badge-primary"
                    style={{
                      position: 'absolute',
                      right: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '12px',
                      padding: '4px 8px',
                      zIndex: 2,
                      pointerEvents: 'none'
                    }}
                  >
                    Riot ID
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Faker#KR1"
                    style={{
                      width: '100%',
                      padding: '16px 100px 16px 50px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '16px',
                      transition: 'all 0.3s ease',
                      background: '#f9fafb',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6'
                      e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)'
                      e.target.style.background = 'white'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb'
                      e.target.style.boxShadow = 'none'
                      e.target.style.background = '#f9fafb'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="button-primary"
                  style={{
                    padding: '16px 32px',
                    fontSize: '16px',
                    borderRadius: '12px',
                    minWidth: '120px',
                    border: 'none',
                    cursor: isSearching || !searchQuery.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSearching ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <div className="loading-spinner"></div>
                      <span>Buscando...</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <Search size={18} />
                      <span>Buscar</span>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Error and Success Messages */}
            {searchError && (
              <div style={{
                padding: '12px 16px',
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} style={{ color: '#dc2626' }} />
                <span style={{ color: '#dc2626', fontSize: '14px' }}>{searchError}</span>
              </div>
            )}

            {searchSuccess && (
              <div style={{
                padding: '12px 16px',
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Target size={16} style={{ color: '#16a34a' }} />
                <span style={{ color: '#16a34a', fontSize: '14px' }}>{searchSuccess}</span>
              </div>
            )}

            <div className="search-badges">
              <span className="badge badge-primary">Nombre de invocador</span>
              <span className="badge badge-secondary">Formato: Nombre#Etiqueta</span>
              <span className="badge badge-success">Datos en tiempo real</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
