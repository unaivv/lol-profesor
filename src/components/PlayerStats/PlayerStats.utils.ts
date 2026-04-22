import { RankedStats, RankedStatsExtended } from '@/types/api'

export function isRankedStatsExtended(stats: RankedStats | RankedStatsExtended | null | undefined): stats is RankedStatsExtended {
  return stats !== null && stats !== undefined && 'solo' in stats && 'flex' in stats
}

export function getSoloRanked(stats: RankedStats | RankedStatsExtended | null | undefined): RankedStats | null {
  if (!stats) return null
  if (isRankedStatsExtended(stats)) return stats.solo
  return stats
}