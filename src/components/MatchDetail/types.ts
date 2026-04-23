import { DetailedMatch, Participant } from '../../types/api'

export interface MatchDetailProps {
  match: DetailedMatch
  playerPuuid?: string
  currentRegion?: string
  onClose: () => void
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