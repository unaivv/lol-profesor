import { useState, useEffect } from 'react'
import { Radio, Users, Clock, Swords } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { SpectatorGameData, SpectatorParticipant, ParticipantRank } from '../types/api'
import { getChampionImageUrl, getSpellImageUrl } from '../utils/ddragon'

interface SpectatorCardProps {
  puuid: string | undefined
}

const QUEUE_NAMES: Record<number, string> = {
  420: 'Clasificatoria Solo/Duo',
  440: 'Clasificatoria Flex 5v5',
  450: 'ARAM',
  400: 'Normal 5v5',
  430: 'Normal Blind',
  700: 'Clash',
}

const MAP_NAMES: Record<number, string> = {
  11: 'Grieta del Invocador',
  12: 'Abismo de los Lamentos',
  21: 'Puente del Carnicero',
}

const SPELL_NAMES: Record<number, string> = {
  1:  'SummonerBoost',
  3:  'SummonerExhaust',
  4:  'SummonerFlash',
  6:  'SummonerHaste',
  7:  'SummonerHeal',
  11: 'SummonerSmite',
  12: 'SummonerTeleport',
  14: 'SummonerDot',
  21: 'SummonerBarrier',
  32: 'SummonerSnowball',
}

const TIER_COLORS: Record<string, string> = {
  IRON:        '#8B4513',
  BRONZE:      '#CD7F32',
  SILVER:      '#94a3b8',
  GOLD:        '#EAB308',
  PLATINUM:    '#22d3ee',
  EMERALD:     '#34d399',
  DIAMOND:     '#60a5fa',
  MASTER:      '#c084fc',
  GRANDMASTER: '#f87171',
  CHALLENGER:  '#fbbf24',
  UNRANKED:    '#475569',
}

const TIER_ABBR: Record<string, string> = {
  IRON: 'I', BRONZE: 'B', SILVER: 'S', GOLD: 'G',
  PLATINUM: 'P', EMERALD: 'E', DIAMOND: 'D',
  MASTER: 'M', GRANDMASTER: 'GM', CHALLENGER: 'CH',
  UNRANKED: 'NR',
}

const getSpellIcon = (spellId: number): string =>
  getSpellImageUrl(SPELL_NAMES[spellId] || 'SummonerFlash')

const formatGameLength = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const getDisplayName = (p: SpectatorParticipant): string => {
  if (p.riotId) return p.riotId
  if (p.summonerName) return p.summonerName
  return 'Jugador'
}

function RankBadge({ rank }: { rank: ParticipantRank | undefined }) {
  if (!rank) return null
  const color = TIER_COLORS[rank.tier] ?? TIER_COLORS.UNRANKED
  const abbr  = TIER_ABBR[rank.tier]  ?? 'NR'
  const wr    = rank.wins + rank.losses > 0
    ? Math.round((rank.wins / (rank.wins + rank.losses)) * 100)
    : null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
      <span style={{
        fontSize: '10px', fontWeight: 700, color,
        background: `${color}22`, borderRadius: '3px',
        padding: '0 4px', lineHeight: '15px',
      }}>
        {abbr}{rank.rank ? ` ${rank.rank}` : ''}
      </span>
      {wr !== null && (
        <span style={{ fontSize: '10px', color: '#64748b' }}>
          {wr}% WR
        </span>
      )}
    </div>
  )
}

function ParticipantRow({
  participant,
  isBlue,
  rank,
}: {
  participant: SpectatorParticipant
  isBlue: boolean
  rank: ParticipantRank | undefined
}) {
  const bg = isBlue
    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800'
    : 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800'

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${bg}`}>
      <img
        src={getChampionImageUrl(participant.championId)}
        alt=""
        className="w-8 h-8 rounded-lg flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
          {getDisplayName(participant)}
        </p>
        <div className="flex items-center gap-1">
          <img src={getSpellIcon(participant.spell1Id)} alt="" className="w-3.5 h-3.5 rounded-sm" />
          <img src={getSpellIcon(participant.spell2Id)} alt="" className="w-3.5 h-3.5 rounded-sm" />
        </div>
      </div>
      <RankBadge rank={rank} />
    </div>
  )
}

export function SpectatorCard({ puuid }: SpectatorCardProps) {
  const [game, setGame] = useState<SpectatorGameData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!puuid) return

    const checkGame = async () => {
      setLoading(true)
      try {
        const data = await invoke<SpectatorGameData | null>('get_live_game_with_ranks', { puuid })
        setGame(data)
      } catch {
        setGame(null)
      } finally {
        setLoading(false)
      }
    }

    checkGame()
    const interval = setInterval(checkGame, 30_000)
    return () => clearInterval(interval)
  }, [puuid])

  if (loading && !game) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center animate-pulse">
            <Radio className="w-5 h-5 text-slate-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Partida en Vivo</h2>
        </div>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Clock className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Verificando partida activa...</p>
        </div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Radio className="w-5 h-5 text-slate-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Partida en Vivo</h2>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">No hay partida activa</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">El jugador no está en una partida en este momento</p>
        </div>
      </div>
    )
  }

  const blueTeam = game.participants.filter(p => p.teamId === 100)
  const redTeam  = game.participants.filter(p => p.teamId === 200)
  const ranks    = game.participantRanks ?? []
  const queueName = QUEUE_NAMES[game.gameQueueConfigId] || `Cola ${game.gameQueueConfigId}`
  const mapName   = MAP_NAMES[game.mapId] || `Mapa ${game.mapId}`

  const bans     = (game.bannedChampions ?? []).filter(b => b.championId !== -1)
  const blueBans = bans.filter(b => b.teamId === 100)
  const redBans  = bans.filter(b => b.teamId === 200)
  const hasBans  = blueBans.length > 0 || redBans.length > 0

  const getRank = (p: SpectatorParticipant) =>
    ranks.find(r => r.puuid === (p as any).puuid)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center animate-pulse">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            EN VIVO
            <span className="text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
              {formatGameLength(game.gameLength)}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{queueName} · {mapName}</p>
        </div>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-xs font-bold text-blue-600 mb-2 flex items-center gap-1">
            <Swords className="w-3.5 h-3.5" /> EQUIPO AZUL
          </h3>
          <div className="space-y-1">
            {blueTeam.map((p, i) => (
              <ParticipantRow key={i} participant={p} isBlue={true} rank={getRank(p)} />
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1">
            <Swords className="w-3.5 h-3.5" /> EQUIPO ROJO
          </h3>
          <div className="space-y-1">
            {redTeam.map((p, i) => (
              <ParticipantRow key={i} participant={p} isBlue={false} rank={getRank(p)} />
            ))}
          </div>
        </div>
      </div>

      {/* Bans */}
      {hasBans && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
          <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Baneos</h4>
          <div className="flex justify-between">
            <div className="flex gap-1">
              {blueBans.map((ban, i) => (
                <img key={i} src={getChampionImageUrl(ban.championId)} alt="" className="w-6 h-6 rounded opacity-60" />
              ))}
            </div>
            <div className="flex gap-1">
              {redBans.map((ban, i) => (
                <img key={i} src={getChampionImageUrl(ban.championId)} alt="" className="w-6 h-6 rounded opacity-60" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
