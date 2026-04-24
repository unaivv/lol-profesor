import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Participant } from '../../types/api'
import { getChampionItems, getTrinket, calculateKDARatio } from '../MatchCard'
import { ConfirmationModal } from '../MatchDetailComponents/ConfirmationModal'
import { Shield, Target, X } from 'lucide-react'
import Insights from '../Insights'
import { Timeline } from '../MatchDetailComponents/Timeline'
import { MatchDetailProps, PlayerRowProps } from './types'
import { invoke } from '@tauri-apps/api/core'
import * as S from './styles'

// Helper functions
const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const formatGold = (gold: number): string => {
  if (gold >= 1000) return `${(gold / 1000).toFixed(1)}k`
  return gold.toString()
}

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

// PlayerRow component
const PlayerRow = ({ player, isCurrentPlayer, isMVP, onPlayerClick }: PlayerRowProps) => {
  const kdaRatio = calculateKDARatio(player.kills, player.deaths, player.assists)
  const kdaColor = kdaRatio >= 4 ? '#10b981' : kdaRatio >= 2.5 ? '#2563eb' : kdaRatio >= 1 ? '#d97706' : '#dc2626'
  const items = getChampionItems(player)
  const trinket = getTrinket(player)
  const visionScore = (player.visionScore ?? 0) ||
    ((player.visionWardsBoughtInGame || 0) + (player.wardsPlaced || 0) + (player.wardsKilled || 0))

  return (
    <div
      onClick={() => !isCurrentPlayer && onPlayerClick?.(player)}
      style={S.playerRow(isCurrentPlayer, isMVP)}
    >
      {isCurrentPlayer && (
        <div style={S.playerBadge(true)}>
          {isMVP ? 'TÚ MVP' : 'TÚ'}
        </div>
      )}
      {!isCurrentPlayer && isMVP && (
        <div style={S.playerBadge(false)}>
          MVP
        </div>
      )}
      <img
        src={getChampionIcon(player.championId, player.championName)}
        alt={player.championName}
        style={S.championIcon}
      />
      <div style={{ flex: 1, minWidth: '0' }}>
        <div style={S.championName(isCurrentPlayer)}>
          {player.summonerName || player.championName || 'Unknown'}
        </div>
        <div style={S.championDetail}>{player.championName}</div>
      </div>
      <div style={S.kdaDisplay(kdaColor)}>
        <span style={S.kdaNumber(kdaColor)}>{player.kills}</span>
        <span style={S.kdaSeparator}>/</span>
        <span style={S.kdaNumber('#ef4444')}>{player.deaths}</span>
        <span style={S.kdaSeparator}>/</span>
        <span style={S.kdaNumber(kdaColor)}>{player.assists}</span>
      </div>
      <div style={S.itemsGrid}>
        {[0, 1, 2, 3, 4, 5].map(idx => {
          const item = items[idx]
          return (
            <div key={idx} style={S.itemSlotSmall(item)}>
              {item > 0 && <img src={getItemIcon(item)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />}
            </div>
          )
        })}
      </div>
      {trinket > 0 && (
        <div style={S.itemSlotSmall(trinket)}>
          <img src={getItemIcon(trinket)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
      )}
      <div style={S.visionBadge(visionScore)}>
        <span style={{ fontSize: '10px' }}>👁️</span>
        <span style={S.visionScore(visionScore)}>{visionScore}</span>
      </div>
    </div>
  )
}

// Main component
export function MatchDetail({ match, playerPuuid, currentRegion, onClose }: MatchDetailProps) {
  const navigate = useNavigate()
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; player: Participant | null }>({ show: false, player: null })

  const handlePlayerClick = (player: Participant) => {
    if (player.puuid === playerPuuid) return
    setConfirmModal({ show: true, player })
  }

  const handleConfirmSwitch = async () => {
    if (!confirmModal.player || !currentRegion) return
    const player = confirmModal.player

    try {
      const playerData = await invoke<{ gameName: string; tagLine: string; icon: number }>('get_player_by_puuid', { puuid: player.puuid })
      const { gameName, tagLine } = playerData
      navigate(`/stats/${currentRegion}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine || 'NA1')}`)
    } catch (error) {
      console.error('Error switching player:', error)
      const gameName = player.summonerName || player.championName || 'unknown'
      navigate(`/stats/${currentRegion}/${encodeURIComponent(gameName)}/NA1`)
    }
  }

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

  const gameDurationMin = Math.floor(match.gameDuration / 60)
  const csPerMin = currentPlayer ? Math.round((currentPlayer.totalMinionsKilled / gameDurationMin) * 10) / 10 : 0
  const goldPerMin = currentPlayer ? Math.round((currentPlayer.goldEarned / gameDurationMin) * 10) / 10 : 0
  const dmgPerMin = currentPlayer ? Math.round(((currentPlayer.damageDealtToChampions || 0) / gameDurationMin) * 10) / 10 : 0

  const items = currentPlayer ? getChampionItems(currentPlayer) : []

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <button onClick={onClose} style={S.closeButton}>
          <X size={20} color="#64748b" />
        </button>

        <div style={S.content}>
          <div style={S.header}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={S.headerLeft}>
                <div style={S.resultBadge(teamWon)}>
                  {teamWon ? 'VICTORIA' : 'DERROTA'}
                </div>
                <div style={{ color: 'white' }}>
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>{getQueueName(match.queueId)}</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>{formatDuration(match.gameDuration)}</div>
                </div>
              </div>
              <div style={S.headerRight}>
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

          <div style={S.statsGrid}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={16} color="#3b82f6" />
                Tu Performance
              </h3>
              <div style={S.performanceCard}>
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
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Gold</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#059669' }}>
                      {currentPlayer?.totalMinionsKilled || 0}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>CS</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div style={{ background: 'white', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>{csPerMin}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>CS/min</div>
                  </div>
                  <div style={{ background: 'white', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>{goldPerMin}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>Gold/min</div>
                  </div>
                  <div style={{ background: 'white', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>{dmgPerMin}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>Dmg/min</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Target size={16} color="#f59e0b" />
                Tu Build
              </h3>
              <div style={S.buildCard}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {[0, 1, 2, 3, 4, 5].map(idx => {
                    const item = items[idx]
                    return (
                      <div key={idx} style={S.itemSlot(item)}>
                        {item > 0 && <img src={getItemIcon(item)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Trinket:</span>
                    {currentPlayer?.item6 && currentPlayer.item6 > 0 && (
                      <div style={{ width: '28px', height: '28px', background: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
                        <img src={getItemIcon(currentPlayer.item6)} alt="" style={{ width: '100%', height: '100%' }} />
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {(currentPlayer?.damageDealtToChampions || 0).toLocaleString()} dmg
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={S.statsGrid}>
            <div>
              <h3 style={S.teamTitle('#3b82f6')}>
                <span style={{ color: '#3b82f6' }}>🔵</span> Equipo Azul
              </h3>
              <div style={S.teamSection}>
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
              <h3 style={S.teamTitle('#ef4444')}>
                <span style={{ color: '#ef4444' }}>🔴</span> Equipo Rojo
              </h3>
              <div style={S.teamSection}>
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

          <Timeline
            gameId={match.gameId}
            match={match}
          />

          <Insights
            matchGameId={match.gameId}
            playerPuuid={playerPuuid}
          />
        </div>
      </div>

      <ConfirmationModal
        player={confirmModal.player}
        onConfirm={handleConfirmSwitch}
        onCancel={() => setConfirmModal({ show: false, player: null })}
      />
    </div>
  )
}

export default MatchDetail