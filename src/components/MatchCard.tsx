import { DetailedMatch, Participant } from '../types/api'
import { Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { getChampionImageUrl, getItemImageUrl } from '../utils/ddragon'

interface MatchCardProps {
  match: DetailedMatch
  playerPuuid?: string
  onExpand: () => void
  isExpanded: boolean
}

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return `Hoy ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
  } else if (diffDays === 1) {
    return `Ayer ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
  } else {
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }
}

const calculateKDA = (kills: number, deaths: number, assists: number): string => {
  if (deaths === 0) return `${kills + assists}/0`
  return `${kills}/${deaths}/${assists}`
}

const calculateKDARatio = (kills: number, deaths: number, assists: number): number => {
  if (deaths === 0) return (kills + assists) * 2
  return (kills + assists) / deaths
}

const getChampionIcon = (championId: number): string => {
  return getChampionImageUrl(championId)
}

const getQueueName = (queueId?: number): string => {
  const queues: Record<number, string> = {
    420: 'Solo/Duo',
    440: 'Flex',
    450: 'ARAM',
    400: 'Normal',
    430: 'Blind'
  }
  return queues[queueId || 0] || 'Otro'
}

interface Tag {
  label: string
  description: string
}

const generateTags = (player: Participant, teamWon: boolean): Tag[] => {
  const tags: Tag[] = []
  const kdaRatio = calculateKDARatio(player.kills, player.deaths, player.assists)

  if (player.kills >= 8 || kdaRatio >= 5) {
    if (teamWon) tags.push({ label: '🎯 Ace', description: 'Mató a 8+ enemigos o KDA muy alto' })
  }

  if (player.damageDealtToChampions && player.damageDealtToChampions > 20000) {
    tags.push({ label: '🛡️ Dmg Dealer', description: 'Daño alto a campeones (20k+)' })
  }

  const csPerMin = player.totalMinionsKilled / (player.timePlayed / 60)
  if (csPerMin >= 8) {
    tags.push({ label: '🌾 CS Master', description: 'Mucho CS por minuto (8+)' })
  }

  if (!teamWon && player.kills + player.assists >= 10 && player.deaths <= 3) {
    tags.push({ label: '💀 Carry', description: 'Hizo mucho daño pero perdió' })
  }

  if (player.assists >= 8) {
    tags.push({ label: '✨ Asistidor', description: '8+ asistencias en la partida' })
  }

  if (player.damageTaken && player.damageTaken > 15000 && player.deaths <= 2) {
    tags.push({ label: '🏃 Tanky', description: 'Mucho daño absorbido (15k+)' })
  }

  return tags.slice(0, 3)
}

export function MatchCard({ match, playerPuuid, onExpand, isExpanded }: MatchCardProps) {
  const participants = match.participants || []
  const currentPlayer = playerPuuid 
    ? participants.find((p) => p.puuid === playerPuuid)
    : participants[0]
  
  if (!currentPlayer) return null

  const teamWon = currentPlayer.win || false

  const tags = generateTags(currentPlayer, teamWon)
  const kdaColor = calculateKDARatio(currentPlayer.kills, currentPlayer.deaths, currentPlayer.assists) >= 3 
    ? '#10b981' 
    : calculateKDARatio(currentPlayer.kills, currentPlayer.deaths, currentPlayer.assists) >= 1.5 
      ? '#3b82f6' 
      : '#ef4444'

  return (
    <div style={{
      borderRadius: '12px',
      border: teamWon ? '2px solid #10b981' : '2px solid #ef4444',
      background: teamWon
        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, var(--bg-card) 100%)'
        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, var(--bg-card) 100%)',
      overflow: 'hidden',
      transition: 'all 0.2s ease',
      marginBottom: '8px'
    }}>
      <div 
        onClick={onExpand}
        style={{
          padding: '12px 16px',
          cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img
                src={getChampionIcon(currentPlayer.championId)}
                alt={currentPlayer.championName}
                style={{ width: '48px', height: '48px', borderRadius: '8px', border: '2px solid #eab308' }}
              />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {currentPlayer.summonerName || currentPlayer.championName}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {currentPlayer.championName} • lvl {currentPlayer.championLevel}
                </div>
              </div>
            </div>

            <div style={{
              padding: '4px 12px',
              borderRadius: '8px',
              background: teamWon ? '#10b981' : '#ef4444',
              color: 'white',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.5px'
            }}>
              {teamWon ? 'VICTORIA' : 'DERROTA'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: kdaColor }}>{currentPlayer.kills}</span>
                <span style={{ color: '#94a3b8', fontSize: '11px' }}>/</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444' }}>{currentPlayer.deaths}</span>
                <span style={{ color: '#94a3b8', fontSize: '11px' }}>/</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: kdaColor }}>{currentPlayer.assists}</span>
              </div>
              <span style={{ fontSize: '10px', color: '#64748b' }}>{calculateKDA(currentPlayer.kills, currentPlayer.deaths, currentPlayer.assists)}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '12px' }}>
              <Clock size={14} />
              <span>{formatDuration(match.gameDuration)}</span>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '2px 8px', background: 'var(--bg-card-subtle)', borderRadius: '4px' }}>
              {getQueueName(match.queueId)}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '11px' }}>
              <Clock size={12} />
              <span>{formatDate(match.gameCreation)}</span>
            </div>
          </div>

          <button style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            flexShrink: 0
          }}>
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            {tags.map((tag, idx) => (
              <span 
                key={idx} 
                style={{ 
                  fontSize: '11px', 
                  padding: '2px 8px', 
                  background: 'rgba(234, 179, 8, 0.1)', 
                  borderRadius: '4px',
                  color: '#a16207',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  cursor: 'help',
                  position: 'relative'
                }}
                title={tag.description}
              >
                {tag.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function getChampionItems(player: Participant): number[] {
  return [player.item0 || 0, player.item1 || 0, player.item2 || 0, player.item3 || 0, player.item4 || 0, player.item5 || 0]
}

export function getTrinket(player: Participant): number {
  return player.item6 || 0
}

export function hasItem(player: Participant, itemId: number): boolean {
  return player.item0 === itemId || player.item1 === itemId || player.item2 === itemId || player.item3 === itemId || player.item4 === itemId || player.item5 === itemId
}

export function getItemIcon(itemId: number): string {
  if (itemId === 0) return ''
  return getItemImageUrl(itemId)
}

export { calculateKDARatio }
