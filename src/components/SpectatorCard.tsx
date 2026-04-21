import { useState, useEffect } from 'react'
import { Radio, Users, Clock, Swords } from 'lucide-react'
import { SpectatorGameData, SpectatorParticipant } from '../types/api'

interface SpectatorCardProps {
  puuid: string | undefined
}

const QUEUE_NAMES: Record<number, string> = {
  420: 'Clasificatoria Solo/Duo',
  440: 'Clasificatoria Flex 5v5',
  450: 'ARAM',
  400: 'Normal 5v5',
  430: 'Normal Blind',
  700: 'Clash'
}

const MAP_NAMES: Record<number, string> = {
  11: 'Grieta del Invocador',
  12: 'Abismo de los Lamentos (ARAM)',
  21: 'Puente del Carnicero'
}

const getChampionIcon = (championId: number): string => {
  return `https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${championId}.png`
}

const getSpellIcon = (spellId: number): string => {
  const spellMap: Record<number, string> = {
    1: 'SummonerBoost',      // Cleanse
    3: 'SummonerExhaust',    // Exhaust
    4: 'SummonerFlash',      // Flash
    6: 'SummonerHaste',      // Ghost
    7: 'SummonerHeal',       // Heal
    11: 'SummonerSmite',     // Smite
    12: 'SummonerTeleport',   // Teleport
    14: 'SummonerDot',       // Ignite
    21: 'SummonerBarrier',   // Barrier
    32: 'SummonerSnowball'   // Mark (ARAM)
  }
  const spellName = spellMap[spellId] || 'SummonerFlash'
  return `https://ddragon.leagueoflegends.com/cdn/14.5.1/img/spell/${spellName}.png`
}

const formatGameLength = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function ParticipantRow({ participant, isAlly }: { participant: SpectatorParticipant; isAlly: boolean }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${isAlly ? 'bg-blue-50 border border-blue-100' : 'bg-red-50 border border-red-100'}`}>
      <div className="relative">
        <img
          src={getChampionIcon(participant.championId)}
          alt="Champion"
          className="w-8 h-8 rounded-lg"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = 'https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/Aatrox.png'
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-700 truncate">{participant.summonerName}</p>
        <div className="flex gap-0.5 mt-0.5">
          <img src={getSpellIcon(participant.spell1Id)} alt="Spell 1" className="w-3.5 h-3.5 rounded-sm" />
          <img src={getSpellIcon(participant.spell2Id)} alt="Spell 2" className="w-3.5 h-3.5 rounded-sm" />
        </div>
      </div>
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
        const response = await fetch(`/api/spectator/${puuid}`)
        if (response.ok) {
          const data = await response.json()
          setGame(data)
        } else {
          setGame(null)
        }
      } catch (err) {
        setGame(null)
      } finally {
        setLoading(false)
      }
    }

    checkGame()

    // Auto-refresh every 30 seconds
    const interval = setInterval(checkGame, 30000)
    return () => clearInterval(interval)
  }, [puuid])

  if (loading && !game) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center animate-pulse">
            <Radio className="w-5 h-5 text-slate-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Partida en Vivo</h2>
        </div>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Clock className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">Verificando partida activa...</p>
        </div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <Radio className="w-5 h-5 text-slate-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Partida en Vivo</h2>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No hay partida activa</h3>
          <p className="text-sm text-slate-500">El jugador no está en una partida en este momento</p>
        </div>
      </div>
    )
  }

  const blueTeam = game.participants.filter(p => p.teamId === 100)
  const redTeam = game.participants.filter(p => p.teamId === 200)
  const queueName = QUEUE_NAMES[game.gameQueueConfigId] || `Cola ${game.gameQueueConfigId}`
  const mapName = MAP_NAMES[game.mapId] || `Mapa ${game.mapId}`

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center animate-pulse">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            EN VIVO
            <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {formatGameLength(game.gameLength)}
            </span>
          </h2>
          <p className="text-xs text-slate-500">{queueName} • {mapName}</p>
        </div>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-2 gap-4">
        {/* Blue Team */}
        <div>
          <h3 className="text-xs font-bold text-blue-600 mb-2 flex items-center gap-1">
            <Swords className="w-3.5 h-3.5" />
            EQUIPO AZUL
          </h3>
          <div className="space-y-1">
            {blueTeam.map((participant, idx) => (
              <ParticipantRow key={idx} participant={participant} isAlly={true} />
            ))}
          </div>
        </div>

        {/* Red Team */}
        <div>
          <h3 className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1">
            <Swords className="w-3.5 h-3.5" />
            EQUIPO ROJO
          </h3>
          <div className="space-y-1">
            {redTeam.map((participant, idx) => (
              <ParticipantRow key={idx} participant={participant} isAlly={false} />
            ))}
          </div>
        </div>
      </div>

      {/* Bans */}
      {game.bannedChampions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <h4 className="text-xs font-medium text-slate-500 mb-2">Baneos</h4>
          <div className="flex gap-4">
            <div className="flex gap-1">
              {game.bannedChampions.filter(b => b.teamId === 100).map((ban, idx) => (
                <img
                  key={idx}
                  src={getChampionIcon(ban.championId)}
                  alt="Ban"
                  className="w-6 h-6 rounded opacity-50"
                />
              ))}
            </div>
            <div className="flex gap-1 ml-auto">
              {game.bannedChampions.filter(b => b.teamId === 200).map((ban, idx) => (
                <img
                  key={idx}
                  src={getChampionIcon(ban.championId)}
                  alt="Ban"
                  className="w-6 h-6 rounded opacity-50"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
