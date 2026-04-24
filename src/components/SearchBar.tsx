import { useState } from 'react'
import { Search, User, Zap, Target, AlertCircle, Globe } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'

const REGIONS = [
  { value: 'EUW', label: 'EUW' },
  { value: 'EUN', label: 'EUN' },
  { value: 'NA', label: 'NA' },
  { value: 'KR', label: 'KR' },
  { value: 'JP', label: 'JP' },
  { value: 'BR', label: 'BR' },
  { value: 'LAN', label: 'LAN' },
  { value: 'LAS', label: 'LAS' },
  { value: 'OCE', label: 'OCE' },
  { value: 'TR', label: 'TR' },
  { value: 'RU', label: 'RU' },
]

interface SearchBarProps {
  onPlayerFound: (playerData: any) => void
  onError?: (error: string) => void
}

export function SearchBar({ onPlayerFound, onError }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('MeowthTeamRocket#TRCKT')
  const [selectedRegion, setSelectedRegion] = useState('EUW')
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

      const response = await invoke<any>('get_comprehensive_player', {
        gameName: summonerName,
        tagLine,
        region: selectedRegion,
      })
      const fullData = response.data

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
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ background: 'white', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
        {/* Decorative Header */}
        <div style={{ height: '140px', background: 'linear-gradient(135deg, #3b82f6, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
            Busca cualquier jugador
          </p>
        </div>

        <div style={{ padding: '40px', marginTop: '-40px' }}>
          <form onSubmit={handleSearch} style={{ background: 'white', borderRadius: '20px', padding: '40px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
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
              <p style={{ color: '#475569', fontSize: '18px' }}>
                Ingresa el nombre de invocador o Riot ID para obtener estadísticas detalladas
              </p>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', marginBottom: '16px' }}>
                <User size={20} />
                <span style={{ fontWeight: '600', fontSize: '18px' }}>Buscar Jugador</span>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {/* Region Selector */}
                <div style={{ position: 'relative' }}>
                  <Globe size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', zIndex: 2 }} />
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    style={{
                      appearance: 'none',
                      padding: '16px 36px 16px 40px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '600',
                      background: '#f9fafb',
                      cursor: 'pointer',
                      minWidth: '100px',
                      color: '#374151',
                    }}
                  >
                    {REGIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af' }}>▼</div>
                </div>

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
                  style={{
                    padding: '16px 32px',
                    fontSize: '16px',
                    borderRadius: '12px',
                    minWidth: '120px',
                    border: 'none',
                    cursor: isSearching || !searchQuery.trim() ? 'not-allowed' : 'pointer',
                    background: 'linear-gradient(135deg, #3b82f6, #9333ea)',
                    color: 'white',
                    fontWeight: '600',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.3s ease'
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

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
              <span style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: '500', background: '#dbeafe', color: '#1e40af', border: 'none' }}>Nombre de invocador</span>
              <span style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: '500', background: '#f3e8ff', color: '#6b21a8', border: 'none' }}>Formato: Nombre#Etiqueta</span>
              <span style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: '500', background: '#dcfce7', color: '#166534', border: 'none' }}>Datos en tiempo real</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
