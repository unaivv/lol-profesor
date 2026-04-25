import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, Sword } from 'lucide-react'
import { DetailedMatch, PlayerData } from '../types/api'
import { MatchCard } from './MatchCard'
import { WinRateChart } from './WinRateChart'
import { calculateRawMetrics } from './PerformanceRadar'

interface MatchHistoryProps {
  matches: DetailedMatch[]
  playerPuuid?: string
  currentPlayerData?: PlayerData | null
}

export function MatchHistory({ matches, playerPuuid, currentPlayerData }: MatchHistoryProps) {
  const navigate = useNavigate()
  const validMatches = matches.filter((m): m is DetailedMatch =>
    m && typeof m.gameId === 'string' && Array.isArray(m.participants)
  )
  const recentMetrics = useMemo(
    () => calculateRawMetrics(validMatches, playerPuuid),
    [validMatches, playerPuuid]
  )

  const containerStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e2e8f0',
    overflowX: 'auto',
    minWidth: '100%'
  }

  const headerStyle: React.CSSProperties = {
    background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)',
    color: 'white',
    padding: '20px'
  }

  const handleExpand = (gameId: string) => {
    const match = validMatches.find(m => m.gameId === gameId)
    if (!match) return
    navigate(`/match/${gameId}`, {
      state: { match, playerPuuid, region: currentPlayerData?.region, recentMetrics }
    })
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sword size={20} color="#60a5fa" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Historial de Partidas</h2>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>{validMatches.length} partidas</p>
            </div>
          </div>
          <WinRateChart matches={matches} playerPuuid={playerPuuid || ''} />
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {validMatches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ width: '64px', height: '64px', background: '#f1f5f9', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trophy size={32} color="#94a3b8" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>No hay partidas</h3>
            <p style={{ fontSize: '14px', color: '#64748b' }}>Este jugador no tiene partidas recientes</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {validMatches.map((match) => (
              <MatchCard
                key={match.gameId}
                match={match}
                playerPuuid={playerPuuid}
                isExpanded={false}
                onExpand={() => handleExpand(match.gameId)}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
