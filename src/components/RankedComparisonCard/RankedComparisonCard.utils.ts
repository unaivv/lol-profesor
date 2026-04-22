// Riot Data Dragon / CommunityDragon rank emblems
// https://raw.communitydragon.org/16.2/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/
// Los colores se extraen de los emblemas oficiales de Riot

export const RANK_TIERS = [
  'IRON',
  'BRONZE', 
  'SILVER',
  'GOLD',
  'PLATINUM',
  'EMERALD',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'CHALLENGER'
] as const

export type RankTier = typeof RANK_TIERS[number]

// URLs de emblemas oficiales desde CommunityDragon (latest = version mas reciente)
const RANK_EMBLEM_BASE_URL = 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem'

export const RANK_COLORS: Record<RankTier, string> = {
  IRON: '#3E3E3E',
  BRONZE: '#CD7F32',
  SILVER: '#C0C0C0',
  GOLD: '#FFD700',
  PLATINUM: '#00A8B5',
  EMERALD: '#50C878',
  DIAMOND: '#B9F2FF',
  MASTER: '#9D4EDD',
  GRANDMASTER: '#DC143C',
  CHALLENGER: '#FFA500'
}

export const RANK_EMBLEM_URLS: Record<RankTier, string> = {
  IRON: `${RANK_EMBLEM_BASE_URL}/emblem-iron.png`,
  BRONZE: `${RANK_EMBLEM_BASE_URL}/emblem-bronze.png`,
  SILVER: `${RANK_EMBLEM_BASE_URL}/emblem-silver.png`,
  GOLD: `${RANK_EMBLEM_BASE_URL}/emblem-gold.png`,
  PLATINUM: `${RANK_EMBLEM_BASE_URL}/emblem-platinum.png`,
  EMERALD: `${RANK_EMBLEM_BASE_URL}/emblem-emerald.png`,
  DIAMOND: `${RANK_EMBLEM_BASE_URL}/emblem-diamond.png`,
  MASTER: `${RANK_EMBLEM_BASE_URL}/emblem-master.png`,
  GRANDMASTER: `${RANK_EMBLEM_BASE_URL}/emblem-grandmaster.png`,
  CHALLENGER: `${RANK_EMBLEM_BASE_URL}/emblem-challenger.png`
}

export const RANK_GRADIENTS: Record<RankTier, string> = {
  IRON: 'from-amber-900 to-amber-700',
  BRONZE: 'from-orange-700 to-orange-500',
  SILVER: 'from-slate-400 to-slate-300',
  GOLD: 'from-yellow-500 to-yellow-400',
  PLATINUM: 'from-cyan-500 to-cyan-400',
  EMERALD: 'from-emerald-500 to-emerald-400',
  DIAMOND: 'from-blue-500 to-blue-400',
  MASTER: 'from-purple-600 to-purple-500',
  GRANDMASTER: 'from-red-600 to-red-500',
  CHALLENGER: 'from-amber-500 to-yellow-400'
}

/**
 * Obtiene el color hexadecimal oficial para un tier de Ranked
 * @param tier - Nombre del tier (IRON, BRONZE, etc.) - case insensitive
 */
export function getRankColor(tier: string): string {
  const normalizedTier = tier?.toUpperCase() as RankTier
  return RANK_COLORS[normalizedTier] || '#6B7280'
}

/**
 * Obtiene la URL del emblema oficial de Riot para un tier
 * @param tier - Nombre del tier (IRON, BRONZE, etc.) - case insensitive
 */
export function getRankEmblemUrl(tier: string): string {
  const normalizedTier = tier?.toUpperCase() as RankTier
  return RANK_EMBLEM_URLS[normalizedTier] || ''
}

/**
 * Obtiene el gradiente Tailwind para un tier de Ranked
 * @param tier - Nombre del tier (IRON, BRONZE, etc.) - case insensitive
 */
export function getRankGradient(tier: string): string {
  const normalizedTier = tier?.toUpperCase() as RankTier
  return RANK_GRADIENTS[normalizedTier] || 'from-slate-600 to-slate-500'
}

/**
 * Verifica si un string es un tier válido de Ranked
 */
export function isValidRankTier(tier: string): boolean {
  return RANK_TIERS.includes(tier?.toUpperCase() as RankTier)
}