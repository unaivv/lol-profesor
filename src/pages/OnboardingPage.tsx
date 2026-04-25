import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMyProfile } from '../hooks/useMyProfile'

const REGIONS = ['EUW', 'EUN', 'NA', 'KR', 'JP', 'BR', 'LAN', 'LAS', 'OCE', 'TR', 'RU']

export function OnboardingPage() {
  const navigate = useNavigate()
  const { setMyProfile } = useMyProfile()
  const [input, setInput] = useState('')
  const [region, setRegion] = useState('EUW')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmed = input.trim()
    if (!trimmed) {
      setError('Ingresá tu Riot ID')
      return
    }

    let gameName = trimmed
    let tagLine = region

    if (trimmed.includes('#')) {
      const [name, tag] = trimmed.split('#')
      gameName = name.trim()
      tagLine = (tag || region).trim()
    }

    if (!gameName) {
      setError('El nombre no puede estar vacío')
      return
    }

    setMyProfile({ region, gameName, tagLine })
    navigate('/me')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <img
            src="/logo_sin_texto_sin_fondo.png"
            alt="LoL Professor"
            style={{ width: '64px', height: '64px', objectFit: 'contain', marginBottom: '16px' }}
          />
          <h1 style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
            LoL Professor
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            ¿Cuál es tu invocador?
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Región
            </label>
            <select
              value={region}
              onChange={e => setRegion(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '14px',
                outline: 'none',
              }}
            >
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Riot ID
            </label>
            <input
              type="text"
              value={input}
              onChange={e => { setInput(e.target.value); setError(null) }}
              placeholder="TuNombre#EUW"
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#1e293b',
                border: `1px solid ${error ? '#ef4444' : '#334155'}`,
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {error && (
              <p style={{ color: '#f87171', fontSize: '12px', marginTop: '6px' }}>{error}</p>
            )}
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              background: '#2563eb',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Continuar
          </button>
        </form>
      </div>
    </div>
  )
}
