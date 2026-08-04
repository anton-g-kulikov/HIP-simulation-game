import { describe, it, expect } from 'vitest'
import {
  effortCurve,
  successProbability,
  bandForRoll,
  resolveCheck,
  buildExplanation,
} from '@engine/resolution'
import { createRng } from '@engine/rng'
import type { CheckInputs } from '@engine/types'

// Test intent: test/test-documentation.md, M1 §resolution.ts (cases 4.1–4.9)
// Formulas: _meta/specs/HIP_Simulation_Spec.md §4

describe('resolution — effort curve', () => {
  it('4.1 reproduces the spec landmarks', () => {
    expect(effortCurve(1)).toBeCloseTo(0.294, 3)
    expect(effortCurve(2)).toBeCloseTo(0.505, 3)
    expect(effortCurve(3)).toBeCloseTo(0.656, 3)
    expect(effortCurve(5)).toBeCloseTo(0.841, 3)
    expect(effortCurve(8)).toBeCloseTo(0.965, 3)
    expect(effortCurve(10)).toBeCloseTo(1.0, 3)
  })

  it('4.2 is monotonic, zero at zero, and exactly 1 at maximum energy', () => {
    expect(effortCurve(0)).toBe(0)
    expect(effortCurve(10)).toBeCloseTo(1.0, 10)
    for (let e = 1; e <= 10; e++) {
      expect(effortCurve(e)).toBeGreaterThan(effortCurve(e - 1))
    }
  })

  it('4.2b shows sharply diminishing returns past five energy', () => {
    const gain3to5 = effortCurve(5) - effortCurve(3)
    const gain8to10 = effortCurve(10) - effortCurve(8)
    expect(gain3to5).toBeGreaterThan(gain8to10 * 3)
  })
})

describe('resolution — probability', () => {
  const base = (energy: number): CheckInputs => ({
    match: 0.5,
    fit: 0.5,
    energy,
    momentum: 0,
    difficulty: 0.55,
    marketModifier: 0,
    eventModifier: 0,
  })

  it('4.3 reproduces the worked table in spec §4.3', () => {
    expect(successProbability(base(1))).toBeCloseTo(0.275, 3)
    expect(successProbability(base(3))).toBeCloseTo(0.421, 3)
    expect(successProbability(base(5))).toBeCloseTo(0.504, 3)
    expect(successProbability(base(8))).toBeCloseTo(0.559, 3)
    expect(successProbability(base(10))).toBeCloseTo(0.574, 3)
  })

  it('4.4 clamps probability into [0.03, 0.95]', () => {
    const hopeless = successProbability({
      match: 0,
      fit: 0,
      energy: 0,
      momentum: 0,
      difficulty: 1,
      marketModifier: -0.5,
      eventModifier: -0.5,
    })
    const certain = successProbability({
      match: 1,
      fit: 1,
      energy: 10,
      momentum: 1,
      difficulty: 0,
      marketModifier: 0.5,
      eventModifier: 0.5,
    })
    expect(hopeless).toBe(0.03)
    expect(certain).toBe(0.95)
  })

  it('4.4b rises with state, fit, effort and momentum, and falls with difficulty', () => {
    const p = successProbability(base(5))
    expect(successProbability({ ...base(5), match: 0.9 })).toBeGreaterThan(p)
    expect(successProbability({ ...base(5), fit: 0.9 })).toBeGreaterThan(p)
    expect(successProbability({ ...base(5), momentum: 1 })).toBeGreaterThan(p)
    expect(successProbability({ ...base(5), difficulty: 0.8 })).toBeLessThan(p)
  })
})

describe('resolution — bands', () => {
  it('4.5 places rolls in the expected band either side of each threshold', () => {
    const p = 0.5
    // strong success below 0.35p = 0.175
    expect(bandForRoll(0.1, p)).toBe('strong')
    expect(bandForRoll(0.2, p)).toBe('success')
    expect(bandForRoll(0.49, p)).toBe('success')
    // near miss below p + 0.30(1-p) = 0.65
    expect(bandForRoll(0.6, p)).toBe('nearMiss')
    expect(bandForRoll(0.7, p)).toBe('failure')
  })

  it('4.6 gives near miss roughly thirty percent of the failure mass', () => {
    const p = 0.4
    const rng = createRng(2024)
    let nearMiss = 0
    const n = 20_000
    for (let i = 0; i < n; i++) {
      if (bandForRoll(rng.next(), p) === 'nearMiss') nearMiss++
    }
    expect(nearMiss / n).toBeCloseTo(0.3 * (1 - p), 2)
  })

  it('4.5b never returns success when the roll is at or above p', () => {
    for (const p of [0.03, 0.25, 0.5, 0.8, 0.95]) {
      expect(['nearMiss', 'failure']).toContain(bandForRoll(p, p))
    }
  })
})

describe('resolution — explanation', () => {
  const inputs: CheckInputs = {
    match: 0.85,
    fit: 0.5,
    energy: 8,
    momentum: 0,
    difficulty: 0.55,
    marketModifier: -0.1,
    eventModifier: 0,
  }

  it('4.7 names only contributors that actually deviated, with the correct direction', () => {
    const ex = buildExplanation(inputs, 0.2, successProbability(inputs))
    const byLabel = Object.fromEntries(ex.contributors.map((c) => [c.label, c.direction]))
    // strong match and high effort helped; a negative market hurt; fit was neutral
    expect(byLabel['Your track record']).toBe('helped')
    expect(byLabel['The effort you put in']).toBe('helped')
    expect(byLabel['The hiring market']).toBe('hurt')
    expect(Object.keys(byLabel)).not.toContain('How well this suits you')
  })

  it('4.8 names at most three contributors', () => {
    const ex = buildExplanation(
      { ...inputs, fit: 0.95, momentum: 0.9, eventModifier: 0.08 },
      0.2,
      0.6,
    )
    expect(ex.contributors.length).toBeLessThanOrEqual(3)
  })

  it('4.7b reports luck from the distance between roll and probability', () => {
    const p = 0.5
    expect(buildExplanation(inputs, 0.02, p).luck).toBe('ran your way')
    expect(buildExplanation(inputs, 0.5, p).luck).toBe('as expected')
    expect(buildExplanation(inputs, 0.99, p).luck).toBe('ran against you')
  })
})

describe('resolution — resolveCheck', () => {
  it('returns a band, the probability used, and an explanation', () => {
    const rng = createRng(7)
    const result = resolveCheck(
      {
        match: 0.6,
        fit: 0.5,
        energy: 5,
        momentum: 0.2,
        difficulty: 0.5,
        marketModifier: 0,
        eventModifier: 0,
      },
      rng,
    )
    expect(['strong', 'success', 'nearMiss', 'failure']).toContain(result.band)
    expect(result.probability).toBeGreaterThan(0)
    expect(result.explanation.contributors.length).toBeGreaterThan(0)
    expect(result.roll).toBeGreaterThanOrEqual(0)
  })

  it('is deterministic for a given seed', () => {
    const inputs: CheckInputs = {
      match: 0.6,
      fit: 0.5,
      energy: 5,
      momentum: 0.2,
      difficulty: 0.5,
      marketModifier: 0,
      eventModifier: 0,
    }
    const a = resolveCheck(inputs, createRng(11))
    const b = resolveCheck(inputs, createRng(11))
    expect(a).toEqual(b)
  })
})
