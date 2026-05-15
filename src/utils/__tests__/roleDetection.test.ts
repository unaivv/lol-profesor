/**
 * Tests for detectTeamRoles and findLaneOpponent.
 *
 * ddragon is mocked so tests are fully offline and deterministic.
 * Spell IDs: Smite=11, Exhaust=3, Heal=7, TP=12, Ignite=14, Barrier=21
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock ddragon ──────────────────────────────────────────────────────────────
// Champion IDs used in tests:
//   100 → Jinx (adc)
//   101 → Darius (top)
//   102 → Yasuo (mid)
//   103 → LeeSin (jungle — not in hint map, detected via Smite)
//   104 → Thresh (support)
//   105 → Ahri (mid)
//   106 → Gangplank (top)
//   999 → Unknown (not in map)

const ID_TO_NAME: Record<number, string> = {
  100: 'Jinx',
  101: 'Darius',
  102: 'Yasuo',
  103: 'LeeSin',
  104: 'Thresh',
  105: 'Ahri',
  106: 'Gangplank',
  999: 'Unknown',
}

vi.mock('../ddragon', () => ({
  getChampionName: (id: number) => ID_TO_NAME[id] ?? `Champion ${id}`,
}))

import { detectTeamRoles, findLaneOpponent } from '../roleDetection'

// ── Spell constants ───────────────────────────────────────────────────────────
const SMITE    = 11
const EXHAUST  = 3
const HEAL     = 7
const TP       = 12
const IGNITE   = 14
const BARRIER  = 21
const FLASH    = 4

// ── Player factory ────────────────────────────────────────────────────────────
let uid = 0
function player(spell1: number, spell2: number, championId?: number, puuid?: string) {
  return { puuid: puuid ?? `p${++uid}`, spell1Id: spell1, spell2Id: spell2, championId }
}

beforeEach(() => { uid = 0 })

// ─────────────────────────────────────────────────────────────────────────────

describe('detectTeamRoles', () => {
  it('assigns jungle to the player with Smite', () => {
    const jungle = player(SMITE, FLASH, 103)
    const top    = player(TP, FLASH, 101)
    const mid    = player(TP, FLASH, 102)
    const adc    = player(FLASH, HEAL, 100)
    const sup    = player(EXHAUST, IGNITE, 104)

    const roles = detectTeamRoles([jungle, top, mid, adc, sup])
    expect(roles.get(jungle.puuid)).toBe('jungle')
  })

  it('assigns support to exhaust+ignite player', () => {
    const jungle = player(SMITE, FLASH, 103)
    const top    = player(TP, FLASH, 101)
    const mid    = player(TP, FLASH, 102)
    const adc    = player(FLASH, HEAL, 100)
    const sup    = player(EXHAUST, IGNITE, 104)

    const roles = detectTeamRoles([jungle, top, mid, adc, sup])
    expect(roles.get(sup.puuid)).toBe('support')
  })

  it('assigns support to exhaust+barrier player', () => {
    const jungle = player(SMITE, FLASH, 103)
    const top    = player(TP, FLASH, 101)
    const mid    = player(TP, FLASH, 102)
    const adc    = player(FLASH, HEAL, 100)
    const sup    = player(EXHAUST, BARRIER, 104)   // Thresh with exhaust+barrier

    const roles = detectTeamRoles([jungle, top, mid, adc, sup])
    expect(roles.get(sup.puuid)).toBe('support')
  })

  it('assigns adc to single Heal player', () => {
    const jungle = player(SMITE, FLASH, 103)
    const top    = player(TP, FLASH, 101)
    const mid    = player(TP, FLASH, 102)
    const adc    = player(FLASH, HEAL, 100)        // only healer
    const sup    = player(EXHAUST, IGNITE, 104)

    const roles = detectTeamRoles([jungle, top, mid, adc, sup])
    expect(roles.get(adc.puuid)).toBe('adc')
  })

  it('uses champion hint to assign adc when two Heal users', () => {
    const jungle = player(SMITE, FLASH, 103)
    const top    = player(TP, FLASH, 101)
    const mid    = player(FLASH, IGNITE, 102)
    const adc    = player(FLASH, HEAL, 100)        // Jinx → 'adc' hint
    const sup    = player(HEAL, FLASH, 104)        // Thresh → 'support' hint — also has Heal

    const roles = detectTeamRoles([jungle, top, mid, adc, sup])
    expect(roles.get(adc.puuid)).toBe('adc')
    expect(roles.get(sup.puuid)).toBe('support')
  })

  it('assigns top to TP player with top hint', () => {
    const jungle = player(SMITE, FLASH, 103)
    const top    = player(TP, FLASH, 101)          // Darius → 'top' hint
    const mid    = player(TP, FLASH, 102)          // Yasuo → 'mid' hint
    const adc    = player(FLASH, HEAL, 100)
    const sup    = player(EXHAUST, IGNITE, 104)

    const roles = detectTeamRoles([jungle, top, mid, adc, sup])
    expect(roles.get(top.puuid)).toBe('top')
    expect(roles.get(mid.puuid)).toBe('mid')
  })

  it('uses mid champion hint to break TP tie', () => {
    const jungle = player(SMITE, FLASH, 103)
    const top    = player(TP, FLASH, 106)          // Gangplank → 'top' hint
    const mid    = player(TP, FLASH, 105)          // Ahri → 'mid' hint
    const adc    = player(FLASH, HEAL, 100)
    const sup    = player(EXHAUST, IGNITE, 104)

    const roles = detectTeamRoles([jungle, top, mid, adc, sup])
    expect(roles.get(mid.puuid)).toBe('mid')
    expect(roles.get(top.puuid)).toBe('top')
  })

  it('assigns all 5 roles when given a full 5-player team', () => {
    const team = [
      player(SMITE, FLASH, 103),
      player(TP, FLASH, 101),
      player(TP, FLASH, 102),
      player(FLASH, HEAL, 100),
      player(EXHAUST, IGNITE, 104),
    ]
    const roles = detectTeamRoles(team)

    expect(roles.size).toBe(5)
    const assigned = Array.from(roles.values())
    const allRoles = ['top', 'jungle', 'mid', 'adc', 'support']
    for (const role of allRoles) {
      expect(assigned).toContain(role)
    }
  })

  it('does NOT assign jungle to the Smite player when no Smite is present', () => {
    // Build a team where one player HAS Smite — verify Smite is what triggers jungle
    const jungler = player(SMITE, FLASH, 103)
    const rest = [
      player(TP, FLASH, 101),
      player(TP, FLASH, 102),
      player(FLASH, HEAL, 100),
      player(EXHAUST, IGNITE, 104),
    ]
    const rolesWithSmite = detectTeamRoles([jungler, ...rest])
    expect(rolesWithSmite.get(jungler.puuid)).toBe('jungle')

    // Now verify a team without any Smite does NOT assign jungle via the Smite step —
    // no player on this all-TP team has Smite, so jungle count should be at most 1
    // (one player may still get jungle via positional fallback, but only one)
    const noSmiteTeam = [
      player(TP, FLASH, 101),
      player(TP, FLASH, 102),
      player(FLASH, HEAL, 100),
      player(EXHAUST, IGNITE, 104),
      player(FLASH, IGNITE, 999),
    ]
    const rolesNoSmite = detectTeamRoles(noSmiteTeam)
    const jungleAssignments = Array.from(rolesNoSmite.values()).filter(r => r === 'jungle')
    expect(jungleAssignments.length).toBeLessThanOrEqual(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('findLaneOpponent', () => {
  it('returns my role and a matching opponent', () => {
    // Team 100: my puuid plays adc (Jinx with Heal)
    const me = { ...player(FLASH, HEAL, 100, 'my-puuid'), teamId: 100 }
    const ally1 = { ...player(SMITE, FLASH, 103), teamId: 100 }
    const ally2 = { ...player(TP, FLASH, 101), teamId: 100 }
    const ally3 = { ...player(TP, FLASH, 102), teamId: 100 }
    const ally4 = { ...player(EXHAUST, IGNITE, 104), teamId: 100 }

    // Team 200: enemy adc is Caitlyn (unmapped, but only Heal user on team)
    const enemyAdc = { ...player(FLASH, HEAL, 100, 'enemy-adc'), teamId: 200 }
    const enemy1   = { ...player(SMITE, FLASH, 103), teamId: 200 }
    const enemy2   = { ...player(TP, FLASH, 101), teamId: 200 }
    const enemy3   = { ...player(TP, FLASH, 102), teamId: 200 }
    const enemy4   = { ...player(EXHAUST, IGNITE, 104), teamId: 200 }

    const result = findLaneOpponent('my-puuid', [me, ally1, ally2, ally3, ally4, enemyAdc, enemy1, enemy2, enemy3, enemy4])

    expect(result.myRole).toBe('adc')
    expect(result.opponentPuuid).toBe('enemy-adc')
  })

  it('returns myRole "mid" and null opponent when puuid is not found', () => {
    const p1 = { ...player(FLASH, HEAL, 100), teamId: 100 }
    const result = findLaneOpponent('nonexistent-puuid', [p1])

    expect(result.myRole).toBe('mid')
    expect(result.opponentPuuid).toBeNull()
  })
})
