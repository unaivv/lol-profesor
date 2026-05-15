import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Search, Loader2, X, Users, Shield, Target, Trophy } from 'lucide-react'
import { PlayerData, RankedStats, RankedStatsExtended, DetailedMatch, Participant } from '../types/api'
import { getProfileIconUrl, getChampionImageUrlByName } from '../utils/ddragon'
import { getRankEmblemUrl } from '../lib/utils'

// ─── Region list ──────────────────────────────────────────────────────────────
const REGIONS = ['EUW', 'EUN', 'NA', 'KR', 'JP', 'BR', 'LAN', 'LAS', 'OCE', 'TR', 'RU']

// ─── Rank ordering helpers ────────────────────────────────────────────────────
const TIER_ORDER: Record<string, number> = {
  IRON: 0, BRONZE: 1, SILVER: 2, GOLD: 3, PLATINUM: 4,
  EMERALD: 5, DIAMOND: 6, MASTER: 7, GRANDMASTER: 8, CHALLENGER: 9,
}
const RANK_ORDER: Record<string, number> = { IV: 0, III: 1, II: 2, I: 3 }

function rankedScore(s: RankedStats | null): number {
  if (!s) return -1
  return (TIER_ORDER[s.tier] ?? -1) * 400 + (RANK_ORDER[s.rank] ?? 0) * 100 + s.leaguePoints
}

// ─── Extract solo/flex from RankedStatsExtended | RankedStats | null ─────────
function extractQueues(
  stats: PlayerData['rankedStats'],
): { solo: RankedStats | null; flex: RankedStats | null } {
  if (!stats) return { solo: null, flex: null }
  if ('solo' in stats) {
    return {
      solo: (stats as RankedStatsExtended).solo ?? null,
      flex: (stats as RankedStatsExtended).flex ?? null,
    }
  }
  // Legacy single-queue shape — treat as solo
  const s = stats as RankedStats
  if (s.queueType === 'RANKED_FLEX_SR') return { solo: null, flex: s }
  return { solo: s, flex: null }
}

// ─── Computed match stats ─────────────────────────────────────────────────────
interface MatchStats {
  winRate: number
  avgKDA: number
  avgCSMin: number
  avgDamage: number
  topChampions: { name: string; games: number; wins: number }[]
}

function computeMatchStats(matches: DetailedMatch[], puuid: string): MatchStats | null {
  if (!matches || matches.length === 0) return null

  const relevant = matches.slice(0, 20)
  let wins = 0
  let totalKDA = 0
  let totalCSMin = 0
  let totalDamage = 0
  let counted = 0
  const champMap: Record<string, { games: number; wins: number }> = {}

  for (const match of relevant) {
    const me: Participant | undefined = match.participants?.find(p => p.puuid === puuid)
    if (!me) continue
    counted++
    if (me.win) wins++

    const kda = (me.kills + me.assists) / Math.max(me.deaths, 1)
    totalKDA += kda

    const durationMin = (match.gameDuration || 1) / 60
    const cs = (me.totalMinionsKilled ?? 0)
    totalCSMin += cs / durationMin

    totalDamage += me.damageDealtToChampions ?? 0

    const champ = me.championName || 'Unknown'
    if (!champMap[champ]) champMap[champ] = { games: 0, wins: 0 }
    champMap[champ].games++
    if (me.win) champMap[champ].wins++
  }

  if (counted === 0) return null

  const topChampions = Object.entries(champMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 3)

  return {
    winRate: Math.round((wins / counted) * 100),
    avgKDA: Math.round((totalKDA / counted) * 100) / 100,
    avgCSMin: Math.round((totalCSMin / counted) * 10) / 10,
    avgDamage: Math.round(totalDamage / counted),
    topChampions,
  }
}

// ─── Player panel ─────────────────────────────────────────────────────────────
interface PanelState {
  playerData: PlayerData | null
  loading: boolean
  error: string | null
}

// ─── Search Panel ─────────────────────────────────────────────────────────────
interface SearchPanelProps {
  side: 'left' | 'right'
  state: PanelState
  onLoad: (data: PlayerData) => void
}

function SearchPanel({ side, state, onLoad }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('EUW')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setErr(null)
    setLoading(true)

    let gameName = query.trim()
    let tagLine = region
    if (gameName.includes('#')) {
      const [name, tag] = gameName.split('#')
      gameName = name
      tagLine = tag || region
    }

    try {
      const response = await invoke<any>('get_comprehensive_player', {
        gameName,
        tagLine,
        forceRefresh: false,
        region,
      })
      const player: PlayerData = { ...response.data, region }
      onLoad(player)
    } catch {
      setErr('Jugador no encontrado o error de conexión.')
    } finally {
      setLoading(false)
    }
  }

  // If already loaded, show a summary instead of search
  if (state.playerData) {
    const { playerData } = state
    const { solo } = extractQueues(playerData.rankedStats)
    const best = solo
    return (
      <div style={{
        background: side === 'left' ? 'rgba(30,41,59,0.8)' : 'rgba(15,23,42,0.9)',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <img
          src={getProfileIconUrl(playerData.profileIconId || 1)}
          alt=""
          style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {playerData.gameName}
            <span style={{ color: '#64748b', fontWeight: 400 }}>#{playerData.tagLine}</span>
          </div>
          <div style={{ color: '#64748b', fontSize: '11px' }}>
            {playerData.region} · Nv. {playerData.summonerLevel}
            {best ? ` · ${best.tier} ${best.rank}` : ' · Sin rango'}
          </div>
        </div>
        <button
          onClick={() => onLoad(null as any)}
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <select
          value={region}
          onChange={e => setRegion(e.target.value)}
          style={{
            width: '100%', padding: '7px 10px',
            background: '#1e293b', border: '1px solid #334155',
            borderRadius: '8px', color: '#f1f5f9', fontSize: '12px', outline: 'none',
          }}
        >
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <div style={{ display: 'flex', gap: '6px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setErr(null) }}
              placeholder="Nombre#Tag"
              style={{
                width: '100%', padding: '7px 10px 7px 28px',
                background: '#1e293b', border: '1px solid #334155',
                borderRadius: '8px', color: '#f1f5f9', fontSize: '12px',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            style={{
              padding: '7px 12px', background: '#2563eb', border: 'none',
              borderRadius: '8px', color: 'white', cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', flexShrink: 0,
              opacity: loading || !query.trim() ? 0.6 : 1,
            }}
          >
            {loading
              ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
              : <Search size={13} />
            }
            Buscar
          </button>
        </div>
        {err && (
          <div style={{ color: '#f87171', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <X size={10} />{err}
          </div>
        )}
      </div>
    </form>
  )
}

// ─── Comparison row ───────────────────────────────────────────────────────────
interface CompRowProps {
  label: string
  valA: string | number | null
  valB: string | number | null
  /** If provided, A wins if numA > numB (higherIsBetter=true) or numA < numB (false) */
  numA?: number | null
  numB?: number | null
  higherIsBetter?: boolean
  unit?: string
}

function CompRow({ label, valA, valB, numA, numB, higherIsBetter = true, unit = '' }: CompRowProps) {
  const hasNum = numA != null && numB != null
  const aWins = hasNum && higherIsBetter ? numA! > numB! : hasNum ? numA! < numB! : false
  const bWins = hasNum && higherIsBetter ? numB! > numA! : hasNum ? numB! < numA! : false

  const cellStyle = (winner: boolean): React.CSSProperties => ({
    flex: 1,
    textAlign: 'center',
    padding: '10px 12px',
    fontWeight: winner ? 700 : 400,
    color: winner ? '#4ade80' : '#94a3b8',
    background: winner ? 'rgba(74,222,128,0.07)' : 'transparent',
    fontSize: '13px',
    borderRadius: '6px',
    transition: 'background 0.15s',
  })

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      gap: '4px',
      alignItems: 'center',
      borderBottom: '1px solid rgba(51,65,85,0.5)',
      minHeight: '40px',
    }}>
      <div style={cellStyle(aWins)}>
        {valA != null ? `${valA}${unit}` : '—'}
      </div>
      <div style={{
        color: '#475569', fontSize: '10px', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        textAlign: 'center', whiteSpace: 'nowrap', padding: '0 8px', minWidth: '80px',
      }}>
        {label}
      </div>
      <div style={cellStyle(bWins)}>
        {valB != null ? `${valB}${unit}` : '—'}
      </div>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '10px 12px 8px',
      color: '#94a3b8', fontSize: '11px', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.07em',
      borderBottom: '1px solid #1e293b',
    }}>
      <Icon size={13} />
      {title}
    </div>
  )
}

// ─── Ranked section ───────────────────────────────────────────────────────────
function RankedSection({
  soloA, soloB, flexA, flexB,
}: {
  soloA: RankedStats | null; soloB: RankedStats | null
  flexA: RankedStats | null; flexB: RankedStats | null
}) {
  const wRateA = soloA ? Math.round(soloA.wins / (soloA.wins + soloA.losses) * 100) : null
  const wRateB = soloB ? Math.round(soloB.wins / (soloB.wins + soloB.losses) * 100) : null
  const wRateFA = flexA ? Math.round(flexA.wins / (flexA.wins + flexA.losses) * 100) : null
  const wRateFB = flexB ? Math.round(flexB.wins / (flexB.wins + flexB.losses) * 100) : null

  return (
    <>
      <SectionHeader icon={Target} title="Ranked Solo/Duo" />
      <CompRow
        label="Rango"
        valA={soloA ? `${soloA.tier} ${soloA.rank}` : 'Sin ranking'}
        valB={soloB ? `${soloB.tier} ${soloB.rank}` : 'Sin ranking'}
        numA={rankedScore(soloA)}
        numB={rankedScore(soloB)}
      />
      <CompRow
        label="LP"
        valA={soloA?.leaguePoints ?? null}
        valB={soloB?.leaguePoints ?? null}
        numA={soloA?.leaguePoints ?? null}
        numB={soloB?.leaguePoints ?? null}
      />
      <CompRow
        label="Win%"
        valA={wRateA} valB={wRateB}
        numA={wRateA} numB={wRateB}
        unit="%"
      />
      <CompRow
        label="V/D"
        valA={soloA ? `${soloA.wins}/${soloA.losses}` : null}
        valB={soloB ? `${soloB.wins}/${soloB.losses}` : null}
        numA={soloA ? soloA.wins : null}
        numB={soloB ? soloB.wins : null}
      />

      <SectionHeader icon={Trophy} title="Ranked Flex" />
      <CompRow
        label="Rango"
        valA={flexA ? `${flexA.tier} ${flexA.rank}` : 'Sin ranking'}
        valB={flexB ? `${flexB.tier} ${flexB.rank}` : 'Sin ranking'}
        numA={rankedScore(flexA)}
        numB={rankedScore(flexB)}
      />
      <CompRow
        label="LP"
        valA={flexA?.leaguePoints ?? null}
        valB={flexB?.leaguePoints ?? null}
        numA={flexA?.leaguePoints ?? null}
        numB={flexB?.leaguePoints ?? null}
      />
      <CompRow
        label="Win%"
        valA={wRateFA} valB={wRateFB}
        numA={wRateFA} numB={wRateFB}
        unit="%"
      />
    </>
  )
}

// ─── Match stats section ──────────────────────────────────────────────────────
function MatchStatsSection({ statsA, statsB }: { statsA: MatchStats | null; statsB: MatchStats | null }) {
  return (
    <>
      <SectionHeader icon={Shield} title="Forma reciente (20 partidas)" />
      <CompRow
        label="Win%"
        valA={statsA?.winRate ?? null} valB={statsB?.winRate ?? null}
        numA={statsA?.winRate ?? null} numB={statsB?.winRate ?? null}
        unit="%"
      />
      <CompRow
        label="KDA"
        valA={statsA?.avgKDA ?? null} valB={statsB?.avgKDA ?? null}
        numA={statsA?.avgKDA ?? null} numB={statsB?.avgKDA ?? null}
      />
      <CompRow
        label="CS/min"
        valA={statsA?.avgCSMin ?? null} valB={statsB?.avgCSMin ?? null}
        numA={statsA?.avgCSMin ?? null} numB={statsB?.avgCSMin ?? null}
      />
      <CompRow
        label="Daño/partida"
        valA={statsA ? statsA.avgDamage.toLocaleString() : null}
        valB={statsB ? statsB.avgDamage.toLocaleString() : null}
        numA={statsA?.avgDamage ?? null}
        numB={statsB?.avgDamage ?? null}
      />
    </>
  )
}

// ─── Top champions section ────────────────────────────────────────────────────
function TopChampionsSection({ statsA, statsB }: { statsA: MatchStats | null; statsB: MatchStats | null }) {
  const maxLen = Math.max(statsA?.topChampions.length ?? 0, statsB?.topChampions.length ?? 0)
  if (maxLen === 0) return null

  return (
    <>
      <SectionHeader icon={Users} title="Campeones más jugados" />
      {Array.from({ length: maxLen }).map((_, i) => {
        const cA = statsA?.topChampions[i]
        const cB = statsB?.topChampions[i]

        const champCell = (champ: typeof cA): React.ReactNode => {
          if (!champ) return <span style={{ color: '#475569' }}>—</span>
          const wr = Math.round((champ.wins / champ.games) * 100)
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
              <img
                src={getChampionImageUrlByName(champ.name)}
                alt={champ.name}
                style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover' }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
              <span style={{ fontSize: '12px', color: '#cbd5e1' }}>{champ.name}</span>
              <span style={{ fontSize: '11px', color: wr >= 50 ? '#4ade80' : '#f87171' }}>({wr}%)</span>
            </div>
          )
        }

        return (
          <div
            key={i}
            style={{
              display: 'grid', gridTemplateColumns: '1fr auto 1fr',
              gap: '4px', alignItems: 'center',
              borderBottom: '1px solid rgba(51,65,85,0.5)',
              minHeight: '38px', padding: '4px 0',
            }}
          >
            <div style={{ flex: 1, textAlign: 'center', padding: '4px 8px' }}>{champCell(cA)}</div>
            <div style={{ color: '#475569', fontSize: '10px', fontWeight: 600, textAlign: 'center', padding: '0 8px', minWidth: '80px' }}>
              #{i + 1}
            </div>
            <div style={{ flex: 1, textAlign: 'center', padding: '4px 8px' }}>{champCell(cB)}</div>
          </div>
        )
      })}
    </>
  )
}

// ─── Player column header ─────────────────────────────────────────────────────
function PlayerColumnHeader({ playerData, side }: { playerData: PlayerData; side: 'left' | 'right' }) {
  const { solo } = extractQueues(playerData.rankedStats)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
      padding: '16px 12px 12px',
      background: side === 'left' ? 'rgba(30,41,59,0.6)' : 'rgba(15,23,42,0.8)',
      borderBottom: '1px solid #1e293b',
    }}>
      <div style={{ position: 'relative' }}>
        <img
          src={getProfileIconUrl(playerData.profileIconId || 1)}
          alt=""
          style={{ width: '52px', height: '52px', borderRadius: '10px', objectFit: 'cover', border: '2px solid #334155' }}
        />
        {solo && (
          <img
            src={getRankEmblemUrl(solo.tier)}
            alt={solo.tier}
            style={{ position: 'absolute', bottom: '-8px', right: '-8px', width: '24px', height: '24px', objectFit: 'contain' }}
          />
        )}
      </div>
      <div style={{ textAlign: 'center', marginTop: '8px' }}>
        <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '14px' }}>
          {playerData.gameName}
          <span style={{ color: '#64748b', fontWeight: 400 }}>#{playerData.tagLine}</span>
        </div>
        <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
          {playerData.region} · Nv. {playerData.summonerLevel}
        </div>
      </div>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function ComparisonSkeleton() {
  const pulse: React.CSSProperties = {
    background: 'linear-gradient(90deg, #1e293b 25%, #263248 50%, #1e293b 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '6px',
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px' }}>
      {[0, 1].map(i => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ ...pulse, height: '80px' }} />
          {Array.from({ length: 8 }).map((_, j) => (
            <div key={j} style={{ ...pulse, height: '36px' }} />
          ))}
        </div>
      ))}
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  )
}

// ─── Main comparison view ─────────────────────────────────────────────────────
function ComparisonView({ dataA, dataB }: { dataA: PlayerData; dataB: PlayerData }) {
  const { solo: soloA, flex: flexA } = extractQueues(dataA.rankedStats)
  const { solo: soloB, flex: flexB } = extractQueues(dataB.rankedStats)

  const statsA = computeMatchStats(dataA.matches ?? [], dataA.puuid)
  const statsB = computeMatchStats(dataB.matches ?? [], dataB.puuid)

  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: '16px',
      overflow: 'hidden',
      marginTop: '16px',
    }}>
      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr' }}>
        <PlayerColumnHeader playerData={dataA} side="left" />
        <div style={{
          background: '#0f172a', borderBottom: '1px solid #1e293b',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#475569', fontSize: '10px', fontWeight: 700 }}>VS</span>
        </div>
        <PlayerColumnHeader playerData={dataB} side="right" />
      </div>

      {/* General */}
      <SectionHeader icon={Shield} title="General" />
      <CompRow
        label="Nivel"
        valA={dataA.summonerLevel}
        valB={dataB.summonerLevel}
        numA={dataA.summonerLevel}
        numB={dataB.summonerLevel}
      />

      {/* Ranked */}
      <RankedSection
        soloA={soloA} soloB={soloB}
        flexA={flexA} flexB={flexB}
      />

      {/* Match stats */}
      <MatchStatsSection statsA={statsA} statsB={statsB} />

      {/* Top champions */}
      <TopChampionsSection statsA={statsA} statsB={statsB} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function ComparisonPage() {
  const [panelA, setPanelA] = useState<PanelState>({ playerData: null, loading: false, error: null })
  const [panelB, setPanelB] = useState<PanelState>({ playerData: null, loading: false, error: null })

  const loadA = (data: PlayerData | null) =>
    setPanelA({ playerData: data, loading: false, error: null })
  const loadB = (data: PlayerData | null) =>
    setPanelB({ playerData: data, loading: false, error: null })

  const bothLoaded = panelA.playerData !== null && panelB.playerData !== null
  const eitherLoading = panelA.loading || panelB.loading

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Users size={18} color="white" />
        </div>
        <div>
          <h1 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '20px', margin: 0 }}>
            Comparar jugadores
          </h1>
          <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
            Buscá dos invocadores para comparar sus estadísticas lado a lado
          </p>
        </div>
      </div>

      {/* Search panels */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '8px',
      }}
        className="comparison-search-grid"
      >
        <div>
          <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
            Jugador A
          </div>
          <SearchPanel side="left" state={panelA} onLoad={loadA} />
        </div>
        <div>
          <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
            Jugador B
          </div>
          <SearchPanel side="right" state={panelB} onLoad={loadB} />
        </div>
      </div>

      {/* States */}
      {eitherLoading && <ComparisonSkeleton />}

      {!eitherLoading && bothLoaded && (
        <ComparisonView
          dataA={panelA.playerData!}
          dataB={panelB.playerData!}
        />
      )}

      {!eitherLoading && !bothLoaded && (
        <div style={{
          marginTop: '32px', textAlign: 'center', color: '#334155',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
        }}>
          <Users size={40} style={{ color: '#1e293b' }} />
          <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>
            {!panelA.playerData && !panelB.playerData
              ? 'Buscá dos jugadores para comenzar la comparación'
              : !panelA.playerData
                ? 'Falta el Jugador A'
                : 'Falta el Jugador B'}
          </p>
        </div>
      )}

      {/* Responsive override */}
      <style>{`
        @media (max-width: 600px) {
          .comparison-search-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
