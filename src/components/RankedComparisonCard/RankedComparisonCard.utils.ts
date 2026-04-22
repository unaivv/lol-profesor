export function getRankColor(tier: string): string {
  const colors: Record<string, string> = {
    'IRON': '#3E3E3E',
    'BRONZE': '#CD7F32',
    'SILVER': '#C0C0C0',
    'GOLD': '#FFD700',
    'PLATINUM': '#00A8B5',
    'EMERALD': '#50C878',
    'DIAMOND': '#B9F2FF',
    'MASTER': '#9D4EDD',
    'GRANDMASTER': '#DC143C',
    'CHALLENGER': '#FFA500'
  }
  return colors[tier] || '#6B7280'
}

export function getRankGradient(tier: string): string {
  const gradients: Record<string, string> = {
    'IRON': 'from-amber-900 to-amber-700',
    'BRONZE': 'from-orange-700 to-orange-500',
    'SILVER': 'from-slate-400 to-slate-300',
    'GOLD': 'from-yellow-500 to-yellow-400',
    'PLATINUM': 'from-cyan-500 to-cyan-400',
    'EMERALD': 'from-emerald-500 to-emerald-400',
    'DIAMOND': 'from-blue-500 to-blue-400',
    'MASTER': 'from-purple-600 to-purple-500',
    'GRANDMASTER': 'from-red-600 to-red-500',
    'CHALLENGER': 'from-amber-500 to-yellow-400'
  }
  return gradients[tier] || 'from-slate-600 to-slate-500'
}