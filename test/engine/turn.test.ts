import { describe, it, expect } from 'vitest'
import {
  createCampaign,
  openTurn,
  commitAllocation,
  isCampaignComplete,
  describeOffer,
} from '@engine/index'
import { effectiveBudget } from '@engine/energy'
import { testContent, TEST_IDS } from '../fixtures/content'
import type { Allocation, CampaignState } from '@engine/types'

// Test intent: test/test-documentation.md, M1 §turn.ts (cases 6.1–6.6)

const content = testContent()

function start(seed = 1): CampaignState {
  return openTurn(createCampaign(content, TEST_IDS.profile, seed), content)
}

/** Spend `energy` on the first offer of the given category, if one is on the table. */
function allocateToCategory(state: CampaignState, category: string, energy: number): Allocation {
  const offer = state.offers.find((o) => o.category === category)
  return offer ? { [offer.id]: energy } : {}
}

function playCampaign(seed: number, choose: (state: CampaignState) => Allocation): CampaignState {
  let state = start(seed)
  while (!isCampaignComplete(state)) {
    state = commitAllocation(state, content, choose(state))
    if (!isCampaignComplete(state)) state = openTurn(state, content)
  }
  return state
}

describe('turn — lifecycle', () => {
  it('6.4 starts at turn 1 and completes after twelve turns', () => {
    let state = start()
    expect(state.turn).toBe(1)
    expect(isCampaignComplete(state)).toBe(false)

    const final = playCampaign(1, () => ({}))
    expect(final.turn).toBe(13)
    expect(isCampaignComplete(final)).toBe(true)
  })

  it('6.5 accepts an empty allocation and records the unused energy', () => {
    const state = start()
    const next = commitAllocation(state, content, {})
    const record = next.history[next.history.length - 1]!
    expect(record.energySpent).toBe(0)
    expect(record.energyUnused).toBe(effectiveBudget(0))
  })

  it('6.6 records one history entry per committed turn', () => {
    const final = playCampaign(3, () => ({}))
    expect(final.history).toHaveLength(12)
    expect(final.history.map((r) => r.turn)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('offers four to seven cards each turn', () => {
    let state = start(9)
    for (let turn = 1; turn <= 6; turn++) {
      expect(state.offers.length).toBeGreaterThanOrEqual(4)
      expect(state.offers.length).toBeLessThanOrEqual(7)
      state = openTurn(commitAllocation(state, content, {}), content)
    }
  })

  it('openTurn is idempotent within a turn', () => {
    const once = start(5)
    const twice = openTurn(once, content)
    expect(twice).toEqual(once)
  })

  it('rejects an allocation that exceeds the budget rather than clamping it', () => {
    const state = start()
    const offer = state.offers[0]!
    expect(() => commitAllocation(state, content, { [offer.id]: 99 })).toThrow(/energy|budget/i)
  })

  it('rejects an allocation referring to an offer that is not on the table', () => {
    const state = start()
    expect(() => commitAllocation(state, content, { not_a_real_offer: 1 })).toThrow(/offer/i)
  })

  it('rejects energy below a fixed-cost action’s price', () => {
    const state = start()
    const fixed = state.offers.find((o) => o.shape === 'fixed')
    if (!fixed) return
    expect(() => commitAllocation(state, content, { [fixed.id]: 1 })).toThrow()
  })
})

describe('turn — the first month', () => {
  it('starts the player exactly where the profile says, with no time already elapsed', () => {
    const profile = content.profiles[TEST_IDS.profile]!
    const state = start(31)

    // Opening turn 1 must not age the player a month before they have decided
    // anything: decay and earnings represent a month passing, and at the moment
    // of the first decision none has.
    expect(state.player.capital.reputation).toBe(profile.capital.reputation)
    expect(state.player.capital.network).toBe(profile.capital.network)
    expect(state.player.capital.capability.technical).toBe(profile.capital.capability.technical)
    expect(state.player.finance.savings).toBe(profile.finance.savings)
  })

  it('applies a month of erosion and earnings from the second month onward', () => {
    const profile = content.profiles[TEST_IDS.profile]!
    let state = start(32)
    state = openTurn(commitAllocation(state, content, {}), content)

    expect(state.turn).toBe(2)
    expect(state.player.capital.reputation).toBeLessThan(profile.capital.reputation)
    expect(state.player.finance.savings).toBeGreaterThan(profile.finance.savings)
  })
})

describe('turn — determinism and serialisation', () => {
  it('6.1 reproduces a campaign exactly from the same seed and choices', () => {
    const choose = (state: CampaignState) => allocateToCategory(state, 'current_job', 3)
    const a = playCampaign(4242, choose)
    const b = playCampaign(4242, choose)
    expect(a).toEqual(b)
  })

  it('6.1b diverges for different seeds', () => {
    const choose = (state: CampaignState) => allocateToCategory(state, 'current_job', 3)
    const a = playCampaign(1, choose)
    const b = playCampaign(2, choose)
    expect(a.player.capital).not.toEqual(b.player.capital)
  })

  it('6.2 continues identically after a JSON round trip', () => {
    let live = start(77)
    live = commitAllocation(live, content, allocateToCategory(live, 'current_job', 3))
    live = openTurn(live, content)

    const revived = JSON.parse(JSON.stringify(live)) as CampaignState
    expect(revived).toEqual(live)

    const liveNext = commitAllocation(live, content, allocateToCategory(live, 'learning', 2))
    const revivedNext = commitAllocation(
      revived,
      content,
      allocateToCategory(revived, 'learning', 2),
    )
    expect(revivedNext).toEqual(liveNext)
  })
})

describe('turn — pending effects', () => {
  it('6.3 resolves a pending effect on its scheduled turn and not before', () => {
    let state = start(11)
    const offer = state.offers.find((o) => o.category === 'current_job')!
    state = commitAllocation(state, content, { [offer.id]: 3 })

    expect(state.pending.length).toBeGreaterThan(0)
    const scheduled = state.pending[0]!.resolveOnTurn

    // Fixture delay is always one turn.
    expect(scheduled).toBe(2)

    state = openTurn(state, content)
    expect(state.turn).toBe(2)
    expect(state.currentOutcomes.length).toBeGreaterThan(0)
    expect(state.pending.some((p) => p.resolveOnTurn === 2)).toBe(false)
  })

  it('reports how many turns ago the source decision was made', () => {
    let state = start(13)
    const offer = state.offers.find((o) => o.category === 'current_job')!
    state = commitAllocation(state, content, { [offer.id]: 3 })
    state = openTurn(state, content)

    const outcome = state.currentOutcomes[0]!
    expect(outcome.sourceTurn).toBe(1)
    expect(outcome.turnsAgo).toBe(1)
  })

  it('every resolved outcome carries an explanation', () => {
    let state = start(21)
    for (let i = 0; i < 6; i++) {
      state = commitAllocation(state, content, allocateToCategory(state, 'current_job', 3))
      state = openTurn(state, content)
      for (const outcome of state.currentOutcomes) {
        expect(outcome.explanation).toBeDefined()
        expect(outcome.headline.length).toBeGreaterThan(0)
        // A card must report something it changed — as a drawn capital move, as
        // a text note, or as the explicit "nothing measurable changed".
        expect(outcome.capitalChanges.length + outcome.changes.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('turn — energy and repetition', () => {
  it('inflates the cost of a category used on consecutive turns', () => {
    let state = start(31)
    const first = state.offers.find((o) => o.category === 'current_job')!
    const firstView = describeOffer(state, first, content)
    expect(firstView.cost).toBe(firstView.offer.baseCost)

    state = commitAllocation(state, content, { [first.id]: 2 })
    state = openTurn(state, content)

    const repeat = state.offers.find((o) => o.category === 'current_job')
    if (repeat) {
      const repeatView = describeOffer(state, repeat, content)
      expect(repeatView.cost).toBeGreaterThan(repeatView.offer.baseCost)
      expect(repeatView.inflatedFrom).toBe(repeatView.offer.baseCost)
    }
  })

  it('never reports a probability or a numeric fit on an offer view', () => {
    const state = start(41)
    for (const offer of state.offers) {
      const view = describeOffer(state, offer, content)
      const rendered = [view.title, view.description, ...view.signals].join(' ')
      expect(rendered).not.toMatch(/\d+\s*%/)
      expect(rendered).not.toMatch(/probability/i)
    }
  })
})
