import { Participant } from '../../types/api'
import { getChampionItems, getTrinket, calculateKDARatio } from '../MatchCard'

// Utils
const getItemIcon = (itemId: number): string => {
  if (itemId === 0) return ''
  return `https://ddragon.leagueoflegends.com/cdn/14.5.1/img/item/${itemId}.png`
}

const getChampionIcon = (championId: number, championName?: string): string => {
  if (championName) {
    return `https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${championName}.png`
  }
  return `https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${championId}.png`
}

interface PlayerRowProps {
  player: Participant
  isCurrentPlayer: boolean
  isMVP: boolean
  onPlayerClick?: (player: Participant) => void
}

export function PlayerRow({ player, isCurrentPlayer, isMVP, onPlayerClick }: PlayerRowProps) {
  const kdaRatio = calculateKDARatio(player.kills, player.deaths, player.assists)
  const kdaColor = kdaRatio >= 4 ? '#10b981' : kdaRatio >= 2.5 ? '#2563eb' : kdaRatio >= 1 ? '#d97706' : '#dc2626'
  const items = getChampionItems(player)
  const trinket = getTrinket(player)
  const visionScore = (player.visionScore ?? 0) ||
    ((player.visionWardsBoughtInGame || 0) + (player.wardsPlaced || 0) + (player.wardsKilled || 0))

  return (
    <div 
      onClick={() => !isCurrentPlayer && onPlayerClick?.(player)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 10px',
        borderRadius: '8px',
        background: isCurrentPlayer ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
        border: isCurrentPlayer ? '2px solid #eab308' : isMVP ? '2px solid #8b5cf6' : '1px solid transparent',
        position: 'relative',
        cursor: !isCurrentPlayer && onPlayerClick ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => {
        if (!isCurrentPlayer && onPlayerClick) {
          e.currentTarget.style.background = 'rgba(234, 179, 8, 0.15)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isCurrentPlayer && onPlayerClick) {
          e.currentTarget.style.background = isCurrentPlayer ? 'rgba(234, 179, 8, 0.15)' : 'transparent'
        }
      }}
    >
      {isCurrentPlayer && (
        <div style={{
          position: 'absolute',
          top: '-4px',
          left: '-4px',
          background: '#eab308',
          color: 'white',
          fontSize: '8px',
          fontWeight: 'bold',
          padding: '2px 4px',
          borderRadius: '4px',
          zIndex: 10
        }}>
          {isMVP ? 'TÚ MVP' : 'TÚ'}
        </div>
      )}
      {!isCurrentPlayer && isMVP && (
        <div style={{
          position: 'absolute',
          top: '-4px',
          left: '-4px',
          background: '#8b5cf6',
          color: 'white',
          fontSize: '8px',
          fontWeight: 'bold',
          padding: '2px 4px',
          borderRadius: '4px',
          zIndex: 10
        }}>
          MVP
        </div>
      )}
      <img
        src={getChampionIcon(player.championId, player.championName)}
        alt={player.championName}
        style={{ width: '32px', height: '32px', borderRadius: '6px' }}
      />
      <div style={{ flex: 1, minWidth: '0' }}>
        <div style={{
          fontSize: '12px',
          fontWeight: isCurrentPlayer ? 700 : 500,
          color: isCurrentPlayer ? '#b45309' : '#1e293b',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {player.summonerName || player.championName || 'Unknown'}
        </div>
        <div style={{ fontSize: '10px', color: '#64748b' }}>{player.championName}</div>
      </div>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', minWidth: '60px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: kdaColor }}>{player.kills}</span>
        <span style={{ color: '#94a3b8', fontSize: '10px' }}>/</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444' }}>{player.deaths}</span>
        <span style={{ color: '#94a3b8', fontSize: '10px' }}>/</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: kdaColor }}>{player.assists}</span>
      </div>
      <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
        {[0, 1, 2, 3, 4, 5].map(idx => {
          const item = items[idx]
          return (
            <div key={idx} style={{
              width: '20px',
              height: '20px',
              background: item > 0 ? '#0f172a' : 'rgba(15, 23, 42, 0.3)',
              borderRadius: '3px',
              overflow: 'hidden',
              border: item === 0 ? '1px dashed #475569' : 'none'
            }}>
              {item > 0 && <img src={getItemIcon(item)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />}
            </div>
          )
        })}
      </div>
      {trinket > 0 && (
        <div style={{
          width: '20px',
          height: '20px',
          background: '#0f172a',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <img src={getItemIcon(trinket)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
      )}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        minWidth: '40px',
        padding: '2px 6px',
        background: visionScore >= 25 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(100, 116, 139, 0.1)',
        borderRadius: '4px'
      }}>
        <span style={{ fontSize: '10px' }}>👁️</span>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: visionScore >= 25 ? '#3b82f6' : '#64748b'
        }}>
          {visionScore}
        </span>
      </div>
    </div>
  )
}
