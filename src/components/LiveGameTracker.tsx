import { useState, useEffect } from 'react'
import { Activity, Clock, AlertCircle, Wifi, WifiOff, Gamepad2 } from 'lucide-react'
import { LiveGameData } from '../types'

// Placeholder components for UI elements
const HealthBar = ({ current, max }: { current: number; max: number }) => {
  const percentage = Math.round((current / max) * 100)
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-slate-600 mb-1">
        <span>Salud</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${percentage > 50 ? 'bg-emerald-500' : percentage > 25 ? 'bg-amber-500' : 'bg-rose-500'
            }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

const KDABadge = ({ kills, deaths, assists }: { kills: number; deaths: number; assists: number }) => {
  const kda = deaths === 0 ? kills + assists : (kills + assists) / deaths
  return (
    <div className={`text-xs font-bold px-2 py-1 rounded-lg ${kda >= 3 ? 'bg-purple-100 text-purple-700' :
      kda >= 1.5 ? 'bg-blue-100 text-blue-700' :
        'bg-slate-100 text-slate-600'
      }}`}>
      {kills}/{deaths}/{assists}
    </div>
  )
}

const ChampionIconSmall = ({ championId, championName }: { championId: number; championName: string }) => (
  <img
    src={`https://ddragon.leagueoflegends.com/cdn/16.7.1/img/champion/${championId}.png`}
    alt={championName}
    className="w-10 h-10 rounded-lg border-2 border-slate-200"
    onError={(e) => {
      (e.target as HTMLImageElement).src = 'https://ddragon.leagueoflegends.com/cdn/16.7.1/img/champion/Aatrox.png'
    }}
  />
)

export function LiveGameTracker() {
  const [liveGame, setLiveGame] = useState<LiveGameData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLiveGameData = async () => {
      // LiveGameTracker requires a puuid prop (not implemented here).
      // The SpectatorCard component handles live game fetching with invoke().
      setLiveGame(null)
      setIsConnected(false)
      setError('Selecciona un jugador para ver su partida en vivo')
    }

    fetchLiveGameData()
    const interval = setInterval(fetchLiveGameData, 5000)
    return () => clearInterval(interval)
  }, [])

  const formatGameTime = (startTime: number) => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Disconnected State
  if (!isConnected) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-rose-500 to-red-600 text-white p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Partida en Vivo</h2>
              <span className="text-sm text-white/80">Desconectado</span>
            </div>
          </div>
        </div>
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <p className="text-slate-700 font-medium mb-1">{error || 'Conectando...'}</p>
          <p className="text-sm text-slate-500">Asegúrate de que League of Legends esté ejecutándose</p>
        </div>
      </div>
    )
  }

  // Connected but no game
  if (!liveGame) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Partida en Vivo</h2>
              <span className="text-sm text-white/80">Conectado</span>
            </div>
          </div>
        </div>
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Gamepad2 className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-slate-700 font-medium mb-1">No hay partida en curso</p>
          <p className="text-sm text-slate-500">Inicia una partida para ver estadísticas en tiempo real</p>
        </div>
      </div>
    )
  }

  const blueTeam = liveGame.participants.filter(p => p.teamId === 100)
  const redTeam = liveGame.participants.filter(p => p.teamId === 200)

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center relative">
              <Activity className="w-5 h-5 text-emerald-400" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Partida en Vivo</h2>
              <p className="text-sm text-slate-400">{liveGame.gameMode} • {liveGame.gameType}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <Clock className="w-4 h-4" />
            <span className="font-mono font-bold text-lg">{formatGameTime(liveGame.gameStartTime)}</span>
          </div>
        </div>
      </div>

      {/* Teams */}
      <div className="p-4 space-y-4">
        {/* Blue Team */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 pb-1 border-b border-blue-200">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="font-bold text-blue-700 text-sm">Equipo Azul</span>
            <span className="text-xs text-slate-500 ml-auto">{blueTeam.length} jugadores</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {blueTeam.map((player, idx) => (
              <div key={idx} className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-3 border border-blue-100">
                <div className="flex items-center gap-3">
                  <ChampionIconSmall championId={player.championId} championName={player.championName} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm truncate">{player.summonerName}</div>
                    <div className="text-xs text-slate-500">{player.championName} • Nivel {player.level}</div>
                  </div>
                  <KDABadge kills={player.kills} deaths={player.deaths} assists={player.assists} />
                </div>
                <HealthBar current={player.currentHealth} max={player.maxHealth} />
              </div>
            ))}
          </div>
        </div>

        {/* Red Team */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 pb-1 border-b border-rose-200">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="font-bold text-rose-700 text-sm">Equipo Rojo</span>
            <span className="text-xs text-slate-500 ml-auto">{redTeam.length} jugadores</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {redTeam.map((player, idx) => (
              <div key={idx} className="bg-gradient-to-r from-rose-50 to-red-50 rounded-xl p-3 border border-rose-100">
                <div className="flex items-center gap-3">
                  <ChampionIconSmall championId={player.championId} championName={player.championName} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm truncate">{player.summonerName}</div>
                    <div className="text-xs text-slate-500">{player.championName} • Nivel {player.level}</div>
                  </div>
                  <KDABadge kills={player.kills} deaths={player.deaths} assists={player.assists} />
                </div>
                <HealthBar current={player.currentHealth} max={player.maxHealth} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
