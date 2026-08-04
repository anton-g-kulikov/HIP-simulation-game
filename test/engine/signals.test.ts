import { describe, it, expect } from 'vitest'
import { loadContent } from '@content/loader'
import { createCampaign, openTurn, commitAllocation, describeOffers, isCampaignComplete } from '@engine/index'
import { generateSignals } from '@engine/signals'
import { diversified } from '@devtools/policies'
import { createRng } from '@engine/rng'
import type { CampaignState } from '@engine/types'

/**
 * Test intent: test/test-documentation.md, M4 §signals.
 *
 * A qualitative signal is only useful if it discriminates. These tests exist
 * because the first calibration put the top capability band at a value the game
 * could not reach — every card showed one of two phrases, and the most
 * prominent signal on every card carried almost no information. That is the
 * failure mode most likely to make outcomes read as arbitrary, which is the
 * riskiest assumption in the whole prototype.
 */

const content = loadContent()
const PROFILE = 'swe_bigtech_28'

function collectSignals(seeds: number): { all: string[]; cards: number } {
  const all: string[] = []
  let cards = 0

  for (let seed = 0; seed < seeds; seed++) {
    const rng = createRng(seed ^ 0x9e3779b9)
    let state: CampaignState = openTurn(createCampaign(content, PROFILE, seed), content)
    while (!isCampaignComplete(state)) {
      for (const view of describeOffers(state, content)) {
        cards++
        all.push(...view.signals)
      }
      state = commitAllocation(state, content, diversified.choose(state, content, rng))
      if (!isCampaignComplete(state)) state = openTurn(state, content)
    }
  }
  return { all, cards }
}

const CAPABILITY_BANDS = [
  'Well matched to your experience',
  'Partly matched to your experience',
  'A stretch from where you are',
]

describe('signals — discrimination', () => {
  const { all, cards } = collectSignals(25)
  const share = (signal: string) => all.filter((s) => s === signal).length / cards

  it('reaches all three capability bands in real play', () => {
    for (const band of CAPABILITY_BANDS) {
      expect(share(band), `"${band}" never appeared`).toBeGreaterThan(0)
    }
  })

  it('does not let any single capability band swamp the others', () => {
    // A band on nearly every card is wallpaper; one that never fires is dead.
    for (const band of CAPABILITY_BANDS) {
      expect(share(band), `"${band}" is too rare to be learnable`).toBeGreaterThan(0.03)
      expect(share(band), `"${band}" is on too many cards to inform`).toBeLessThan(0.75)
    }
  })

  it('keeps the top band genuinely uncommon', () => {
    expect(share(CAPABILITY_BANDS[0]!)).toBeLessThan(0.35)
  })

  it('never shows more than three signals on a card', () => {
    let state = openTurn(createCampaign(content, PROFILE, 3), content)
    for (let turn = 0; turn < 6; turn++) {
      for (const view of describeOffers(state, content)) {
        expect(view.signals.length).toBeLessThanOrEqual(3)
      }
      state = openTurn(commitAllocation(state, content, {}), content)
    }
  })

  it('has no dead signals in the vocabulary that play can never produce', () => {
    // Every phrase the generator can emit should be reachable; an unreachable
    // one is either a calibration bug or vocabulary that should be deleted.
    const reachable = new Set(all)
    const expected = [
      ...CAPABILITY_BANDS,
      'Limited evidence for this',
      'Slow to pay off',
      'Pays more than you earn now',
      'Pays less than you earn now',
    ]
    for (const signal of expected) {
      expect(reachable.has(signal), `"${signal}" is never produced in play`).toBe(true)
    }
  })
})

describe('signals — meaning', () => {
  it('reports a better match as capital grows', () => {
    const state = openTurn(createCampaign(content, PROFILE, 11), content)
    const template = content.opportunityById['role_staff_eng_bigtech']!

    const weak = generateSignals(state, template)
    const strong = generateSignals(
      {
        ...state,
        player: {
          ...state.player,
          capital: {
            ...state.player.capital,
            evidence: 95,
            network: 95,
            capability: { technical: 95, execution: 95, communication: 95, leadership: 95 },
          },
        },
      },
      template,
    )

    expect(weak).not.toEqual(strong)
    expect(strong).toContain('Well matched to your experience')
  })

  it('drops the thin-evidence warning once evidence is no longer thin', () => {
    const state = openTurn(createCampaign(content, PROFILE, 12), content)
    const template = content.opportunityById['role_staff_eng_bigtech']!

    const thin = generateSignals(state, template)
    const built = generateSignals(
      {
        ...state,
        player: { ...state.player, capital: { ...state.player.capital, evidence: 90 } },
      },
      template,
    )

    expect(thin).toContain('Limited evidence for this')
    expect(built).not.toContain('Limited evidence for this')
  })
})
