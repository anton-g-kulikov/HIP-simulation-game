import { describe, it, expect } from 'vitest'
import {
  energyZone,
  highEffortStreak,
  repetitionMultiplier,
  inflatedCost,
  raiseHeat,
  coolDown,
  effectiveBudget,
  HEAT_CAP,
} from '@engine/energy'
import type { ActionCategory, HeatMap } from '@engine/types'

// Test intent: test/test-documentation.md, M1 §energy.ts (cases 2.1–2.10)
// Formulas: _meta/specs/HIP_Simulation_Spec.md §2.3, §2.4

const emptyHeat = (): HeatMap => ({
  current_job: 0,
  job_search: 0,
  learning: 0,
  project: 0,
  network_public: 0,
})

describe('energy — repetition cost', () => {
  it('2.1 maps heat tiers to the specified multipliers', () => {
    expect(repetitionMultiplier(0)).toBe(1.0)
    expect(repetitionMultiplier(1)).toBe(1.5)
    expect(repetitionMultiplier(2)).toBe(2.0)
    expect(repetitionMultiplier(3)).toBe(3.0)
    expect(repetitionMultiplier(3.5)).toBe(3.0)
  })

  it('2.2 floors fractional heat to its tier', () => {
    expect(repetitionMultiplier(1.9)).toBe(1.5)
    expect(repetitionMultiplier(0.99)).toBe(1.0)
    expect(repetitionMultiplier(2.4)).toBe(2.0)
  })

  it('2.3 rounds inflated cost up', () => {
    // base 3 at 1.5x is 4.5 → 5
    expect(inflatedCost(3, 1)).toBe(5)
    expect(inflatedCost(2, 1)).toBe(3)
    expect(inflatedCost(1, 1)).toBe(2)
    expect(inflatedCost(4, 0)).toBe(4)
    expect(inflatedCost(3, 2)).toBe(6)
  })
})

describe('energy — heat accumulation', () => {
  it('2.4 raises heat once per turn per category regardless of how many actions used it', () => {
    const heat = emptyHeat()
    const used: ActionCategory[] = ['current_job', 'current_job', 'current_job']
    const next = raiseHeat(heat, used)
    expect(next.current_job).toBe(1)
    expect(next.learning).toBe(0)
  })

  it('2.4b raises heat for each distinct category used', () => {
    const next = raiseHeat(emptyHeat(), ['current_job', 'learning'])
    expect(next.current_job).toBe(1)
    expect(next.learning).toBe(1)
    expect(next.project).toBe(0)
  })

  it('2.7 caps heat', () => {
    let heat = emptyHeat()
    for (let i = 0; i < 10; i++) heat = raiseHeat(heat, ['project'])
    expect(heat.project).toBe(HEAT_CAP)
  })
})

describe('energy — cooldown', () => {
  it('2.5 decays each category at its own rate', () => {
    const heat: HeatMap = { ...emptyHeat(), current_job: 3, project: 3 }
    const next = coolDown(heat, 1)
    expect(next.current_job).toBeCloseTo(2.0, 5) // fast: -1.0
    expect(next.project).toBeCloseTo(2.66, 5) // slow: -0.34
  })

  it('2.6 floors heat at zero', () => {
    let heat: HeatMap = { ...emptyHeat(), job_search: 1 }
    heat = coolDown(heat, 1)
    heat = coolDown(heat, 1)
    heat = coolDown(heat, 1)
    expect(heat.job_search).toBe(0)
  })

  it('2.8 applies the rest bonus when the previous turn left three or more energy unused', () => {
    const heat: HeatMap = { ...emptyHeat(), current_job: 3 }
    const rested = coolDown(heat, 3)
    const notRested = coolDown(heat, 2)
    expect(rested.current_job).toBeCloseTo(1.5, 5) // -1.0 * 1.5
    expect(notRested.current_job).toBeCloseTo(2.0, 5)
  })
})

describe('energy — budget', () => {
  it('2.10 keeps the budget within bounds for legal modifiers', () => {
    expect(effectiveBudget(0)).toBe(10)
    expect(effectiveBudget(-4)).toBe(6)
    expect(effectiveBudget(2)).toBe(12)
    // out-of-range modifiers are clamped, not honoured
    expect(effectiveBudget(-99)).toBe(6)
    expect(effectiveBudget(99)).toBe(12)
  })
})

// Test intent: test/test-documentation.md, M4f (16.1–16.4)

describe('energy — zones', () => {
  const HIGH_EFFORT = 9
  const BUDGET = 10

  it('16.1 starts the hard zone at the high-effort threshold', () => {
    expect(energyZone(9, BUDGET, HIGH_EFFORT)).toBe('hard')
    expect(energyZone(10, BUDGET, HIGH_EFFORT)).toBe('hard')
    expect(energyZone(8, BUDGET, HIGH_EFFORT)).not.toBe('hard')
  })

  it('16.2 marks the point that forfeits the rest bonus as a stretch', () => {
    // Leaving three unused earns the cooldown bonus, so spending the eighth
    // point is where it is given up.
    expect(energyZone(8, BUDGET, HIGH_EFFORT)).toBe('stretch')
  })

  it('16.3 treats everything that keeps the rest bonus as steady', () => {
    for (const point of [1, 2, 3, 4, 5, 6, 7]) {
      expect(energyZone(point, BUDGET, HIGH_EFFORT), `point ${point}`).toBe('steady')
    }
  })

  it('16.4 has no hard zone when the budget cannot reach the threshold', () => {
    // An event-reduced month cannot trigger burnout, so it must not warn about it.
    const reduced = 8
    for (let point = 1; point <= reduced; point++) {
      expect(energyZone(point, reduced, HIGH_EFFORT), `point ${point}`).not.toBe('hard')
    }
  })

  it('16.4b still marks the stretch in a reduced budget', () => {
    expect(energyZone(6, 8, 9)).toBe('stretch')
    expect(energyZone(5, 8, 9)).toBe('steady')
  })
})

describe('energy — high-effort streak', () => {
  const record = (energySpent: number) => ({ energySpent }) as never

  it('counts consecutive hard months, most recent first', () => {
    expect(highEffortStreak([record(9), record(10), record(9)], 9)).toBe(3)
  })

  it('resets on a month below the threshold', () => {
    expect(highEffortStreak([record(10), record(4), record(9)], 9)).toBe(1)
  })

  it('is zero with no history', () => {
    expect(highEffortStreak([], 9)).toBe(0)
  })
})
