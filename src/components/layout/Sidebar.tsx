import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { Home, Users, Star, Zap, Settings, Search, Loader2, AlertCircle, User } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { useMyProfile } from '../../hooks/useMyProfile'
import { useFavorites } from '../../hooks/useFavorites'
import { FavoriteItem } from './FavoriteItem'
import { getProfileIconUrl } from '../../utils/ddragon'

const REGIONS = ['EUW', 'EUN', 'NA', 'KR', 'JP', 'BR', 'LAN', 'LAS', 'OCE', 'TR', 'RU']

const NAV_TABS = [
  { id: 'summary', label: 'Resumen', icon: Home },
  { id: 'champions', label: 'Campeones', icon: Users },
  { id: 'mastery', label: 'Maestría', icon: Star },
  { id: 'live', label: 'En Vivo', icon: Zap },
]

const BG = '#0f172a'
const BORDER = '#1e293b'
const ACTIVE_BG = 'rgba(59, 130, 246, 0.12)'
const ACTIVE_BORDER = '#3b82f6'
const TEXT = '#f1f5f9'
const TEXT_MUTED = '#64748b'

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { getMyProfile } = useMyProfile()
  const { getFavorites, removeFavorite } = useFavorites()
  const myProfile = getMyProfile()
  const [favorites, setFavorites] = useState(getFavorites)
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('EUW')
  const [searching, setSearching] = useState(false)
  const [searchErr, setSearchErr] = useState<string | null>(null)
  const [iconError, setIconError] = useState(false)

  const readProfileIconId = () => {
    try {
      const raw = localStorage.getItem('lolProfessorMyProfileData')
      const cached = raw ? JSON.parse(raw) : null
      if (cached && myProfile) {
        if (cached.gameName === myProfile.gameName && cached.tagLine === myProfile.tagLine) {
          return cached.profileIconId || 1
        }
      }
    } catch { /* ignore */ }
    return 1
  }

  const [profileIconId, setProfileIconId] = useState(readProfileIconId)

  useEffect(() => {
    const refresh = () => {
      setProfileIconId(readProfileIconId())
      setIconError(false)
    }
    window.addEventListener('myProfileDataChanged', refresh)
    return () => window.removeEventListener('myProfileDataChanged', refresh)
  }, [myProfile?.gameName, myProfile?.tagLine])

  const [myUserLive, setMyUserLive] = useState(false)

  useEffect(() => {
    if (!myProfile) { setMyUserLive(false); return }

    const getPuuid = (): string | null => {
      try {
        const raw = localStorage.getItem('lolProfessorMyProfileData')
        const data = raw ? JSON.parse(raw) : null
        if (data?.gameName === myProfile.gameName && data?.tagLine === myProfile.tagLine) {
          return data?.puuid ?? null
        }
      } catch { /* ignore */ }
      return null
    }

    const check = async () => {
      const puuid = getPuuid()
      if (!puuid) return
      try {
        const game = await invoke<unknown>('get_live_game', { puuid })
        setMyUserLive(!!game)
      } catch {
        setMyUserLive(false)
      }
    }

    check()
    const interval = setInterval(check, 60_000)

    // Re-check immediately when profile data lands (puuid may not be available yet on first login)
    window.addEventListener('myProfileDataChanged', check)
    return () => {
      clearInterval(interval)
      window.removeEventListener('myProfileDataChanged', check)
    }
  }, [myProfile?.gameName, myProfile?.tagLine])

  useEffect(() => {
    setFavorites(getFavorites())
  }, [location.pathname])

  useEffect(() => {
    const refresh = () => setFavorites(getFavorites())
    window.addEventListener('favoritesChanged', refresh)
    return () => window.removeEventListener('favoritesChanged', refresh)
  }, [])

  const onPlayerPage = location.pathname === '/me' || location.pathname.startsWith('/player/')
  const onSettings = location.pathname === '/settings'
  const activeTab = searchParams.get('tab') || 'summary'

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearchErr(null)
    setSearching(true)

    let gameName = query.trim()
    let tagLine = region

    if (gameName.includes('#')) {
      const [name, tag] = gameName.split('#')
      gameName = name
      tagLine = tag || region
    }

    navigate(`/player/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`)
    setQuery('')
    setSearching(false)
  }

  const navBtn = (active: boolean) => ({
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '7px 10px',
    borderRadius: '6px',
    border: 'none',
    borderLeft: `3px solid ${active ? ACTIVE_BORDER : 'transparent'}`,
    background: active ? ACTIVE_BG : 'transparent',
    cursor: 'pointer',
    color: active ? '#93c5fd' : TEXT_MUTED,
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    textAlign: 'left' as const,
    marginBottom: '1px',
    transition: 'background 0.1s, color 0.1s',
  })

  return (
    <div style={{ width: '220px', height: '100%', background: BG, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${BORDER}`, flexShrink: 0 }}>

      {/* Logo */}
      <div style={{ padding: '16px 14px 14px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src="/logo_sin_texto_sin_fondo.png" alt="" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
        <span style={{ color: TEXT, fontWeight: 700, fontSize: '14px', letterSpacing: '-0.01em' }}>LoL Profesor</span>
      </div>

      {/* Mi Perfil */}
      <div style={{ padding: '10px 8px', borderBottom: `1px solid ${BORDER}` }}>
        {myProfile ? (
          <button
            onClick={() => navigate('/me')}
            style={{
              ...navBtn(location.pathname === '/me'),
              padding: '8px 10px',
            }}
          >
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {iconError ? (
                <User size={18} color={TEXT_MUTED} />
              ) : (
                <img
                  src={getProfileIconUrl(profileIconId)}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() => setIconError(true)}
                />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: TEXT, fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {myProfile.gameName}
              </div>
              <div style={{ color: TEXT_MUTED, fontSize: '10px' }}>
                {myProfile.region} · Mi perfil
              </div>
            </div>
          </button>
        ) : (
          <button onClick={() => navigate('/onboarding')} style={{ ...navBtn(false), color: TEXT_MUTED }}>
            <User size={15} />
            Configurar perfil
          </button>
        )}
      </div>

      {/* Buscar */}
      <div style={{ padding: '10px 8px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ color: TEXT_MUTED, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', paddingLeft: '2px' }}>
          Buscar jugador
        </div>
        <form onSubmit={handleSearch}>
          <select
            value={region}
            onChange={e => setRegion(e.target.value)}
            style={{ width: '100%', padding: '5px 6px', background: '#1e293b', border: `1px solid ${BORDER}`, borderRadius: '5px', color: TEXT, fontSize: '11px', marginBottom: '5px', outline: 'none' }}
          >
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setSearchErr(null) }}
              placeholder="Nombre#Tag"
              style={{ flex: 1, padding: '5px 7px', background: '#1e293b', border: `1px solid ${BORDER}`, borderRadius: '5px', color: TEXT, fontSize: '11px', outline: 'none', minWidth: 0 }}
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              style={{ padding: '5px 8px', background: '#2563eb', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
            >
              {searching ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={13} />}
            </button>
          </div>
          {searchErr && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: '#f87171', fontSize: '10px' }}>
              <AlertCircle size={10} />
              {searchErr}
            </div>
          )}
        </form>
      </div>

      {/* Nav tabs */}
      {onPlayerPage && (
        <div style={{ padding: '10px 8px', flex: 1 }}>
          <div style={{ color: TEXT_MUTED, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', paddingLeft: '2px' }}>
            Vista
          </div>
          {NAV_TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            const liveHighlight = tab.id === 'live' && myUserLive
            return (
              <button
                key={tab.id}
                onClick={() => tab.id === 'live' ? navigate('/me?tab=live') : setSearchParams({ tab: tab.id })}
                style={{
                  ...navBtn(active),
                  color: liveHighlight ? '#eab308' : (active ? '#93c5fd' : TEXT_MUTED),
                }}
              >
                <Icon
                  size={14}
                  fill={liveHighlight ? '#eab308' : 'none'}
                  style={liveHighlight ? { animation: 'zapGlow 1.4s ease-in-out infinite' } : {}}
                />
                {tab.label}
              </button>
            )
          })}
        </div>
      )}

      {!onPlayerPage && <div style={{ flex: 1 }} />}

      {/* Favoritos */}
      {favorites.length > 0 && (
        <div style={{ padding: '10px 8px', borderTop: `1px solid ${BORDER}`, maxHeight: '220px', overflowY: 'auto' }}>
          <div style={{ color: TEXT_MUTED, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', paddingLeft: '2px' }}>
            Favoritos
          </div>
          {favorites.map(f => (
            <FavoriteItem
              key={`${f.region}-${f.gameName}-${f.tagLine}`}
              gameName={f.gameName}
              tagLine={f.tagLine}
              region={f.region}
              profileIconId={f.profileIconId}
              onClick={() => navigate(`/player/${f.region}/${encodeURIComponent(f.gameName)}/${encodeURIComponent(f.tagLine)}`)}
              onRemove={() => {
                removeFavorite(f.gameName, f.tagLine, f.region)
                setFavorites(getFavorites())
              }}
            />
          ))}
        </div>
      )}

      {/* Settings */}
      <div style={{ padding: '8px', borderTop: `1px solid ${BORDER}` }}>
        <button onClick={() => navigate('/settings')} style={navBtn(onSettings)}>
          <Settings size={14} />
          Configuración
        </button>
      </div>

      <style>{`
        @keyframes zapGlow {
          0%, 100% { filter: drop-shadow(0 0 3px #eab308); opacity: 1; }
          50%       { filter: drop-shadow(0 0 7px #fbbf24); opacity: 0.75; }
        }
      `}</style>
    </div>
  )
}
