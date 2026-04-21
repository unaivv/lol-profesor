import { Badge } from "./badge"
import { cn } from "@/lib/utils"

interface LeagueBadgeProps {
  tier: string
  rank?: string
  lp?: number
  className?: string
}

export function LeagueBadge({ tier, rank, lp, className }: LeagueBadgeProps) {
  const getTierColor = (tier: string) => {
    const colors = {
      'CHALLENGER': 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white',
      'GRANDMASTER': 'bg-gradient-to-r from-red-500 to-red-700 text-white',
      'MASTER': 'bg-gradient-to-r from-purple-500 to-purple-700 text-white',
      'DIAMOND': 'bg-gradient-to-r from-blue-400 to-blue-600 text-white',
      'PLATINUM': 'bg-gradient-to-r from-green-400 to-green-600 text-white',
      'GOLD': 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white',
      'SILVER': 'bg-gradient-to-r from-gray-300 to-gray-500 text-gray-900',
      'BRONZE': 'bg-gradient-to-r from-orange-600 to-orange-800 text-white',
      'IRON': 'bg-gradient-to-r from-gray-600 to-gray-800 text-white',
    }
    return colors[tier as keyof typeof colors] || 'bg-gray-500 text-white'
  }

  const getTierIcon = (tier: string) => {
    const icons = {
      'CHALLENGER': ' crown',
      'GRANDMASTER': ' star',
      'MASTER': ' gem',
      'DIAMOND': ' diamond',
      'PLATINUM': ' shield',
      'GOLD': ' medal',
      'SILVER': ' award',
      'BRONZE': ' hammer',
      'IRON': ' sword',
    }
    return icons[tier as keyof typeof icons] || ' rank'
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge className={cn("px-3 py-1 font-semibold", getTierColor(tier))}>
        <span className="mr-1">{getTierIcon(tier)}</span>
        {tier} {rank}
      </Badge>
      {lp !== undefined && (
        <Badge variant="secondary" className="px-2 py-1">
          {lp} LP
        </Badge>
      )}
    </div>
  )
}
