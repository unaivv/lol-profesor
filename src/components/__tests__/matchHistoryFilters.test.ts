/**
 * Tests for MatchHistoryFilters pure logic helpers.
 * No React rendering — pure function tests only.
 */

import { describe, it, expect } from 'vitest'
import {
  getQueueLabel,
  getPlayerOutcome,
  getPlayerChampion,
  filterMatches,
  type OutcomeFilter,
} from '../MatchHistoryFilters'
import type { DetailedMatch } from '../../types/api'
import type { Participant } from '../../types/api'

// ── Match factory ─────────────────────────────────────────────────────────────

let matchIdCounter = 1

function makeParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    participantId: 1,
    teamId: 100,
    win: true,
    championId: 222,
    championName: 'Jinx',
    summonerName: 'TestPlayer',
    profileIconId: 1,
    puuid: 'default-puuid',
    kills: 5,
    deaths: 2,
    assists: 8,
    goldEarned: 15000,
    totalMinionsKilled: 200,
    visionWardsBoughtInGame: 2,
    visionScore: 30,
    wardsPlaced: 10,
    wardsKilled: 3,
    damageDealtToChampions: 25000,
    damageTaken: 12000,
    totalHeal: 1000,
    timePlayed: 1800,
    item0: 3031, item1: 3094, item2: 3046, item3: 3006,
    item4: 3072, item5: 3036, item6: 0,
    championLevel: 18,
    summoner1Id: 4,
    summoner2Id: 7,
    ...overrides,
  }
}

function makeMatch(overrides: Partial<DetailedMatch> = {}): DetailedMatch {
  const id = `game-${matchIdCounter++}`
  return {
    gameId: id,
    gameCreation: Date.now(),
    gameDuration: 1800,
    gameMode: 'CLASSIC',
    gameType: 'MATCHED_GAME',
    gameVersion: '16.10.0',
    mapId: 11,
    participants: [makeParticipant()],
    queueId: 420,
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('getQueueLabel', () => {
  it('returns Ranked Solo/Duo for queueId 420', () => {
    expect(getQueueLabel(420)).toBe('Ranked Solo/Duo')
  })

  it('returns Ranked Flex for queueId 440', () => {
    expect(getQueueLabel(440)).toBe('Ranked Flex')
  })

  it('returns Normal for queueId 400', () => {
    expect(getQueueLabel(400)).toBe('Normal')
  })

  it('returns Normal for queueId 430', () => {
    expect(getQueueLabel(430)).toBe('Normal')
  })

  it('returns ARAM for queueId 450', () => {
    expect(getQueueLabel(450)).toBe('ARAM')
  })

  it('returns Otro for unknown queueId', () => {
    expect(getQueueLabel(9999)).toBe('Otro')
  })

  it('returns Otro for undefined queueId', () => {
    expect(getQueueLabel(undefined)).toBe('Otro')
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('getPlayerOutcome', () => {
  it('returns true (win) for the matched participant', () => {
    const match = makeMatch({
      participants: [makeParticipant({ puuid: 'player-1', win: true })],
    })
    expect(getPlayerOutcome(match, 'player-1')).toBe(true)
  })

  it('returns false (loss) for the matched participant', () => {
    const match = makeMatch({
      participants: [makeParticipant({ puuid: 'player-1', win: false })],
    })
    expect(getPlayerOutcome(match, 'player-1')).toBe(false)
  })

  it('returns null when no participants', () => {
    const match = makeMatch({ participants: [] })
    expect(getPlayerOutcome(match, 'player-1')).toBeNull()
  })

  it('falls back to first participant when puuid not provided', () => {
    const match = makeMatch({
      participants: [makeParticipant({ win: true })],
    })
    expect(getPlayerOutcome(match)).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('getPlayerChampion', () => {
  it('returns champion name for matched participant', () => {
    const match = makeMatch({
      participants: [makeParticipant({ puuid: 'player-1', championName: 'Caitlyn' })],
    })
    expect(getPlayerChampion(match, 'player-1')).toBe('Caitlyn')
  })

  it('returns null when no participants', () => {
    const match = makeMatch({ participants: [] })
    expect(getPlayerChampion(match, 'player-1')).toBeNull()
  })

  it('falls back to first participant when puuid not provided', () => {
    const match = makeMatch({
      participants: [makeParticipant({ championName: 'Jinx' })],
    })
    expect(getPlayerChampion(match)).toBe('Jinx')
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('filterMatches', () => {
  const PUUID = 'test-puuid'

  function makeMatchFor(
    win: boolean,
    champion: string,
    queueId: number,
  ): DetailedMatch {
    return makeMatch({
      queueId,
      participants: [
        makeParticipant({ puuid: PUUID, win, championName: champion }),
      ],
    })
  }

  it('returns all matches when all filters are "all"', () => {
    const matches = [
      makeMatchFor(true,  'Jinx',     420),
      makeMatchFor(false, 'Caitlyn',  440),
      makeMatchFor(true,  'Ashe',     450),
    ]
    expect(filterMatches(matches, 'all', 'all', 'all', PUUID)).toHaveLength(3)
  })

  it('win filter returns only wins', () => {
    const matches = [
      makeMatchFor(true,  'Jinx',    420),
      makeMatchFor(false, 'Jinx',    420),
      makeMatchFor(true,  'Caitlyn', 420),
    ]
    const result = filterMatches(matches, 'win', 'all', 'all', PUUID)
    expect(result).toHaveLength(2)
    result.forEach(m => {
      expect(getPlayerOutcome(m, PUUID)).toBe(true)
    })
  })

  it('loss filter returns only losses', () => {
    const matches = [
      makeMatchFor(true,  'Jinx',    420),
      makeMatchFor(false, 'Jinx',    420),
      makeMatchFor(false, 'Caitlyn', 420),
    ]
    const result = filterMatches(matches, 'loss', 'all', 'all', PUUID)
    expect(result).toHaveLength(2)
    result.forEach(m => {
      expect(getPlayerOutcome(m, PUUID)).toBe(false)
    })
  })

  it('champion filter returns only matches with that champion', () => {
    const matches = [
      makeMatchFor(true,  'Jinx',    420),
      makeMatchFor(false, 'Jinx',    420),
      makeMatchFor(true,  'Caitlyn', 420),
    ]
    const result = filterMatches(matches, 'all', 'Jinx', 'all', PUUID)
    expect(result).toHaveLength(2)
    result.forEach(m => {
      expect(getPlayerChampion(m, PUUID)).toBe('Jinx')
    })
  })

  it('queue filter returns only ranked solo matches (queueId 420 → label "Ranked Solo/Duo")', () => {
    const matches = [
      makeMatchFor(true,  'Jinx', 420),
      makeMatchFor(true,  'Jinx', 440),
      makeMatchFor(false, 'Jinx', 450),
    ]
    const result = filterMatches(matches, 'all', 'all', 'Ranked Solo/Duo', PUUID)
    expect(result).toHaveLength(1)
    expect(result[0].queueId).toBe(420)
  })

  it('combined win + champion filter works correctly', () => {
    const matches = [
      makeMatchFor(true,  'Jinx',    420),
      makeMatchFor(false, 'Jinx',    420),
      makeMatchFor(true,  'Caitlyn', 420),
    ]
    const result = filterMatches(matches, 'win', 'Jinx', 'all', PUUID)
    expect(result).toHaveLength(1)
    expect(getPlayerOutcome(result[0], PUUID)).toBe(true)
    expect(getPlayerChampion(result[0], PUUID)).toBe('Jinx')
  })

  it('combined loss + queue filter works correctly', () => {
    const matches = [
      makeMatchFor(false, 'Jinx', 420),
      makeMatchFor(false, 'Jinx', 440),
      makeMatchFor(true,  'Jinx', 420),
    ]
    const result = filterMatches(matches, 'loss', 'all', 'Ranked Solo/Duo', PUUID)
    expect(result).toHaveLength(1)
    expect(result[0].queueId).toBe(420)
    expect(getPlayerOutcome(result[0], PUUID)).toBe(false)
  })

  it('returns empty array for empty match list', () => {
    expect(filterMatches([], 'all', 'all', 'all', PUUID)).toHaveLength(0)
  })

  it('returns empty array when no match passes the filter', () => {
    const matches = [makeMatchFor(true, 'Jinx', 420)]
    const result = filterMatches(matches, 'loss', 'all', 'all', PUUID)
    expect(result).toHaveLength(0)
  })
})
