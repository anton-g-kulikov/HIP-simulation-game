import { describe, it, expect } from 'vitest'
import {
  rollFit,
  weightedFit,
  recordObservation,
  describeFit,
  emptyObservations,
  FIT_AXES,
} from '@engine/fit'
import { createRng } from '@engine/rng'
import type { FitAxis } from '@engine/types'

// Test intent: test/test-documentation.md, M1 §fit.ts (cases 5.1–5.4)
// Design: _meta/specs/HIP_Simulation_Spec.md §1, _meta/specs/HIP_Content_Spec.md §5

const noObservations = emptyObservations

describe('fit — rolling', () => {
  it('5.1 keeps every axis within [0.10, 0.90]', () => {
    for (let seed = 0; seed < 200; seed++) {
      const fit = rollFit(createRng(seed))
      for (const axis of FIT_AXES) {
        expect(fit[axis]).toBeGreaterThanOrEqual(0.1)
        expect(fit[axis]).toBeLessThanOrEqual(0.9)
      }
    }
  })

  it('5.2 draws deep_technical from a higher-mean distribution than the other axes', () => {
    const n = 800
    const totals = {} as Record<FitAxis, number>
    for (const axis of FIT_AXES) totals[axis] = 0
    for (let seed = 0; seed < n; seed++) {
      const fit = rollFit(createRng(seed * 7919))
      for (const axis of FIT_AXES) totals[axis] += fit[axis]
    }
    const mean = (a: FitAxis) => totals[a] / n
    expect(mean('deep_technical')).toBeCloseTo(0.62, 1)
    expect(mean('leadership')).toBeCloseTo(0.5, 1)
    expect(mean('deep_technical')).toBeGreaterThan(mean('leadership'))
  })

  it('is deterministic for a given seed', () => {
    expect(rollFit(createRng(42))).toEqual(rollFit(createRng(42)))
  })
})

describe('fit — weighting', () => {
  it('combines axes by their weights', () => {
    const fit = rollFit(createRng(3))
    const single = weightedFit(fit, { deep_technical: 1 })
    expect(single).toBeCloseTo(fit.deep_technical, 6)

    const blended = weightedFit(fit, { deep_technical: 0.5, leadership: 0.5 })
    expect(blended).toBeCloseTo((fit.deep_technical + fit.leadership) / 2, 6)
  })

  it('4.9 rejects weights that do not sum to one', () => {
    const fit = rollFit(createRng(3))
    expect(() => weightedFit(fit, { deep_technical: 0.5 })).toThrow(/sum/i)
    expect(() => weightedFit(fit, { deep_technical: 0.7, leadership: 0.7 })).toThrow(/sum/i)
  })
})

describe('fit — discovery', () => {
  it('5.3 widens confidence as observations accumulate', () => {
    let obs = noObservations()
    const fit = { ...rollFit(createRng(1)), deep_technical: 0.8 }

    expect(describeFit(fit, obs, 'deep_technical')).toBeNull()

    obs = recordObservation(obs, 'deep_technical', 'notable')
    expect(describeFit(fit, obs, 'deep_technical')).toBeNull()

    obs = recordObservation(obs, 'deep_technical', 'notable')
    expect(describeFit(fit, obs, 'deep_technical')).toMatch(/may/i)

    for (let i = 0; i < 2; i++) obs = recordObservation(obs, 'deep_technical', 'notable')
    expect(describeFit(fit, obs, 'deep_technical')).toMatch(/seems/i)

    for (let i = 0; i < 3; i++) obs = recordObservation(obs, 'deep_technical', 'notable')
    expect(describeFit(fit, obs, 'deep_technical')).toMatch(/clearly/i)
  })

  it('5.3b phrases a poor fit negatively', () => {
    let obs = noObservations()
    const fit = { ...rollFit(createRng(1)), leadership: 0.15 }
    for (let i = 0; i < 7; i++) obs = recordObservation(obs, 'leadership', 'notable')
    const phrase = describeFit(fit, obs, 'leadership')
    expect(phrase).toMatch(/clearly/i)
    expect(phrase).toMatch(/not/i)
  })

  it('5.4 never exposes a numeric fit value', () => {
    let obs = noObservations()
    const fit = rollFit(createRng(5))
    for (let i = 0; i < 9; i++) obs = recordObservation(obs, 'communication', 'notable')
    const phrase = describeFit(fit, obs, 'communication') ?? ''
    expect(phrase).not.toMatch(/\d/)
  })
})
