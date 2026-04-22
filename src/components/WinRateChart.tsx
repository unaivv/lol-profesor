import { DetailedMatch, Participant } from '../types/api'

interface WinRateChartProps {
  matches: DetailedMatch[]
  playerPuuid: string
}

export function WinRateChart({ matches, playerPuuid }: WinRateChartProps) {
  const validMatches = matches.filter(m => m && typeof m.gameId === 'string' && Array.isArray(m.participants))
  const totalGames = validMatches.length

  if (totalGames === 0) return null

  const wins = validMatches.filter(m => {
    const player: Participant | undefined = playerPuuid 
      ? m.participants?.find(p => p.puuid === playerPuuid)
      : m.participants?.[0]
    return player?.win === true
  }).length

  const losses = totalGames - wins
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0

  const size = 56
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const winDash = (winRate / 100) * circumference
  const lossDash = ((100 - winRate) / 100) * circumference

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 12px',
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '10px'
    }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(239, 68, 68, 0.4)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#ef4444"
            strokeWidth={strokeWidth}
            strokeDasharray={`${lossDash} ${circumference}`}
            strokeLinecap="round"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#22c55e"
            strokeWidth={strokeWidth}
            strokeDasharray={`${winDash} ${circumference}`}
            strokeDashoffset={-lossDash}
            strokeLinecap="round"
          />
        </svg>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'white', lineHeight: 1 }}>
            {winRate}%
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#22c55e' }} />
          <span style={{ fontSize: '12px', color: 'white' }}>{wins}W</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#ef4444' }} />
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>{losses}L</span>
        </div>
      </div>
    </div>
  )
}