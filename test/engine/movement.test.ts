import { describe, it, expect } from 'vitest'
import { createCampaign, openTurn, commitAllocation, capitalMovement } from '@engine/index'
import { loadContent } from '@content/loader'
import type { CampaignState } from '@engine/types'

// Test intent: test/test-documentation.md, M4d (14.6–14.8)

const content = loadContent()
const PROFILE = 'swe_bigtech_28'

function start(seed = 1): CampaignState {
  return openTurn(createCampaign(content, PROFILE, seed), content)
}

describe('capital movement since last month', () => {
  it('14.7 reports nothing moved on the first month', () => {
    expect(capitalMovement(start(3))).toEqual([])
  })

  it('14.6 reports what changed between one month and the next', () => {
    let state = start(11)
    const offer = state.offers.find((o) => o.shape === 'fixed' && !o.pipelineId)!
    state = commitAllocation(state, content, { [offer.id]: offer.minEnergy })
    state = openTurn(state, content)

    const movement = capitalMovement(state)
    // Decay alone guarantees at least reputation and network moved.
    expect(movement.length).toBeGreaterThan(0)

    for (const move of movement) {
      expect(move.after).not.toBe(move.before)
      expect(move.label.length).toBeGreaterThan(0)
      expect(move.phrase.length).toBeGreaterThan(0)
    }
  })

  it('14.6b measures one month, not the whole campaign', () => {
    let state = start(12)
    for (let i = 0; i < 4; i++) {
      state = openTurn(commitAllocation(state, content, {}), content)
    }

    const movement = capitalMovement(state)
    // Four months of decay would be ~2.4 reputation; one month is ~0.6.
    const reputation = movement.find((m) => m.path === 'reputation')
    if (reputation) {
      expect(Math.abs(reputation.before - reputation.after)).toBeLessThan(1.5)
    }
  })

  it('14.6c reports a gain as a gain', () => {
    let state = start(21)
    let sawGain = false

    for (let turn = 0; turn < 8 && state.turn <= 12; turn++) {
      const offer = state.offers.find((o) => !o.pipelineId)
      state = commitAllocation(state, content, offer ? { [offer.id]: offer.minEnergy } : {})
      if (state.turn > 12) break
      state = openTurn(state, content)
      if (capitalMovement(state).some((m) => m.after > m.before)) sawGain = true
    }

    expect(sawGain).toBe(true)
  })

  it('14.8 survives a save round trip', () => {
    let state = start(31)
    state = openTurn(commitAllocation(state, content, {}), content)

    const revived = JSON.parse(JSON.stringify(state)) as CampaignState
    expect(capitalMovement(revived)).toEqual(capitalMovement(state))
  })

  it('does not shift when a turn is opened twice', () => {
    let state = start(41)
    state = openTurn(commitAllocation(state, content, {}), content)

    const once = capitalMovement(state)
    const twice = capitalMovement(openTurn(state, content))
    expect(twice).toEqual(once)
  })
})
