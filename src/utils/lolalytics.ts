const BASE = 'https://axe.lolalytics.com/mega/'

function lane(role: string): string {
  switch (role) {
    case 'jungle':  return 'jungle'
    case 'top':     return 'top'
    case 'mid':     return 'middle'
    case 'adc':     return 'bot'
    case 'support': return 'support'
    default:        return 'default'
  }
}

function buildUrl(params: Record<string, string>): string {
  const qs = new URLSearchParams({ ep: 'champion', p: 'd', v: '1', patch: 'current', tier: 'platinum_plus', queue: '420', region: 'all', ...params })
  return `${BASE}?${qs}`
}

export interface LolalyticsData {
  core_items:   number[]
  boots:        number | null
  keystone_id:  number | null
  sec_tree_id:  number | null
  total_games:  number
  winrate:      number
}

function extractBestBuild(data: Record<string, unknown>): number[] {
  const builds = (data?.items as Record<string, unknown>)?.build
  if (!Array.isArray(builds) || builds.length === 0) return []
  const first = builds[0] as number[]
  if (!Array.isArray(first) || first.length <= 2) return []
  return first.slice(0, -2).filter(id => id > 0)
}

function extractBoots(data: Record<string, unknown>): number | null {
  const bootsArr = (data?.items as Record<string, unknown>)?.boots
  if (!Array.isArray(bootsArr) || bootsArr.length === 0) return null
  // Each entry: [id, games, wins]. Best winrate.
  let best: [number, number] | null = null
  for (const entry of bootsArr as number[][]) {
    if (!Array.isArray(entry) || entry[0] === 0) continue
    const wr = entry[1] > 0 ? entry[2] / entry[1] : 0
    if (!best || wr > best[1]) best = [entry[0], wr]
  }
  return best ? best[0] : null
}

function extractRunes(data: Record<string, unknown>): [number | null, number | null] {
  const perks = (data?.runes as Record<string, unknown>)?.perks
  if (!Array.isArray(perks) || perks.length === 0) return [null, null]
  const best = perks[0] as number[]
  if (!Array.isArray(best) || best.length < 5) return [null, null]
  return [best[0] ?? null, best[4] ?? null]
}

function computeWinrate(data: Record<string, unknown>): [number, number] {
  // Try top-level n/wins
  if (typeof data.n === 'number' && typeof data.wins === 'number' && data.n > 0) {
    return [data.wins / data.n * 100, data.n]
  }
  // Fallback: last two elements of best build entry [items..., games, wins]
  const builds = (data?.items as Record<string, unknown>)?.build
  if (Array.isArray(builds) && builds.length > 0) {
    const first = builds[0] as number[]
    if (Array.isArray(first) && first.length >= 2) {
      const games = first[first.length - 2]
      const wins  = first[first.length - 1]
      if (games > 0) return [wins / games * 100, games]
    }
  }
  return [0, 0]
}

function parse(data: Record<string, unknown>, includeWinrate = false): LolalyticsData {
  const [keystone, secTree] = extractRunes(data)
  const [winrate, totalGames] = includeWinrate ? computeWinrate(data) : [0, (data.n as number) ?? 0]
  return {
    core_items:  extractBestBuild(data),
    boots:       extractBoots(data),
    keystone_id: keystone,
    sec_tree_id: secTree,
    total_games: totalGames,
    winrate,
  }
}

export async function fetchChampionBuild(championId: number, role: string): Promise<LolalyticsData> {
  const url = buildUrl({ cid: String(championId), lane: lane(role) })
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Lolalytics HTTP ${resp.status}`)
  const data = await resp.json() as Record<string, unknown>
  return parse(data)
}

export async function fetchMatchupData(
  championId: number,
  role: string,
  vsChampionId: number,
): Promise<LolalyticsData> {
  const url = buildUrl({ cid: String(championId), lane: lane(role), vs: String(vsChampionId) })
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Lolalytics HTTP ${resp.status}`)
  const data = await resp.json() as Record<string, unknown>
  return parse(data, true)
}
