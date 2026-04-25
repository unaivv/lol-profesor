import { DetailedMatch, Participant } from '../../types/api'
import { PerformanceMetrics } from '../PerformanceRadar'

export interface MatchDetailProps {
  match: DetailedMatch
  playerPuuid?: string
  currentRegion?: string
  onClose: () => void
  recentMetrics?: PerformanceMetrics | null
}

export interface PlayerRowProps {
  player: Participant
  isCurrentPlayer: boolean
  isMVP: boolean
  onPlayerClick?: (player: Participant) => void
}

export interface ConfirmModalState {
  show: boolean
  player: Participant | null
}