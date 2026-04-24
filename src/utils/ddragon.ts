// DDragon utilities - manages champion/item/spell image URLs
// Fetches champion.json on app start to get correct filenames

const DD_VERSION = '16.8.1'
const BASE_URL = `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}`

let championMap: Record<number, string> = {}
let loaded = false

interface ChampionInfo {
  key: string
  id: string
}

export function initChampionMap(): void {
  if (loaded) return
  
  fetch(`${BASE_URL}/data/en_US/champion.json`)
    .then(res => res.json())
    .then((data: { data: Record<string, ChampionInfo> }) => {
      for (const champ of Object.values(data.data)) {
        const id = parseInt(champ.key, 10)
        if (!isNaN(id)) {
          championMap[id] = champ.id
        }
      }
      loaded = true
      console.log('Champion map loaded:', Object.keys(championMap).length, 'champions')
    })
    .catch(e => console.error('Failed to load champion map:', e))
}

// Champion image from ID
export function getChampionImageUrl(championId: number): string {
  const name = championMap[championId]
  if (name) {
    return `${BASE_URL}/img/champion/${name}.png`
  }
  return `${BASE_URL}/img/champion/Aatrox.png`
}

// Champion image from name (for when you already have the name)
// Uses championMap to normalize the name to the correct DDragon format
export function getChampionImageUrlByName(championName: string): string {
  // First try to find by matching the name in our championMap (normalize)
  const normalizedName = Object.values(championMap).find(
    (name) => name.toLowerCase() === championName.toLowerCase()
  )
  if (normalizedName) {
    return `${BASE_URL}/img/champion/${normalizedName}.png`
  }
  
  // If we have the championMap loaded, try to find by ID if the name is a number
  const id = parseInt(championName, 10)
  if (!isNaN(id) && championMap[id]) {
    return `${BASE_URL}/img/champion/${championMap[id]}.png`
  }
  
  // Last resort: try the name as-is (may work for some cases)
  return `${BASE_URL}/img/champion/${championName}.png`
}

// Profile icon
export function getProfileIconUrl(iconId: number): string {
  return `${BASE_URL}/img/profileicon/${iconId}.png`
}

// Item image
export function getItemImageUrl(itemId: number): string {
  return `${BASE_URL}/img/item/${itemId}.png`
}

// Spell image
export function getSpellImageUrl(spellName: string): string {
  return `${BASE_URL}/img/spell/${spellName}.png`
}