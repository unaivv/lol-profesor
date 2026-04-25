import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Globe } from 'lucide-react'
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
      height: '100%',
      background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    }}>
      {/* Logo centrado */}
      <div style={{ textAlign: 'center', marginBottom: '56px' }}>
        <img
          src="/logo_sin_fondo.png"
          alt="LoL Professor"
          style={{ height: '90px', objectFit: 'contain', display: 'block', margin: '0 auto 20px' }}
        />
        <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>
          ¿Cuál es tu nombre de invocador?
        </p>
      </div>

      {/* Card de búsqueda */}
      <div style={{
        width: '100%',
        maxWidth: '680px',
        background: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid #334155',
        borderRadius: '16px',
        padding: '32px',
        backdropFilter: 'blur(12px)',
      }}>
        <form onSubmit={handleSubmit}>
          {/* Fila horizontal: región + input + botón */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
            {/* Región */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Globe size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
              <select
                value={region}
                onChange={e => setRegion(e.target.value)}
                style={{
                  height: '100%',
                  padding: '0 32px 0 32px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  color: '#f1f5f9',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  minWidth: '90px',
                }}
              >
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '10px', pointerEvents: 'none' }}>▼</span>
            </div>

            {/* Input */}
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                value={input}
                onChange={e => { setInput(e.target.value); setError(null) }}
                placeholder="Faker#KR1"
                autoFocus
                style={{
                  width: '100%',
                  height: '50px',
                  padding: '0 16px',
                  background: '#0f172a',
                  border: `1px solid ${error ? '#ef4444' : '#334155'}`,
                  borderRadius: '10px',
                  color: '#f1f5f9',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
                onFocus={e => { e.target.style.borderColor = '#3b82f6' }}
                onBlur={e => { e.target.style.borderColor = error ? '#ef4444' : '#334155' }}
              />
            </div>

            {/* Botón */}
            <button
              type="submit"
              style={{
                height: '50px',
                padding: '0 24px',
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              <Search size={16} />
              Continuar
            </button>
          </div>

          {error && (
            <p style={{ color: '#f87171', fontSize: '13px', marginTop: '10px', marginBottom: 0 }}>{error}</p>
          )}

          <p style={{ color: '#475569', fontSize: '12px', marginTop: '14px', marginBottom: 0 }}>
            Formato: <span style={{ color: '#64748b' }}>NombreDeInvocador#Tag</span> — el tag suele ser tu región (ej: EUW, NA1, KR1)
          </p>
        </form>
      </div>
    </div>
  )
}
