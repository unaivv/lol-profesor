const BASE = 'https://a1.lolalytics.com/mega/'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://lolalytics.com/',
}

let cachedPatch: string | null = null

async function getCurrentPatch(): Promise<string> {
  if (cachedPatch) return cachedPatch
  const resp = await fetch('https://ddragon.leagueoflegends.com/api/versions.json')
  const versions = await resp.json() as string[]
  cachedPatch = versions[0].split('.').slice(0, 2).join('.')
  return cachedPatch
}

// ─── localStorage helpers ────────────────────────────────────────────────────

const LS_PREFIX = 'lolBuild_'

interface BuildCacheEntry {
  patch: string
  data: LolalyticsData
  cachedAt: number
}

function lsKey(patch: string, championKey: string, lane: string): string {
  return `${LS_PREFIX}${patch}_${championKey}_${lane}`
}

function getCachedBuild(key: string, currentPatch: string): LolalyticsData | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry = JSON.parse(raw) as BuildCacheEntry
    if (entry.patch !== currentPatch) return null
    return entry.data
  } catch {
    return null
  }
}

function setCachedBuild(key: string, patch: string, data: LolalyticsData): void {
  try {
    const entry: BuildCacheEntry = { patch, data, cachedAt: Date.now() }
    localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // quota exceeded, private mode, etc. — fail silently
  }
}

export function clearStaleBuildCache(currentPatch: string): void {
  try {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(LS_PREFIX)) continue
      try {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const entry = JSON.parse(raw) as BuildCacheEntry
        if (entry.patch !== currentPatch) toRemove.push(key)
      } catch {
        toRemove.push(key!)
      }
    }
    for (const key of toRemove) localStorage.removeItem(key)
  } catch {
    // localStorage unavailable — fail silently
  }
}

// ─── In-memory dedup cache (Promise-level, per session) ──────────────────────

// Cache in-flight and resolved promises to avoid duplicate requests
const buildCache = new Map<string, Promise<Record<string, unknown>>>()

async function fetchRaw(championKey: string, lane: string): Promise<Record<string, unknown>> {
  const patch = await getCurrentPatch()
  const cacheKey = `${championKey}:${lane}:${patch}`
  if (!buildCache.has(cacheKey)) {
    const qs = new URLSearchParams({ ep: 'build-full', v: '1', patch, tier: 'platinum_plus', queue: '420', region: 'all', c: championKey, lane })
    const p = fetch(`${BASE}?${qs}`, { headers: HEADERS })
      .then(r => { if (!r.ok) throw new Error(`Lolalytics HTTP ${r.status}`); return r.json() as Promise<Record<string, unknown>> })
      .then(data => { if (data.status === 404) throw new Error('Champion/lane not found'); return data })
    buildCache.set(cacheKey, p)
  }
  return buildCache.get(cacheKey)!
}

function laneStr(role: string): string {
  switch (role) {
    case 'jungle':  return 'jungle'
    case 'top':     return 'top'
    case 'mid':     return 'middle'
    case 'adc':     return 'bottom'
    case 'support': return 'support'
    default:        return 'bottom'
  }
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
  const items: number[] = []
  for (const slot of ['item1', 'item2', 'item3']) {
    const arr = data[slot] as number[][] | undefined
    if (Array.isArray(arr) && arr.length > 0 && Array.isArray(arr[0]) && (arr[0][0] as number) > 0) {
      items.push(arr[0][0] as number)
    }
  }
  return items
}

function extractBoots(data: Record<string, unknown>): number | null {
  const arr = data.boots as number[][] | undefined
  if (Array.isArray(arr) && arr.length > 0 && Array.isArray(arr[0]) && (arr[0][0] as number) > 0) {
    return arr[0][0] as number
  }
  return null
}

// Tree IDs indexed by lolalytics page.pri/sec (0=Precision, 1=Domination, 2=Sorcery, 3=Resolve, 4=Inspiration)
const TREE_IDS = [8000, 8100, 8200, 8400, 8300]

function extractRunes(data: Record<string, unknown>): [number | null, number | null] {
  const runes = ((data.summary as Record<string, unknown>)?.pick as Record<string, unknown>)?.runes as Record<string, unknown> | undefined
  if (!runes) return [null, null]
  const set = runes.set as { pri?: number[] } | undefined
  const page = runes.page as { sec?: number } | undefined
  const keystone = set?.pri?.[0] ?? null
  const secIdx = page?.sec
  const secTree = secIdx != null && secIdx >= 0 && secIdx < TREE_IDS.length ? TREE_IDS[secIdx] : null
  return [keystone ?? null, secTree]
}

function parse(data: Record<string, unknown>): LolalyticsData {
  const [keystone, secTree] = extractRunes(data)
  return {
    core_items:  extractBestBuild(data),
    boots:       extractBoots(data),
    keystone_id: keystone,
    sec_tree_id: secTree,
    total_games: typeof data.n === 'number' ? data.n : 0,
    winrate:     typeof data.avgWr === 'number' ? data.avgWr : 0,
  }
}

export async function fetchChampionBuild(championKey: string, role: string): Promise<LolalyticsData> {
  const lane = laneStr(role)
  const patch = await getCurrentPatch()
  const key = lsKey(patch, championKey, lane)

  // localStorage hit: return immediately without a network request
  const cached = getCachedBuild(key, patch)
  if (cached) return cached

  const data = await fetchRaw(championKey, lane)
  const result = parse(data)
  setCachedBuild(key, patch, result)
  return result
}

export async function fetchMatchupData(
  championKey: string,
  role: string,
  vsChampionId: number,
): Promise<LolalyticsData> {
  const lane = laneStr(role)
  const data = await fetchRaw(championKey, lane)
  const enemy = (data.enemy as Record<string, number[][]> | undefined)?.[lane] ?? []
  const entry = enemy.find(e => Array.isArray(e) && e[0] === vsChampionId)
  if (!entry) throw new Error('Matchup data not found')
  const [, winrate, , , , games] = entry
  return {
    core_items:  [],
    boots:       null,
    keystone_id: null,
    sec_tree_id: null,
    total_games: games ?? 0,
    winrate:     winrate ?? 0,
  }
}
