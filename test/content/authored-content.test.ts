import { describe, it, expect } from 'vitest'
import { loadContent } from '@content/loader'
import { createCampaign, openTurn, commitAllocation, isCampaignComplete, describeOffers } from '@engine/index'
import type { CampaignState } from '@engine/types'

// Test intent: test/test-documentation.md, M2 (cases 7.1, 7.3–7.7) over the real
// content set, so authoring a bad template later fails the suite.

const content = loadContent()
const PROFILE = 'swe_bigtech_28'

describe('authored content — loads and holds its structural rules', () => {
  it('7.1 loads without a validation error', () => {
    expect(content.opportunities.length).toBeGreaterThan(0)
    expect(content.events.length).toBeGreaterThan(0)
    expect(Object.keys(content.profiles).length).toBeGreaterThan(0)
  })

  it('contains the volume the prototype scope calls for', () => {
    // Design doc §26 asks for 20–30 opportunities and 10 events.
    expect(content.opportunities.length).toBeGreaterThanOrEqual(20)
    expect(content.opportunities.length).toBeLessThanOrEqual(30)
    expect(content.events).toHaveLength(10)
  })

  it('covers all five action categories', () => {
    const categories = new Set(content.opportunities.map((o) => o.category))
    expect(categories).toEqual(
      new Set(['current_job', 'job_search', 'learning', 'project', 'network_public']),
    )
  })

  it('7.3 awards at least one effect on every near miss and every failure', () => {
    for (const template of content.opportunities) {
      expect(template.outcomes.nearMiss.effects.length).toBeGreaterThan(0)
      expect(template.outcomes.failure.effects.length).toBeGreaterThan(0)
    }
  })

  it('7.4 has match and fit weights summing to one everywhere', () => {
    for (const template of content.opportunities) {
      const match = Object.values(template.check.match).reduce((s, w) => s + (w ?? 0), 0)
      const fit = Object.values(template.check.fit).reduce((s, w) => s + (w ?? 0), 0)
      expect(match).toBeCloseTo(1, 6)
      expect(fit).toBeCloseTo(1, 6)
    }
  })

  it('7.5 has delay distributions summing to one', () => {
    for (const template of content.opportunities) {
      const total = Object.values(template.delay).reduce((s, p) => s + p, 0)
      expect(total).toBeCloseTo(1, 6)
    }
  })

  it('7.6 has unique ids', () => {
    const ids = content.opportunities.map((o) => o.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every hiring template states the role it leads to', () => {
    for (const template of content.opportunities) {
      if (template.kind === 'hiring') expect(template.roleOutcome).toBeDefined()
    }
  })

  it('7.8 uses only effect ops the interpreter implements', () => {
    const implemented = new Set([
      'capital',
      'finance',
      'pipeline',
      'observeFit',
      'market',
      'energy',
      'unlock',
      'role',
      'visibleWork',
      'seniority',
    ])
    const used = new Set<string>()
    for (const template of content.opportunities) {
      for (const outcome of Object.values(template.outcomes)) {
        for (const effect of outcome.effects) used.add(effect.op)
      }
    }
    for (const event of content.events) {
      for (const effect of event.effects) used.add(effect.op)
    }
    for (const op of used) expect(implemented.has(op)).toBe(true)
  })

  it('learning study templates never grant evidence directly', () => {
    // Design doc §8.3: evidence comes from applying what you learned, not from studying.
    const studyOnly = content.opportunities.filter(
      (o) => o.kind === 'learning' && !o.tags.includes(content.tuning.learning.applyTag),
    )
    expect(studyOnly.length).toBeGreaterThan(0)
    for (const template of studyOnly) {
      for (const outcome of Object.values(template.outcomes)) {
        for (const effect of outcome.effects) {
          if (effect.op === 'capital') expect(effect.target).not.toBe('evidence')
        }
      }
    }
  })
})

describe('authored content — plays', () => {
  function playThrough(seed: number, pick: (state: CampaignState) => Record<string, number>) {
    let state = openTurn(createCampaign(content, PROFILE, seed), content)
    while (!isCampaignComplete(state)) {
      state = commitAllocation(state, content, pick(state))
      if (!isCampaignComplete(state)) state = openTurn(state, content)
    }
    return state
  }

  it('runs a full twelve-turn campaign without throwing, over many seeds', () => {
    for (let seed = 0; seed < 30; seed++) {
      const final = playThrough(seed, (state) => {
        // Spend on the first affordable offer each turn.
        const views = describeOffers(state, content)
        const affordable = views.find((v) => v.cost <= 10)
        return affordable ? { [affordable.offer.id]: affordable.offer.minEnergy } : {}
      })
      expect(final.history).toHaveLength(12)
    }
  })

  it('survives a do-nothing campaign', () => {
    const final = playThrough(99, () => ({}))
    expect(final.history).toHaveLength(12)
    expect(final.history.every((r) => r.energySpent === 0)).toBe(true)
  })

  it('offers a workable set of cards on the first turn', () => {
    const state = openTurn(createCampaign(content, PROFILE, 7), content)
    const views = describeOffers(state, content)
    expect(views.length).toBeGreaterThanOrEqual(4)
    for (const view of views) {
      expect(view.title.length).toBeGreaterThan(0)
      expect(view.description.length).toBeGreaterThan(0)
      expect(view.cost).toBeGreaterThan(0)
    }
  })

  it('9.8 never renders a probability or a numeric fit on a card', () => {
    for (let seed = 0; seed < 10; seed++) {
      let state = openTurn(createCampaign(content, PROFILE, seed), content)
      for (let turn = 0; turn < 5; turn++) {
        for (const view of describeOffers(state, content)) {
          const rendered = [view.title, view.description, ...view.signals].join(' ')
          expect(rendered).not.toMatch(/\d+\s*%/)
          expect(rendered).not.toMatch(/probability|chance of|odds/i)
        }
        state = openTurn(commitAllocation(state, content, {}), content)
      }
    }
  })

  it('fires events over the course of a campaign, but not in turn one', () => {
    let anyEvents = 0
    for (let seed = 0; seed < 20; seed++) {
      const final = playThrough(seed, () => ({}))
      const fired = final.history.filter((r) => r.eventTemplateId)
      anyEvents += fired.length
      expect(final.history[0]!.eventTemplateId).toBeUndefined()
    }
    expect(anyEvents).toBeGreaterThan(0)
  })
})
