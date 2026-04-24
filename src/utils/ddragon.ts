const DD_VERSION = '16.7.1'

// Champion name variations that don't match DDragon filenames
// API name -> DDragon filename
const NAME_FIXES: Record<string, string> = {
  'FiddleSticks': 'Fiddlesticks',
  'LeBlanc': 'Leblanc',
  'Velkoz': 'VelKoz',
  'KogMaw': 'KogMaw',
  'JarvanIV': 'JarvanIV',
  'XinZhao': 'XinZhao',
  'Chaussette': ' Chaussette', // typo in data
}

export function getChampionImageUrl(championId: number, championName?: string | number): string {
  // If championName provided, try variations
  if (typeof championName === 'string' && championName) {
    // 1. Try direct (works most of the time)
    const direct = `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/champion/${championName}.png`
    
    // 2. Try fix if known
    const fixed = NAME_FIXES[championName]
    if (fixed) {
      return `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/champion/${fixed}.png`
    }
    
    // 3. Try lowercase first letter
    const lower = championName.charAt(0).toLowerCase() + championName.slice(1)
    if (lower !== championName) {
      return `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/champion/${lower}.png`
    }
    
    return direct
  }
  
  // No name - try ID as fallback (won't work for most)
  return `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/champion/${championId}.png`
}

export { DD_VERSION }