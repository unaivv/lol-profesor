import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { cn } from "@/lib/utils"

interface ChampionIconProps {
  championId: number
  championName: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function ChampionIcon({ championId, championName, size = "md", className }: ChampionIconProps) {
  const getSizeClasses = () => {
    switch (size) {
      case "sm": return "w-8 h-8"
      case "lg": return "w-16 h-16"
      default: return "w-12 h-12"
    }
  }

  const getChampionImage = (id: number) => {
    return `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${id}.png`
  }

  return (
    <Avatar className={cn(getSizeClasses(), "rounded-lg border-2 border-gray-200", className)}>
      <AvatarImage 
        src={getChampionImage(championId)} 
        alt={championName}
        onError={(e) => {
          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iI0Y0RjRGNiIvPgo8cGF0aCBkPSJNMjQgMTJDMjguNDE4MyAxMiAzMiAxNS41ODE3IDMyIDIwQzMyIDI0LjQxODMgMjguNDE4MyAyOCAyNCAyOEMxOS41ODE3IDI4IDE2IDI0LjQxODMgMTYgMjBDMTYgMTUuNTgxNyAxOS41ODE3IDEyIDI0IDEyWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K'
        }}
      />
      <AvatarFallback className="bg-gray-100 text-gray-600">
        {championName.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}
