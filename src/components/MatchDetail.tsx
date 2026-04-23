import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DetailedMatch, Participant } from '../types/api'
import { PlayerRow } from './MatchDetailComponents/PlayerRow'
import { ConfirmationModal } from './MatchDetailComponents/ConfirmationModal'
import { Timeline } from './MatchDetailComponents/Timeline'
import { AIAnalysis } from './MatchDetailComponents/AIAnalysis'
import { Shield, Target, X } from 'lucide-react'

interface MatchDetailProps {
  match: DetailedMatch
  playerPuuid?: string
  currentRegion?: string
  onClose: () => void
}

// Utils
const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const formatGold = (gold: number): string => {
  if (gold >= 1000) return `${(gold / 1000).toFixed(1)}k`
  return gold.toString()
}

const getChampionIcon = (championId: number, championName?: string): string => {
  if (championName) {
    return `https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${championName}.png`
  }
  return `https://ddragon.leagueoflegends.com/cdn/14.5.1/img/champion/${championId}.png`
}

const getQueueName = (queueId?: number): string => {
  const queues: Record<number, string> = {
    420: 'Clasificatoria Solo/Dúo',
    440: 'Clasificatoria Flex',
    450: 'ARAM',
    400: 'Normal Reclutamiento',
    430: 'Normal Selección Oculta'
  }
  return queues[queueId || 0] || 'Otro Modo'
}

export function MatchDetail({ match, playerPuuid, currentRegion, onClose }: MatchDetailProps) {
  const navigate = useNavigate()
  const [confirmModal, setConfirmModal] = useState<{show: boolean; player: Participant | null}>({show: false, player: null})

  const participants = match.participants || []
  const currentPlayer = playerPuuid ? participants.find(p => p.puuid === playerPuuid) : participants[0]
  const teamWon = currentPlayer?.win || false
  const blueTeam = participants.filter(p => p.teamId === 100)
  const redTeam = participants.filter(p => p.teamId === 200)

  const findMVP = (teamPlayers: Participant[]): number => {
    if (!teamPlayers.length) return -1
    let mvpId = teamPlayers[0].participantId
    let maxScore = 0
    for (const p of teamPlayers) {
      const score = (p.kills * 3 + p.assists * 2 + (p.damageDealtToChampions || 0) / 5000) - (p.deaths * 1.5)
      if (score > maxScore) {
        maxScore = score
        mvpId = p.participantId
      }
    }
    return mvpId
  }

  const blueMVP = findMVP(blueTeam)
  const redMVP = findMVP(redTeam)

  const handlePlayerClick = (player: Participant) => {
    if (player.puuid === playerPuuid) return
    setConfirmModal({show: true, player})
  }

  const handleConfirmSwitch = async () => {
    if (!confirmModal.player || !currentRegion) return
    const player = confirmModal.player
    
    try {
      const response = await fetch(`/api/player-by-puuid/${player.puuid}`)
      if (!response.ok) throw new Error('Player not found')
      
      const playerData = await response.json()
      if (!playerData.data) throw new Error('Player not found')
      
      const { gameName, tagLine } = playerData.data
      navigate(`/stats/${currentRegion}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine || 'NA1')}`)
    } catch (error) {
      console.error('Error switching player:', error)
      const gameName = player.summonerName || player.championName || 'unknown'
      navigate(`/stats/${currentRegion}/${encodeURIComponent(gameName)}/NA1`)
    }
  }

  const gameDurationMin = Math.floor(match.gameDuration / 60)
  const csPerMin = currentPlayer ? Math.round((currentPlayer.totalMinionsKilled / gameDurationMin) * 10) / 10 : 0
  const goldPerMin = currentPlayer ? Math.round((currentPlayer.goldEarned / gameDurationMin) * 10) / 10 : 0

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      overflow: 'hidden'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '-12px',
            right: '-12px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '1px solid #e2e8f0',
            background: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10
          }}
        >
          <X size={20} color="#64748b" />
        </button>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '100px' }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)',
            margin: '-24px -24px 24px -24px',
            padding: '20px 24px',
            borderRadius: '16px 16px 0 0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: teamWon ? '#10b981' : '#ef4444',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '14px'
                }}>
                  {teamWon ? 'VICTORIA' : 'DERROTA'}
                </div>
                <div style={{ color: 'white' }}>
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>{getQueueName(match.queueId)}</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>{formatDuration(match.gameDuration)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={getChampionIcon(currentPlayer?.championId || 0, currentPlayer?.championName)}
                  alt={currentPlayer?.championName}
                  style={{ width: '56px', height: '56px', borderRadius: '12px', border: '3px solid #eab308' }}
                />
                <div>
                  <div style={{ color: 'white', fontSize: '16px', fontWeight: 600 }}>{currentPlayer?.championName}</div>
                  <div style={{ color: '#94a3b8', fontSize: '13px' }}>Nivel {currentPlayer?.championLevel}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={16} color="#3b82f6" />
                Tu Performance
              </h3>
              <div style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #93c5fd'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
                      {currentPlayer?.kills}/{currentPlayer?.deaths}/{currentPlayer?.assists}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>KDA</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#ca8a04' }}>
                      {formatGold(currentPlayer?.goldEarned || 0)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Oro ({goldPerMin}/min)</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#059669' }}>
                      {currentPlayer?.totalMinionsKilled || 0}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>CS ({csPerMin}/min)</div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Target size={16} color="#8b5cf6" />
                Impacto
              </h3>
              <div style={{
                background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #a78bfa'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
                      {currentPlayer?.damageDealtToChampions?.toLocaleString() || 0}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Daño a campeones</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
                      {currentPlayer?.visionScore || 0}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Puntos de visión</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Teams */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                🔵 Equipo Azul
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {blueTeam.map(player => (
                  <PlayerRow
                    key={player.participantId}
                    player={player}
                    isCurrentPlayer={player.puuid === playerPuuid}
                    isMVP={player.participantId === blueMVP}
                    onPlayerClick={handlePlayerClick}
                  />
                ))}
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                🔴 Equipo Rojo
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {redTeam.map(player => (
                  <PlayerRow
                    key={player.participantId}
                    player={player}
                    isCurrentPlayer={player.puuid === playerPuuid}
                    isMVP={player.participantId === redMVP}
                    onPlayerClick={handlePlayerClick}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ marginBottom: '24px' }}>
            <Timeline gameId={match.gameId} />
          </div>

          {/* AI Analysis */}
          <AIAnalysis gameId={match.gameId} playerPuuid={playerPuuid} />
        </div>

        {/* Confirmation Modal */}
        <ConfirmationModal 
          player={confirmModal.player}
          onConfirm={handleConfirmSwitch}
          onCancel={() => setConfirmModal({show: false, player: null})}
        />
      </div>
    </div>
  )
}