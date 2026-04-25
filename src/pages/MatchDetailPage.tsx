import { useLocation, useNavigate } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { ChevronLeft, Shield, Target } from 'lucide-react'
import { Participant, DetailedMatch } from '../types/api'
import { PerformanceMetrics } from '../components/PerformanceRadar'
import { getChampionItems, getTrinket, calculateKDARatio } from '../components/MatchCard'
import { Timeline } from '../components/MatchDetailComponents/Timeline'
import Insights from '../components/Insights'
import { getChampionImageUrl } from '../utils/ddragon'
import * as S from '../components/MatchDetail/styles'

interface MatchDetailState {
  match: DetailedMatch
  playerPuuid?: string
  region?: string
  recentMetrics?: PerformanceMetrics | null
}

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const formatGold = (gold: number): string =>
  gold >= 1000 ? `${(gold / 1000).toFixed(1)}k` : gold.toString()

const getItemIcon = (itemId: number): string =>
  itemId === 0 ? '' : `https://ddragon.leagueoflegends.com/cdn/16.7.1/img/item/${itemId}.png`

const getQueueName = (queueId?: number): string => {
  const queues: Record<number, string> = {
    420: 'Clasificatoria Solo/Dúo',
    440: 'Clasificatoria Flex',
    450: 'ARAM',
    400: 'Normal Reclutamiento',
    430: 'Normal Selección Oculta',
  }
  return queues[queueId || 0] || 'Otro Modo'
}

const findMVP = (team: Participant[]): number => {
  if (!team.length) return -1
  let mvpId = team[0].participantId
  let max = 0
  for (const p of team) {
    const score = (p.kills * 3 + p.assists * 2 + (p.damageDealtToChampions || 0) / 5000) - p.deaths * 1.5
    if (score > max) { max = score; mvpId = p.participantId }
  }
  return mvpId
}

interface PlayerRowProps {
  player: Participant
  isCurrentPlayer: boolean
  isMVP: boolean
  onPlayerClick?: (player: Participant) => void
}

function PlayerRow({ player, isCurrentPlayer, isMVP, onPlayerClick }: PlayerRowProps) {
  const kdaRatio = calculateKDARatio(player.kills, player.deaths, player.assists)
  const kdaColor = kdaRatio >= 4 ? '#10b981' : kdaRatio >= 2.5 ? '#2563eb' : kdaRatio >= 1 ? '#d97706' : '#dc2626'
  const items = getChampionItems(player)
  const trinket = getTrinket(player)
  const visionScore = (player.visionScore ?? 0) ||
    ((player.visionWardsBoughtInGame || 0) + (player.wardsPlaced || 0) + (player.wardsKilled || 0))

  return (
    <div onClick={() => !isCurrentPlayer && onPlayerClick?.(player)} style={S.playerRow(isCurrentPlayer, isMVP)}>
      {isCurrentPlayer && <div style={S.playerBadge(true)}>{isMVP ? 'TÚ MVP' : 'TÚ'}</div>}
      {!isCurrentPlayer && isMVP && <div style={S.playerBadge(false)}>MVP</div>}
      <img src={getChampionImageUrl(player.championId)} alt={player.championName} style={S.championIcon} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={S.championName(isCurrentPlayer)}>{player.summonerName || player.championName || 'Unknown'}</div>
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
              {item > 0 && <img src={getItemIcon(item)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
            </div>
          )
        })}
      </div>
      {trinket > 0 && (
        <div style={S.itemSlotSmall(trinket)}>
          <img src={getItemIcon(trinket)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
      )}
      <div style={S.visionBadge(visionScore)}>
        <span style={{ fontSize: '10px' }}>👁️</span>
        <span style={S.visionScore(visionScore)}>{visionScore}</span>
      </div>
    </div>
  )
}

export function MatchDetailPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as MatchDetailState | null

  if (!state?.match) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p>No se encontraron datos de la partida.</p>
        <button onClick={() => navigate(-1)} style={{ marginTop: '16px', padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Volver
        </button>
      </div>
    )
  }

  const { match, playerPuuid, region, recentMetrics } = state
  const participants = match.participants || []
  const currentPlayer = playerPuuid ? participants.find(p => p.puuid === playerPuuid) : participants[0]
  const teamWon = currentPlayer?.win || false

  const blueTeam = participants.filter(p => p.teamId === 100)
  const redTeam = participants.filter(p => p.teamId === 200)
  const blueMVP = findMVP(blueTeam)
  const redMVP = findMVP(redTeam)

  const gameDurationMin = Math.max(Math.floor(match.gameDuration / 60), 1)
  const csPerMin = currentPlayer ? Math.round((currentPlayer.totalMinionsKilled / gameDurationMin) * 10) / 10 : 0
  const goldPerMin = currentPlayer ? Math.round((currentPlayer.goldEarned / gameDurationMin) * 10) / 10 : 0
  const dmgPerMin = currentPlayer ? Math.round(((currentPlayer.damageDealtToChampions || 0) / gameDurationMin) * 10) / 10 : 0
  const items = currentPlayer ? getChampionItems(currentPlayer) : []

  const handlePlayerClick = async (player: Participant) => {
    if (!region) return
    try {
      const data = await invoke<{ gameName: string; tagLine: string }>('get_player_by_puuid', { puuid: player.puuid })
      navigate(`/player/${region}/${encodeURIComponent(data.gameName)}/${encodeURIComponent(data.tagLine || 'NA1')}`)
    } catch {
      const gameName = player.summonerName || player.championName || 'unknown'
      navigate(`/player/${region}/${encodeURIComponent(gameName)}/NA1`)
    }
  }

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg-page)' }}>
      {/* Topbar */}
      <div style={{ padding: '12px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 100 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--bg-card-subtle)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}
        >
          <ChevronLeft size={16} />
          Volver
        </button>
        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          {getQueueName(match.queueId)} · {formatDuration(match.gameDuration)}
        </div>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 24px 0' }}>
        {/* Match header */}
        <div style={{ background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '8px 16px', borderRadius: '8px', background: teamWon ? '#10b981' : '#ef4444', color: 'white', fontWeight: 700, fontSize: '14px' }}>
                {teamWon ? 'VICTORIA' : 'DERROTA'}
              </div>
              <div style={{ color: 'white' }}>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>{getQueueName(match.queueId)}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>{formatDuration(match.gameDuration)}</div>
              </div>
            </div>
            {currentPlayer && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={getChampionImageUrl(currentPlayer.championId)}
                  alt={currentPlayer.championName}
                  style={{ width: '52px', height: '52px', borderRadius: '10px', border: '3px solid #eab308' }}
                />
                <div>
                  <div style={{ color: 'white', fontSize: '15px', fontWeight: 600 }}>{currentPlayer.championName}</div>
                  <div style={{ color: '#94a3b8', fontSize: '12px' }}>Nivel {currentPlayer.championLevel}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Performance + Build */}
        <div style={S.statsGrid}>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={15} color="#3b82f6" /> Tu Performance
            </h3>
            <div style={S.performanceCard}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {currentPlayer?.kills}/{currentPlayer?.deaths}/{currentPlayer?.assists}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>KDA</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#ca8a04' }}>{formatGold(currentPlayer?.goldEarned || 0)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Gold</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#059669' }}>{currentPlayer?.totalMinionsKilled || 0}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>CS</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[['CS/min', csPerMin], ['Gold/min', goldPerMin], ['Dmg/min', dmgPerMin]].map(([label, val]) => (
                  <div key={label as string} style={{ background: 'var(--bg-card)', padding: '7px', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>{val}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Target size={15} color="#f59e0b" /> Tu Build
            </h3>
            <div style={S.buildCard}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {[0, 1, 2, 3, 4, 5].map(idx => {
                  const item = items[idx]
                  return (
                    <div key={idx} style={S.itemSlot(item)}>
                      {item > 0 && <img src={getItemIcon(item)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Trinket:</span>
                  {currentPlayer?.item6 && currentPlayer.item6 > 0 && (
                    <div style={{ width: '28px', height: '28px', background: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
                      <img src={getItemIcon(currentPlayer.item6)} alt="" style={{ width: '100%', height: '100%' }} />
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {(currentPlayer?.damageDealtToChampions || 0).toLocaleString()} dmg
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Teams */}
        <div style={S.statsGrid}>
          <div>
            <h3 style={S.teamTitle('#3b82f6')}><span style={{ color: '#3b82f6' }}>🔵</span> Equipo Azul</h3>
            <div style={S.teamSection}>
              {blueTeam.map(p => (
                <PlayerRow key={p.participantId} player={p} isCurrentPlayer={p.puuid === playerPuuid} isMVP={p.participantId === blueMVP} onPlayerClick={handlePlayerClick} />
              ))}
            </div>
          </div>
          <div>
            <h3 style={S.teamTitle('#ef4444')}><span style={{ color: '#ef4444' }}>🔴</span> Equipo Rojo</h3>
            <div style={S.teamSection}>
              {redTeam.map(p => (
                <PlayerRow key={p.participantId} player={p} isCurrentPlayer={p.puuid === playerPuuid} isMVP={p.participantId === redMVP} onPlayerClick={handlePlayerClick} />
              ))}
            </div>
          </div>
        </div>

        <Timeline gameId={match.gameId} match={match} />

        <Insights matchGameId={match.gameId} playerPuuid={playerPuuid} recentMetrics={recentMetrics} />
      </div>
    </div>
  )
}
