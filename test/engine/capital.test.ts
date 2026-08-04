import { describe, it, expect } from 'vitest'
import { applyGain, applyTurnDecay, runwayMonths, applyRaise } from '@engine/capital'
import type { CapitalState, FinanceState } from '@engine/types'

// Test intent: test/test-documentation.md, M1 §capital.ts (cases 3.1–3.5)
// Formulas: _meta/specs/HIP_Simulation_Spec.md §3

const capital = (over: Partial<CapitalState> = {}): CapitalState => ({
  capability: { technical: 62, execution: 55, communication: 38, leadership: 30 },
  evidence: 45,
  reputation: 18,
  network: 32,
  influence: 5,
  causeKnowledge: 5,
  ...over,
})

describe('capital — diminishing returns', () => {
  it('3.1 matches the specified curve at low and high current values', () => {
    // spec §3.1: gain 5 at 20 → +4.28 ; at 80 → +1.62
    expect(applyGain(20, 5) - 20).toBeCloseTo(4.28, 2)
    expect(applyGain(80, 5) - 80).toBeCloseTo(1.62, 2)
  })

  it('3.1b gains less the higher the current value', () => {
    const low = applyGain(10, 5) - 10
    const mid = applyGain(50, 5) - 50
    const high = applyGain(90, 5) - 90
    expect(low).toBeGreaterThan(mid)
    expect(mid).toBeGreaterThan(high)
  })

  it('3.2 clamps to the 0–100 range', () => {
    expect(applyGain(99, 500)).toBeLessThanOrEqual(100)
    expect(applyGain(0, -500)).toBeGreaterThanOrEqual(0)
    expect(applyGain(50, -1000)).toBe(0)
  })

  it('3.2b applies negative amounts linearly, without the diminishing-returns curve', () => {
    // losses should not be softened by a high current value
    expect(applyGain(90, -5)).toBeCloseTo(85, 5)
    expect(applyGain(10, -5)).toBeCloseTo(5, 5)
  })
})

describe('capital — decay', () => {
  it('3.3 decays each dimension at its specified rate', () => {
    const before = capital()
    const after = applyTurnDecay(before)
    expect(before.reputation - after.reputation).toBeCloseTo(0.6, 5)
    expect(before.network - after.network).toBeCloseTo(0.4, 5)
    expect(before.capability.technical - after.capability.technical).toBeCloseTo(0.1, 5)
    expect(after.evidence).toBe(before.evidence) // evidence does not rot
  })

  it('3.3b never decays below zero', () => {
    let c = capital({ reputation: 0.2, network: 0.1 })
    c = applyTurnDecay(c)
    expect(c.reputation).toBe(0)
    expect(c.network).toBe(0)
  })
})

describe('capital — finance', () => {
  const finance = (over: Partial<FinanceState> = {}): FinanceState => ({
    monthlyComp: 14_000,
    monthlyBurn: 7_500,
    savings: 60_000,
    ...over,
  })

  it('3.4 derives runway from savings and burn', () => {
    expect(runwayMonths(finance())).toBeCloseTo(8, 5)
  })

  it('3.4b does not return Infinity when burn is zero', () => {
    const r = runwayMonths(finance({ monthlyBurn: 0 }))
    expect(Number.isFinite(r)).toBe(true)
  })

  it('3.5 inflates lifestyle by a quarter of any raise', () => {
    const after = applyRaise(finance(), 16_000)
    expect(after.monthlyComp).toBe(16_000)
    // raise of 2000 → burn +500
    expect(after.monthlyBurn).toBeCloseTo(8_000, 5)
  })

  it('3.5b does not reduce burn when compensation falls', () => {
    const after = applyRaise(finance(), 10_000)
    expect(after.monthlyComp).toBe(10_000)
    expect(after.monthlyBurn).toBe(7_500)
  })
})
