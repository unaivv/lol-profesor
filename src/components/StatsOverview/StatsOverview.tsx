import { Trophy, Target, Zap } from 'lucide-react'
import { getRankEmblemUrl } from '../../lib/utils'
import { PlayerData } from '../../types/api'
import { StatsOverviewCard } from './StatsOverviewCard'

interface StatsOverviewProps {
  playerData: PlayerData
}

// Helper to get rank weight for comparison
function getRankWeight(tier: string): number {
  const tiers = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER']
  return tiers.indexOf(tier.toUpperCase())
}

export function StatsOverview({ playerData }: StatsOverviewProps) {
  const rankedData = playerData.rankedStats as any
  const soloRanked = rankedData?.solo || null
  const flexRanked = rankedData?.flex || null
  const hasSoloRanked = soloRanked !== null && soloRanked !== undefined
  const hasFlexRanked = flexRanked !== null && flexRanked !== undefined
  const hasAnyRanked = hasSoloRanked || hasFlexRanked

  // Determine which rank to show (the higher one)
  const getMainRank = () => {
    if (!hasSoloRanked && !hasFlexRanked) return null
    if (hasSoloRanked && !hasFlexRanked) return soloRanked
    if (!hasSoloRanked && hasFlexRanked) return flexRanked
    
    // Both exist - compare tiers
    const soloWeight = getRankWeight(soloRanked.tier)
    const flexWeight = getRankWeight(flexRanked.tier)
    
    if (soloWeight > flexWeight) return soloRanked
    if (flexWeight > soloWeight) return flexRanked
    
    // Same tier - compare LP
    if (soloRanked.leaguePoints > flexRanked.leaguePoints) return soloRanked
    return flexRanked
  }

  const mainRank = getMainRank()

  // Calculate total ranked matches (wins + losses) from solo and flex
  const calculateTotalRankedMatches = () => {
    let total = 0
    if (hasSoloRanked && soloRanked) {
      total += soloRanked.wins + soloRanked.losses
    }
    if (hasFlexRanked && flexRanked) {
      total += flexRanked.wins + flexRanked.losses
    }
    return total
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
      <StatsOverviewCard
        icon={<Trophy size={24} color="#2563eb" />}
        iconBg="#dbeafe"
        value={playerData.summonerLevel}
        label="Nivel"
      />
      <StatsOverviewCard
        icon={<Target size={24} color="#059669" />}
        iconBg="#d1fae5"
        value={calculateTotalRankedMatches()}
        label="Partidas Ranked"
      />
      {mainRank && (
        <StatsOverviewCard
          iconBg="#dbeafe"
          rankImage={getRankEmblemUrl(mainRank.tier)}
          value={`${mainRank.tier} ${mainRank.rank}`}
          subValue={`${mainRank.leaguePoints} LP • ${mainRank.wins}G ${mainRank.losses}P`}
          tier={mainRank.tier}
          isRanked
        />
      )}
      {!hasAnyRanked && (
        <StatsOverviewCard
          icon={<Zap size={24} color="#94a3b8" />}
          iconBg="#f1f5f9"
          value="Unranked"
          label="Sin ranked"
        />
      )}
      <StatsOverviewCard
        icon={<Zap size={24} color="#ea580c" />}
        iconBg="#ffedd5"
        value={playerData.region}
        label="Región"
      />
    </div>
  )
}