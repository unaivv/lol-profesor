import { Badge } from "./badge"
import { cn } from "@/lib/utils"

interface KDADisplayProps {
  kills: number
  deaths: number
  assists: number
  className?: string
}

export function KDADisplay({ kills, deaths, assists, className }: KDADisplayProps) {
  const kda = deaths === 0 ? (kills + assists).toFixed(1) : ((kills + assists) / deaths).toFixed(2)
  const kdaNum = parseFloat(kda)
  
  const getKDAColor = () => {
    if (kdaNum >= 5) return 'text-green-600 font-bold'
    if (kdaNum >= 3) return 'text-green-500'
    if (kdaNum >= 2) return 'text-yellow-500'
    return 'text-gray-600'
  }

  const getWinRateColor = () => {
    if (kdaNum >= 3) return 'bg-green-100 text-green-800'
    if (kdaNum >= 2) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex items-center gap-1">
        <span className="font-semibold text-green-600">{kills}</span>
        <span className="text-gray-400">/</span>
        <span className="font-semibold text-red-600">{deaths}</span>
        <span className="text-gray-400">/</span>
        <span className="font-semibold text-blue-600">{assists}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className={getKDAColor()}>
          KDA: {kda}
        </Badge>
        <Badge className={getWinRateColor()}>
          {kdaNum >= 3 ? 'Excellent' : kdaNum >= 2 ? 'Good' : 'Average'}
        </Badge>
      </div>
    </div>
  )
}
