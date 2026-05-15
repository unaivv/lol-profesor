/**
 * Tests for computeSessionStats — session LP, streak, and games-today logic.
 * Pure function — no React, no Tauri, no network.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { computeSessionStats, type LpSnapshot } from '../../components/RankedProgress'

// ── Helpers ───────────────────────────────────────────────────────────────────

const NOW_SEC = 1_700_000_000   // arbitrary fixed "now" in seconds

/** Create a snapshot relative to NOW_SEC. hoursAgo=0 → most recent. */
function snap(
  hoursAgo: number,
  tier: string,
  rank: string,
  lp: number,
): LpSnapshot {
  return {
    tier,
    rank,
    lp,
    recordedAt: NOW_SEC - hoursAgo * 3600,
  }
}

// Freeze time so the 24h cutoff is deterministic
function withFrozenTime(fn: () => void) {
  vi.spyOn(Date, 'now').mockReturnValue(NOW_SEC * 1000)
  fn()
  vi.restoreAllMocks()
}

// ─────────────────────────────────────────────────────────────────────────────

describe('computeSessionStats — gamesToday', () => {
  afterEach(() => vi.restoreAllMocks())

  it('counts snapshots in the last 24 hours', () => {
    withFrozenTime(() => {
      const snapshots = [
        snap(1,  'GOLD', 'II', 50),   // 1h ago — within 24h
        snap(12, 'GOLD', 'II', 30),   // 12h ago — within 24h
        snap(25, 'GOLD', 'II', 20),   // 25h ago — outside 24h
      ]
      const stats = computeSessionStats(snapshots)
      expect(stats.gamesToday).toBe(2)
    })
  })

  it('returns 0 when no snapshots in last 24h', () => {
    withFrozenTime(() => {
      const snapshots = [snap(48, 'SILVER', 'I', 90)]
      const stats = computeSessionStats(snapshots)
      expect(stats.gamesToday).toBe(0)
    })
  })

  it('returns 0 for empty snapshot list', () => {
    withFrozenTime(() => {
      const stats = computeSessionStats([])
      expect(stats.gamesToday).toBe(0)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('computeSessionStats — lpToday', () => {
  afterEach(() => vi.restoreAllMocks())

  it('computes positive LP gain (newest − oldest in window)', () => {
    withFrozenTime(() => {
      // newest: GOLD II 70 → continuous = 1200+200+70 = 1470
      // oldest: GOLD II 30 → continuous = 1200+200+30 = 1430
      // diff = +40
      const snapshots = [
        snap(1,  'GOLD', 'II', 70),
        snap(5,  'GOLD', 'II', 50),
        snap(10, 'GOLD', 'II', 30),
      ]
      const stats = computeSessionStats(snapshots)
      expect(stats.lpToday).toBe(40)
    })
  })

  it('computes negative LP loss', () => {
    withFrozenTime(() => {
      // newest: GOLD II 30 = 1430
      // oldest: GOLD II 70 = 1470
      // diff = -40
      const snapshots = [
        snap(1,  'GOLD', 'II', 30),
        snap(5,  'GOLD', 'II', 50),
        snap(10, 'GOLD', 'II', 70),
      ]
      const stats = computeSessionStats(snapshots)
      expect(stats.lpToday).toBe(-40)
    })
  })

  it('returns 0 when only one snapshot in window', () => {
    withFrozenTime(() => {
      const snapshots = [snap(1, 'GOLD', 'II', 50)]
      const stats = computeSessionStats(snapshots)
      expect(stats.lpToday).toBe(0)
    })
  })

  it('handles promotion across ranks correctly (continuous LP scale)', () => {
    withFrozenTime(() => {
      // Start GOLD III 75 LP, promoted to GOLD II 25 LP
      // GOLD III: 1200+100+75 = 1375
      // GOLD II:  1200+200+25 = 1425
      // diff = +50
      const snapshots = [
        snap(1,  'GOLD', 'II',  25),
        snap(10, 'GOLD', 'III', 75),
      ]
      const stats = computeSessionStats(snapshots)
      expect(stats.lpToday).toBe(50)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('computeSessionStats — streak', () => {
  afterEach(() => vi.restoreAllMocks())

  it('detects win streak (consecutive LP gains, newest-first)', () => {
    // All snapshots increase LP: index 0 > 1 > 2 means wins walking newest-first
    // snapshots[0].continuousLP > snapshots[1].continuousLP → win
    const snapshots = [
      snap(1,  'GOLD', 'II', 80),   // newest
      snap(3,  'GOLD', 'II', 60),
      snap(6,  'GOLD', 'II', 40),
      snap(48, 'GOLD', 'II', 20),   // outside 24h but still in list for streak
    ]
    const stats = computeSessionStats(snapshots)
    expect(stats.streak.direction).toBe('win')
    expect(stats.streak.count).toBe(3)
  })

  it('detects loss streak (consecutive LP losses)', () => {
    const snapshots = [
      snap(1,  'GOLD', 'II', 20),   // newest — lowest
      snap(3,  'GOLD', 'II', 40),
      snap(6,  'GOLD', 'II', 60),
    ]
    const stats = computeSessionStats(snapshots)
    expect(stats.streak.direction).toBe('loss')
    expect(stats.streak.count).toBe(2)
  })

  it('stops streak when direction changes', () => {
    // 80 → 60 → 70 → newest first: 80 vs 60 = win, 60 vs 70 = loss → stops at 1
    const snapshots = [
      snap(1,  'GOLD', 'II', 80),
      snap(3,  'GOLD', 'II', 60),
      snap(6,  'GOLD', 'II', 70),
    ]
    const stats = computeSessionStats(snapshots)
    expect(stats.streak.count).toBe(1)
    expect(stats.streak.direction).toBe('win')
  })

  it('returns none streak for empty list', () => {
    const stats = computeSessionStats([])
    expect(stats.streak.direction).toBe('none')
    expect(stats.streak.count).toBe(0)
  })

  it('returns none streak for single snapshot', () => {
    const snapshots = [snap(1, 'GOLD', 'II', 50)]
    const stats = computeSessionStats(snapshots)
    expect(stats.streak.direction).toBe('none')
    expect(stats.streak.count).toBe(0)
  })

  it('skips zero-diff snapshots (same LP repeated)', () => {
    // 50, 50, 30 → first diff is 0 (skipped), second diff is win (+20)
    const snapshots = [
      snap(1,  'GOLD', 'II', 50),
      snap(3,  'GOLD', 'II', 50),   // same LP — skipped
      snap(6,  'GOLD', 'II', 30),
    ]
    const stats = computeSessionStats(snapshots)
    expect(stats.streak.direction).toBe('win')
    expect(stats.streak.count).toBe(1)
  })
})
