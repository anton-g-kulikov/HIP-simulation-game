/**
 * Events — design doc §11, spec §7.
 *
 * At most one per turn, never in turn 1, with a minimum gap. Trigger predicates
 * are what stop events feeling arbitrary: a manager only departs if there was a
 * good manager to lose.
 */

import type { Content } from '@content/loader'
import type { EventTemplate } from '@content/schema'
import { applyEffects } from './effects'
import { allPredicatesPass } from './paths'
import type { Rng } from './rng'
import type { CampaignState } from './types'

function consecutiveHighEffortTurns(state: CampaignState, threshold: number): number {
  let count = 0
  for (const record of [...state.history].reverse()) {
    if (record.energySpent >= threshold) count++
    else break
  }
  return count
}

function turnsSinceLastEvent(state: CampaignState): number {
  const last = [...state.history].reverse().find((record) => record.eventTemplateId)
  if (!last) return Number.POSITIVE_INFINITY
  return state.turn - last.turn
}

export function eligibleEvents(state: CampaignState, content: Content): EventTemplate[] {
  if (state.turn < content.tuning.events.firstEligibleTurn) return []
  if (turnsSinceLastEvent(state) < content.tuning.events.minGapTurns) return []

  return content.events.filter((event) => {
    if (state.turn < event.trigger.minTurn || state.turn > event.trigger.maxTurn) return false
    if (event.trigger.oncePerCampaign && state.firedEventTemplateIds.includes(event.id)) return false

    if (event.trigger.afterHighEffortTurns !== undefined) {
      const streak = consecutiveHighEffortTurns(state, content.tuning.events.highEffortThreshold)
      if (streak < event.trigger.afterHighEffortTurns) return false
    }

    return allPredicatesPass(state, event.trigger.requires)
  })
}

export type EventRollResult = {
  state: CampaignState
  event?: EventTemplate
  changes: string[]
}

export function rollEvent(state: CampaignState, content: Content, rng: Rng): EventRollResult {
  const candidates = eligibleEvents(state, content)
  if (candidates.length === 0) return { state, changes: [] }

  const event = rng.pick(candidates, (e) => e.trigger.weight)

  const applied = applyEffects(state, event.effects, {
    turn: state.turn,
    tuning: content.tuning,
  })

  return {
    state: {
      ...applied.state,
      firedEventTemplateIds: [...state.firedEventTemplateIds, event.id],
      activeEvents: [
        ...state.activeEvents,
        {
          templateId: event.id,
          startedTurn: state.turn,
          endsAfterTurn: state.turn + event.duration,
        },
      ],
    },
    event,
    changes: applied.changes,
  }
}

export function expireEvents(state: CampaignState): CampaignState {
  const activeEvents = state.activeEvents.filter((event) => event.endsAfterTurn >= state.turn)
  return activeEvents.length === state.activeEvents.length ? state : { ...state, activeEvents }
}
