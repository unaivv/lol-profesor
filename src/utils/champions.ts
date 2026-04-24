// Champion ID to DDragon filename mapping
// Fetches from DDragon champion.json on app start

const DD_VERSION = '16.8.1'
let championMap: Record<number, string> = {}
let loaded = false

interface ChampionInfo {
  key: string
  id: string
}

export function initChampionMap(): void {
  if (loaded) return
  
  fetch(`https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/data/en_US/champion.json`)
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

export function getChampionImageUrl(championId: number): string {
  const name = championMap[championId]
  if (name) {
    return `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/champion/${name}.png`
  }
  return `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/champion/Aatrox.png`
}