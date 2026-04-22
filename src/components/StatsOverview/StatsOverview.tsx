import { Trophy, Target, Zap } from 'lucide-react'
import { getRankEmblemUrl } from '../../lib/utils'
import { PlayerData, RankedStatsExtended } from '../../types/api'
import { StatsOverviewCard } from './StatsOverviewCard'

interface StatsOverviewProps {
  playerData: PlayerData
}

export function StatsOverview({ playerData }: StatsOverviewProps) {
  const rankedData = playerData.rankedStats
  const isExtended = rankedData && 'solo' in rankedData
  const soloRanked = isExtended ? (rankedData as RankedStatsExtended).solo : rankedData
  const flexRanked = isExtended ? (rankedData as RankedStatsExtended).flex : null
  const hasSoloRanked = soloRanked !== null && soloRanked !== undefined
  const hasFlexRanked = flexRanked !== null && flexRanked !== undefined
  const hasAnyRanked = hasSoloRanked || hasFlexRanked

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
        value={playerData.totalMatches || playerData.matches?.length || 0}
        label="Partidas Ranked"
      />
      {hasSoloRanked && (
        <StatsOverviewCard
          iconBg="#dbeafe"
          rankImage={getRankEmblemUrl(soloRanked.tier)}
          value={`${soloRanked.tier} ${soloRanked.rank}`}
          subValue={`${soloRanked.leaguePoints} LP • ${soloRanked.wins}G ${soloRanked.losses}P`}
          tier={soloRanked.tier}
          isRanked
        />
      )}
      {hasFlexRanked && (
        <StatsOverviewCard
          iconBg="#dbeafe"
          rankImage={getRankEmblemUrl(flexRanked.tier)}
          value={`${flexRanked.tier} ${flexRanked.rank}`}
          subValue={`${flexRanked.leaguePoints} LP • ${flexRanked.wins}G ${flexRanked.losses}P`}
          tier={flexRanked.tier}
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