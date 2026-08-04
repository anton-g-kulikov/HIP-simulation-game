import { describe, it, expect, beforeEach } from 'vitest'
import * as telemetry from '@telemetry/log'
import { loadContent } from '@content/loader'
import { createCampaign, openTurn, commitAllocation, isCampaignComplete, effectiveBudget } from '@engine/index'
import type { CampaignState } from '@engine/types'

/**
 * Test intent: test/test-documentation.md, M7.
 *
 * The session export is the only artifact a playtest produces. If it is
 * incomplete or destroyable, the session was wasted.
 */

const content = loadContent()
const PROFILE = 'swe_bigtech_28'

function playInstrumented(seed: number): CampaignState {
  let state = openTurn(createCampaign(content, PROFILE, seed), content)
  let clock = 1_000

  telemetry.startSession(state, clock)
  telemetry.beginTurn(state, effectiveBudget(state.player.energyModifier), clock)

  while (!isCampaignComplete(state)) {
    clock += 5_000
    telemetry.enterScreen('allocate', clock)

    const offer = state.offers.find((o) => o.shape === 'fixed' && !o.pipelineId)
    const allocation = offer ? { [offer.id]: offer.minEnergy } : {}

    clock += 30_000
    state = commitAllocation(state, content, allocation)
    telemetry.endTurn(state, allocation, clock)

    if (!isCampaignComplete(state)) {
      state = openTurn(state, content)
      clock += 1_000
      telemetry.beginTurn(state, effectiveBudget(state.player.energyModifier), clock)
    }
  }
  return state
}

beforeEach(() => {
  telemetry.resetForTest()
})

describe('playtest session export', () => {
  it('records one entry per turn played', () => {
    playInstrumented(4242)
    const session = telemetry.exportSession()
    expect(session).not.toBeNull()
    expect(session!.turns).toHaveLength(12)
    expect(session!.turns.map((t) => t.turn)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('carries every field the playtest protocol asks for', () => {
    playInstrumented(7)
    const turn = telemetry.exportSession()!.turns[0]!

    expect(turn).toHaveProperty('openedAt')
    expect(turn).toHaveProperty('committedAt')
    expect(turn).toHaveProperty('energyAvailable')
    expect(turn).toHaveProperty('energyAllocated')
    expect(turn).toHaveProperty('energyUnused')
    expect(turn).toHaveProperty('allocations')
    expect(turn).toHaveProperty('cardsOffered')
    expect(turn).toHaveProperty('cardsExpiredUnused')
    expect(turn).toHaveProperty('screenDwellMs')
    expect(turn.cardsOffered.length).toBeGreaterThan(0)
  })

  it('records energy spent and held back per turn', () => {
    playInstrumented(9)
    for (const turn of telemetry.exportSession()!.turns) {
      expect(turn.energyAllocated + turn.energyUnused).toBe(turn.energyAvailable)
    }
  })

  it('records the outcomes shown, with the turn each came from', () => {
    playInstrumented(11)
    const shown = telemetry.exportSession()!.outcomesShown
    expect(shown.length).toBeGreaterThan(0)
    for (const outcome of shown) {
      expect(outcome.turn).toBeGreaterThan(0)
      expect(typeof outcome.band).toBe('string')
    }
  })

  it('records screen dwell time', () => {
    playInstrumented(13)
    const dwell = telemetry.exportSession()!.turns[0]!.screenDwellMs
    expect(Object.values(dwell).some((ms) => ms > 0)).toBe(true)
  })

  it('records probe answers, including the one asked after the final turn', () => {
    // Probes are answered on the commit screen, after the turn has been filed.
    playInstrumented(15)
    telemetry.noteProbe(4, 'roughly')

    const session = telemetry.exportSession()!
    const lastTurn = session.turns[session.turns.length - 1]!
    expect(lastTurn.probe).toEqual({ difficulty: 4, awareness: 'roughly' })
    expect(telemetry.sessionAsJson()).toContain('roughly')
  })

  it('exports as valid JSON', () => {
    playInstrumented(17)
    expect(() => JSON.parse(telemetry.sessionAsJson())).not.toThrow()
  })

  it('keeps a finished session when a new one starts, so restarting cannot destroy it', () => {
    // A participant tapping through the retrospective footer must not be able
    // to wipe the only artifact the session produced.
    playInstrumented(19)
    const finished = telemetry.exportSession()!
    const finishedId = finished.sessionId
    expect(finished.turns).toHaveLength(12)

    const fresh = openTurn(createCampaign(content, PROFILE, 20), content)
    telemetry.startSession(fresh, 90_000)

    const exported = JSON.parse(telemetry.sessionAsJson()) as { sessions: { sessionId: string }[] }
    expect(exported.sessions.map((s) => s.sessionId)).toContain(finishedId)
    expect(exported.sessions.length).toBeGreaterThanOrEqual(2)
  })
})
