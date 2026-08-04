/**
 * Predicate evaluation over campaign state.
 *
 * Content templates gate themselves with `{path, op, value}` triples. Keeping
 * the readable path set explicit — rather than accepting arbitrary property
 * traversal — means a typo in a content file is a load-time error instead of a
 * predicate that silently evaluates to undefined and never fires.
 */

import type { Predicate } from '@content/schema'
import { runwayMonths } from './capital'
import { visibleWork, unappliedStudyTurns, projectStage } from './pipelines'
import type { CampaignState } from './types'

export function readPath(state: CampaignState, path: string): number | string | boolean | undefined {
  const player = state.player
  switch (path) {
    case 'turn':
      return state.turn
    case 'market.hiring':
      return state.market.hiring
    case 'player.seniority':
      return player.seniority
    case 'player.capital.evidence':
      return player.capital.evidence
    case 'player.capital.reputation':
      return player.capital.reputation
    case 'player.capital.network':
      return player.capital.network
    case 'player.capital.influence':
      return player.capital.influence
    case 'player.capital.causeKnowledge':
      return player.capital.causeKnowledge
    case 'player.capital.capability.technical':
      return player.capital.capability.technical
    case 'player.capital.capability.execution':
      return player.capital.capability.execution
    case 'player.capital.capability.communication':
      return player.capital.capability.communication
    case 'player.capital.capability.leadership':
      return player.capital.capability.leadership
    case 'player.finance.monthlyComp':
      return player.finance.monthlyComp
    case 'player.finance.savings':
      return player.finance.savings
    case 'player.finance.runwayMonths':
      return runwayMonths(player.finance)
    case 'player.role.orgQuality':
      return player.role.orgQuality
    case 'player.role.managerQuality':
      return player.role.managerQuality
    case 'pipeline.employer.visibleWork':
      return visibleWork(state)
    case 'pipeline.learning.unappliedStudyTurns':
      return unappliedStudyTurns(state)
    case 'pipeline.project.stage':
      return projectStage(state) ?? 'none'
    default:
      return undefined
  }
}

export function evaluatePredicate(state: CampaignState, predicate: Predicate): boolean {
  const actual = readPath(state, predicate.path)
  if (actual === undefined) {
    throw new Error(
      `Unknown predicate path "${predicate.path}". Add it to src/engine/paths.ts or fix the content.`,
    )
  }

  const expected = predicate.value
  switch (predicate.op) {
    case '==':
      return actual === expected
    case '!=':
      return actual !== expected
    default:
      break
  }

  if (typeof actual !== 'number' || typeof expected !== 'number') {
    throw new Error(
      `Predicate "${predicate.path} ${predicate.op} ${String(expected)}" needs numbers on both sides.`,
    )
  }

  switch (predicate.op) {
    case '>=':
      return actual >= expected
    case '>':
      return actual > expected
    case '<=':
      return actual <= expected
    case '<':
      return actual < expected
  }
}

export function allPredicatesPass(state: CampaignState, predicates: readonly Predicate[]): boolean {
  return predicates.every((predicate) => evaluatePredicate(state, predicate))
}
