export interface FavoriteSummoner {
  gameName: string
  tagLine: string
  region: string
  profileIconId?: number
}

const KEY = 'lolProfessorFavorites'

function read(): FavoriteSummoner[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function write(list: FavoriteSummoner[]) {
  localStorage.setItem(KEY, JSON.stringify(list))
  window.dispatchEvent(new Event('favoritesChanged'))
}

function samePlayer(a: FavoriteSummoner, b: FavoriteSummoner) {
  return (
    a.gameName.toLowerCase() === b.gameName.toLowerCase() &&
    a.tagLine.toLowerCase() === b.tagLine.toLowerCase() &&
    a.region === b.region
  )
}

export function useFavorites() {
  const getFavorites = (): FavoriteSummoner[] => read()

  const isFavorite = (gameName: string, tagLine: string, region: string): boolean =>
    read().some(f => samePlayer(f, { gameName, tagLine, region }))

  const addFavorite = (s: FavoriteSummoner) => {
    const list = read()
    if (!list.some(f => samePlayer(f, s))) {
      write([...list, s])
    }
  }

  const removeFavorite = (gameName: string, tagLine: string, region: string) => {
    write(read().filter(f => !samePlayer(f, { gameName, tagLine, region })))
  }

  return { getFavorites, isFavorite, addFavorite, removeFavorite }
}
