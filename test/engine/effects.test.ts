import { describe, it, expect } from 'vitest'
import { applyEffects } from '@engine/effects'
import { createCampaign, openTurn } from '@engine/index'
import { testContent, TEST_IDS } from '../fixtures/content'
import type { CampaignState, Effect } from '@engine/types'

// Test intent: test/test-documentation.md, M4c (cases 13.4–13.8)

const content = testContent()
const tuning = content.tuning

function start(seed = 1): CampaignState {
  return openTurn(createCampaign(content, TEST_IDS.profile, seed), content)
}

const ctx = { turn: 1, tuning }

describe('effects — reported capital changes', () => {
  it('13.4 reports before and after for a gain, not only a sentence', () => {
    const state = start()
    const before = state.player.capital.evidence

    const result = applyEffects(state, [{ op: 'capital', target: 'evidence', amount: 6 }], ctx)

    expect(result.capitalChanges).toHaveLength(1)
    const change = result.capitalChanges[0]!
    expect(change.path).toBe('evidence')
    expect(change.before).toBeCloseTo(before, 5)
    expect(change.after).toBeGreaterThan(change.before)
    expect(change.after).toBeCloseTo(result.state.player.capital.evidence, 5)
    expect(change.phrase.length).toBeGreaterThan(0)
    expect(change.label.length).toBeGreaterThan(0)
  })

  it('13.5 reports a loss with before above after', () => {
    const state = start()
    const result = applyEffects(state, [{ op: 'capital', target: 'network', amount: -5 }], ctx)

    const change = result.capitalChanges[0]!
    expect(change.before).toBeGreaterThan(change.after)
  })

  it('13.6 collapses repeated effects on one dimension into a single change', () => {
    const state = start()
    const effects: Effect[] = [
      { op: 'capital', target: 'evidence', amount: 3 },
      { op: 'capital', target: 'evidence', amount: 4 },
      { op: 'capital', target: 'network', amount: 2 },
    ]

    const result = applyEffects(state, effects, ctx)

    expect(result.capitalChanges.map((c) => c.path).sort()).toEqual(['evidence', 'network'])
    const evidence = result.capitalChanges.find((c) => c.path === 'evidence')!
    // The single row must span the whole move, start to finish.
    expect(evidence.before).toBeCloseTo(state.player.capital.evidence, 5)
    expect(evidence.after).toBeCloseTo(result.state.player.capital.evidence, 5)
  })

  it('13.7 produces no change row for an effect that moves nothing', () => {
    const state = start()
    const result = applyEffects(state, [{ op: 'capital', target: 'evidence', amount: 0 }], ctx)
    expect(result.capitalChanges).toHaveLength(0)
  })

  it('13.7b produces no change row when a dimension is already at its floor', () => {
    const state = start()
    const floored: CampaignState = {
      ...state,
      player: { ...state.player, capital: { ...state.player.capital, influence: 0 } },
    }
    const result = applyEffects(floored, [{ op: 'capital', target: 'influence', amount: -5 }], ctx)
    expect(result.capitalChanges).toHaveLength(0)
  })

  it('13.8 keeps money, role and energy as text rather than bars', () => {
    const state = start()
    const result = applyEffects(
      state,
      [
        { op: 'finance', target: 'savings', mode: 'add', amount: -9000 },
        { op: 'energy', amount: -2, turns: 2 },
      ],
      ctx,
    )

    expect(result.capitalChanges).toHaveLength(0)
    expect(result.changes.length).toBeGreaterThan(0)
  })

  it('reports both a bar and a sentence for the same capital move', () => {
    const state = start()
    const result = applyEffects(state, [{ op: 'capital', target: 'reputation', amount: 5 }], ctx)

    expect(result.capitalChanges).toHaveLength(1)
    expect(result.changes).toContain(result.capitalChanges[0]!.phrase)
  })

  it('honours the ramp penalty in the reported change', () => {
    const state = start()
    const ramped: CampaignState = {
      ...state,
      player: { ...state.player, rampTurnsLeft: 2 },
    }

    const normal = applyEffects(state, [{ op: 'capital', target: 'evidence', amount: 10 }], ctx)
    const slowed = applyEffects(ramped, [{ op: 'capital', target: 'evidence', amount: 10 }], ctx)

    const normalGain = normal.capitalChanges[0]!.after - normal.capitalChanges[0]!.before
    const slowedGain = slowed.capitalChanges[0]!.after - slowed.capitalChanges[0]!.before
    expect(slowedGain).toBeLessThan(normalGain)
  })
})
