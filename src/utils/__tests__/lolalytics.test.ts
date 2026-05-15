// Tests for lolalytics cache helpers and parse logic.
// HTTP calls are fully mocked — no network required.
// localStorage mocked via vi.stubGlobal — no jsdom needed.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── In-memory localStorage mock (works in node environment) ─────────────────
function createLocalStorageMock() {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value) },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
}

const localStorageMock = createLocalStorageMock()
vi.stubGlobal('localStorage', localStorageMock)

// ── Shared mock response ─────────────────────────────────────────────────────
const MOCK_RESPONSE = {
  item1:  [[3031, 5000, 2500]],
  item2:  [[3094, 4000, 2000]],
  item3:  [[3046, 3500, 1750]],
  boots:  [[3006, 4500, 2200]],
  n:      15000,
  avgWr:  8000,
  summary: {
    pick: {
      skillorder: { id: 213114 },
      items: {
        item4: [{ id: 3072, n: 2000, w: 900 }],
        item5: [{ id: 3036, n: 1500, w: 700 }],
      },
      runes: {
        set:  { pri: [8008] },
        page: { sec: 2 },   // index 2 → TREE_IDS[2] = 8200 (Sorcery)
      },
    },
  },
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function freshModule() {
  vi.resetModules()
  const mod = await import('../lolalytics')
  return mod
}

// ─────────────────────────────────────────────────────────────────────────────

describe('lolalytics — localStorage cache helpers', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorageMock.clear()
  })

  it('getCachedBuild returns null when nothing stored', async () => {
    const { clearStaleBuildCache } = await freshModule()
    expect(() => clearStaleBuildCache('16.10')).not.toThrow()

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(['16.10.1']) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_RESPONSE) }),
    )
    const { fetchChampionBuild } = await freshModule()
    const result = await fetchChampionBuild('jinx', 'adc')
    expect(result.core_items).toHaveLength(3)
    expect(vi.mocked(globalThis.fetch).mock.calls.length).toBe(2)
  })

  it('clearStaleBuildCache removes entries with a different patch', async () => {
    const oldEntry = JSON.stringify({ patch: '16.9', data: {}, cachedAt: Date.now() })
    localStorageMock.setItem('lolBuild_old_entry', oldEntry)

    const { clearStaleBuildCache } = await freshModule()
    clearStaleBuildCache('16.10')

    expect(localStorageMock.getItem('lolBuild_old_entry')).toBeNull()
  })

  it('clearStaleBuildCache keeps entries with the current patch', async () => {
    const entry = JSON.stringify({
      patch: '16.10',
      data: { core_items: [3031], boots: 3006, keystone_id: 8008, sec_tree_id: 8200, total_games: 100, winrate: 50 },
      cachedAt: Date.now(),
    })
    localStorageMock.setItem('lolBuild_16.10_jinx_bottom', entry)

    const { clearStaleBuildCache } = await freshModule()
    clearStaleBuildCache('16.10')

    expect(localStorageMock.getItem('lolBuild_16.10_jinx_bottom')).not.toBeNull()
  })

  it('clearStaleBuildCache silently removes corrupt entries', async () => {
    localStorageMock.setItem('lolBuild_corrupt', 'not-valid-json{{{')

    const { clearStaleBuildCache } = await freshModule()
    expect(() => clearStaleBuildCache('16.10')).not.toThrow()
    expect(localStorageMock.getItem('lolBuild_corrupt')).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('lolalytics — fetchChampionBuild', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorageMock.clear()
  })

  it('parses core_items correctly (item1, item2, item3 top-level arrays)', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(['16.10.1']) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_RESPONSE) }),
    )
    const { fetchChampionBuild } = await freshModule()
    const result = await fetchChampionBuild('jinx', 'adc')
    expect(result.core_items).toEqual([3031, 3094, 3046])
  })

  it('parses boots correctly', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(['16.10.1']) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_RESPONSE) }),
    )
    const { fetchChampionBuild } = await freshModule()
    const result = await fetchChampionBuild('jinx', 'adc')
    expect(result.boots).toBe(3006)
  })

  it('parses keystone and secondary tree from summary.pick.runes', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(['16.10.1']) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_RESPONSE) }),
    )
    const { fetchChampionBuild } = await freshModule()
    const result = await fetchChampionBuild('jinx', 'adc')
    expect(result.keystone_id).toBe(8008)
    expect(result.sec_tree_id).toBe(8200)
  })

  it('parses total_games and winrate from top-level n/avgWr', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(['16.10.1']) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_RESPONSE) }),
    )
    const { fetchChampionBuild } = await freshModule()
    const result = await fetchChampionBuild('jinx', 'adc')
    expect(result.total_games).toBe(15000)
    expect(result.winrate).toBe(8000)
  })

  it('parses skill_order from summary.pick.skillorder.id digits', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(['16.10.1']) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_RESPONSE) }),
    )
    const { fetchChampionBuild } = await freshModule()
    const result = await fetchChampionBuild('jinx', 'adc')
    // 213114 → digits 2,1,3,1,1,4 → W,Q,E,Q,Q,R
    expect(result.skill_order).toBe('WQEQQR')
  })

  it('parses situational_items from summary.pick.items.item4 and item5', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(['16.10.1']) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_RESPONSE) }),
    )
    const { fetchChampionBuild } = await freshModule()
    const result = await fetchChampionBuild('jinx', 'adc')
    expect(result.situational_items).toEqual([3072, 3036])
  })

  it('uses localStorage cache on second call — fetch called only once for data', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(['16.10.1']) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_RESPONSE) })
    vi.stubGlobal('fetch', fetchMock)

    const { fetchChampionBuild } = await freshModule()
    await fetchChampionBuild('jinx', 'adc')
    await fetchChampionBuild('jinx', 'adc')

    // DDragon (1) + lolalytics (1) = 2 total; second call hits localStorage
    expect(fetchMock.mock.calls.length).toBe(2)
  })

  it('handles missing skill_order gracefully (returns undefined)', async () => {
    const noSkillOrder = {
      ...MOCK_RESPONSE,
      summary: { pick: { ...MOCK_RESPONSE.summary.pick, skillorder: undefined } },
    }
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(['16.10.1']) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(noSkillOrder) }),
    )
    const { fetchChampionBuild } = await freshModule()
    const result = await fetchChampionBuild('ahri', 'mid')
    expect(result.skill_order).toBeUndefined()
  })

  it('handles missing situational items gracefully (returns undefined)', async () => {
    const noItems = {
      ...MOCK_RESPONSE,
      summary: { pick: { ...MOCK_RESPONSE.summary.pick, items: undefined } },
    }
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(['16.10.1']) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(noItems) }),
    )
    const { fetchChampionBuild } = await freshModule()
    const result = await fetchChampionBuild('ahri', 'mid')
    expect(result.situational_items).toBeUndefined()
  })

  it('maps role "jungle" to lane "jungle" in the request URL', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(['16.10.1']) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_RESPONSE) })
    vi.stubGlobal('fetch', fetchMock)
    const { fetchChampionBuild } = await freshModule()
    await fetchChampionBuild('leesin', 'jungle')
    expect(fetchMock.mock.calls[1][0] as string).toContain('lane=jungle')
  })

  it('maps role "adc" to lane "bottom" in the request URL', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(['16.10.1']) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_RESPONSE) })
    vi.stubGlobal('fetch', fetchMock)
    const { fetchChampionBuild } = await freshModule()
    await fetchChampionBuild('jinx', 'adc')
    expect(fetchMock.mock.calls[1][0] as string).toContain('lane=bottom')
  })

  it('maps role "mid" to lane "middle" in the request URL', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(['16.10.1']) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_RESPONSE) })
    vi.stubGlobal('fetch', fetchMock)
    const { fetchChampionBuild } = await freshModule()
    await fetchChampionBuild('yasuo', 'mid')
    expect(fetchMock.mock.calls[1][0] as string).toContain('lane=middle')
  })
})
