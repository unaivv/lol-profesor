/**
 * Smoke tests for external HTTP endpoints.
 * These run in CI on every push to main to catch broken endpoints early.
 *
 * They make real network requests — fast by design (~30s total).
 */

import { describe, it, expect } from 'vitest'

const DD_VERSION = '16.10.1'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchCurrentPatch(): Promise<string> {
  const resp = await fetch('https://ddragon.leagueoflegends.com/api/versions.json')
  const versions = await resp.json() as string[]
  return versions[0].split('.').slice(0, 2).join('.')
}

async function getJson(url: string): Promise<unknown> {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json, */*',
      'Referer': 'https://lolalytics.com/',
    },
  })
  expect(resp.status, `HTTP ${resp.status} for ${url}`).toBe(200)
  const data = await resp.json()
  return data
}

function lolaUrl(c: string, lane: string, patch: string): string {
  const qs = new URLSearchParams({
    ep: 'build-full', v: '1', patch,
    tier: 'platinum_plus', queue: '420', region: 'all',
    c, lane,
  })
  return `https://a1.lolalytics.com/mega/?${qs}`
}

// ── Lolalytics ────────────────────────────────────────────────────────────────

describe('Lolalytics — champion build', () => {
  let patch: string

  it('DDragon versions resolves current patch', async () => {
    patch = await fetchCurrentPatch()
    expect(patch).toMatch(/^\d+\.\d+$/)
  })

  it('returns valid data for Jinx bot', async () => {
    if (!patch) patch = await fetchCurrentPatch()
    const data = await getJson(lolaUrl('jinx', 'bottom', patch)) as Record<string, unknown>
    expect(data).toBeTruthy()
    expect(data.status).not.toBe(404)
  })

  it('response has item slot data', async () => {
    if (!patch) patch = await fetchCurrentPatch()
    const data = await getJson(lolaUrl('jinx', 'bottom', patch)) as Record<string, unknown>
    const item1 = data.item1 as number[][]
    expect(Array.isArray(item1), 'item1 should be an array').toBe(true)
    expect(item1.length, 'item1 should have entries').toBeGreaterThan(0)
    expect(item1[0][0], 'item1[0][0] should be a valid item ID').toBeGreaterThan(0)
  })

  it('response has rune summary data', async () => {
    if (!patch) patch = await fetchCurrentPatch()
    const data = await getJson(lolaUrl('jinx', 'bottom', patch)) as Record<string, unknown>
    const runes = ((data.summary as Record<string, unknown>)?.pick as Record<string, unknown>)?.runes as Record<string, unknown>
    expect(runes).toBeTruthy()
    const keystone = (runes?.set as Record<string, number[]>)?.pri?.[0]
    expect(keystone, 'keystone ID should be > 0').toBeGreaterThan(0)
  })

  it('response has winrate and game count', async () => {
    if (!patch) patch = await fetchCurrentPatch()
    const data = await getJson(lolaUrl('jinx', 'bottom', patch)) as Record<string, unknown>
    expect(typeof data.avgWr).toBe('number')
    expect(typeof data.n).toBe('number')
    expect(data.n as number).toBeGreaterThan(1000)
  })

  it('returns valid data for Yasuo mid', async () => {
    if (!patch) patch = await fetchCurrentPatch()
    const data = await getJson(lolaUrl('yasuo', 'middle', patch)) as Record<string, unknown>
    expect(data.status).not.toBe(404)
  })

  it('returns valid data for Lee Sin jungle', async () => {
    if (!patch) patch = await fetchCurrentPatch()
    const data = await getJson(lolaUrl('leesin', 'jungle', patch)) as Record<string, unknown>
    expect(data.status).not.toBe(404)
  })
})

describe('Lolalytics — matchup data', () => {
  it('enemy lane data contains opponent winrates', async () => {
    const patch = await fetchCurrentPatch()
    const data = await getJson(lolaUrl('jinx', 'bottom', patch)) as Record<string, unknown>
    const enemy = (data.enemy as Record<string, number[][]> | undefined)?.bottom
    expect(Array.isArray(enemy), 'enemy.bottom should be an array').toBe(true)
    expect(enemy!.length, 'should have multiple opponents').toBeGreaterThan(5)
    const entry = enemy!.find(e => e[0] === 51)  // Caitlyn
    expect(entry, 'Caitlyn (51) should appear in enemy list').toBeTruthy()
    expect(entry![1], 'winrate vs Caitlyn should be a number > 0').toBeGreaterThan(0)
  })
})

// ── DDragon ───────────────────────────────────────────────────────────────────

describe('DDragon', () => {
  const base = `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}`

  it('champion.json returns valid data', async () => {
    const data = await getJson(`${base}/data/en_US/champion.json`) as Record<string, unknown>
    expect(data.data).toBeTruthy()
    const champs = Object.keys(data.data as object)
    expect(champs.length).toBeGreaterThan(150)
  })

  it('item.json returns valid data', async () => {
    const data = await getJson(`${base}/data/en_US/item.json`) as Record<string, unknown>
    expect(data.data).toBeTruthy()
    const items = Object.keys(data.data as object)
    expect(items.length).toBeGreaterThan(100)
  })

  it('champion image resolves (Jinx)', async () => {
    const resp = await fetch(`${base}/img/champion/Jinx.png`)
    expect(resp.status).toBe(200)
    expect(resp.headers.get('content-type')).toContain('image')
  })
})
