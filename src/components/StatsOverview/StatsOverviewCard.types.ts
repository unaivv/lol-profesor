export interface StatsOverviewCardProps {
  icon?: React.ReactNode
  iconBg?: string
  value: number | string
  label?: string
  subValue?: string
  tier?: string
  isRanked?: boolean
  rankImage?: string
}