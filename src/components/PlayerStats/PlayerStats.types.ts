import { RankedStats, RankedStatsExtended } from '@/types/api'

export interface PlayerStatsProps {
  rankedStats: RankedStats | RankedStatsExtended | null | undefined
}

export type { RankedStats, RankedStatsExtended }