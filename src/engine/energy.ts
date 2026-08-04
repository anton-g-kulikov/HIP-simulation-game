/**
 * Energy budget, repetition cost, and cooldown — spec §2.
 *
 * The repetition system is the main defence against a single-action strategy
 * (design doc §6.3). It charges by *turns in which a category was used*, not by
 * energy spent, so one deep investment stays cheaper than three shallow ones.
 */

import {
  BASE_ENERGY,
  COOLDOWN_RATES,
  ENERGY_MODIFIER_MAX,
  ENERGY_MODIFIER_MIN,
  HEAT_CAP,
  REPETITION_MULTIPLIERS,
  REST_COOLDOWN_BONUS,
  REST_THRESHOLD,
} from './tuning'
import type { ActionCategory, HeatMap } from './types'
import { clamp } from './util'

export { HEAT_CAP }

export const ACTION_CATEGORIES: readonly ActionCategory[] = [
  'current_job',
  'job_search',
  'learning',
  'project',
  'network_public',
]

export function emptyHeat(): HeatMap {
  return {
    current_job: 0,
    job_search: 0,
    learning: 0,
    project: 0,
    network_public: 0,
  }
}

/** Heat tier → cost multiplier. Fractional heat floors to its tier. */
export function repetitionMultiplier(heat: number): number {
  const tier = clamp(Math.floor(heat), 0, REPETITION_MULTIPLIERS.length - 1)
  return REPETITION_MULTIPLIERS[tier] as number
}

/** Cost always rounds up: a half point of energy is not a thing the player can spend. */
export function inflatedCost(baseCost: number, heat: number): number {
  return Math.ceil(baseCost * repetitionMultiplier(heat))
}

/**
 * One point of heat per category used this turn, however many actions drew on
 * it. Deduplicating is the whole mechanic, not an optimisation.
 */
export function raiseHeat(heat: HeatMap, categoriesUsed: readonly ActionCategory[]): HeatMap {
  const next = { ...heat }
  for (const category of new Set(categoriesUsed)) {
    next[category] = Math.min(HEAT_CAP, next[category] + 1)
  }
  return next
}

/**
 * Per-category cooldown. Leaving energy unspent accelerates recovery, which is
 * what makes deliberate rest a legible strategy without making it optimal
 * (see HIP_Decisions_And_Open_Questions.md, Q2).
 *
 * A category used last turn does not cool at all. Decaying it would exactly
 * cancel the point of heat it just gained, and repetition cost would never
 * bite — `current_job` gains 1.0 and cools 1.0. Heat falls only once the
 * player leaves the action alone, which is what "until it cools down" means.
 */
export function coolDown(
  heat: HeatMap,
  unusedEnergyLastTurn: number,
  usedLastTurn: readonly ActionCategory[] = [],
): HeatMap {
  const bonus = unusedEnergyLastTurn >= REST_THRESHOLD ? REST_COOLDOWN_BONUS : 1
  const held = new Set(usedLastTurn)
  const next = { ...heat }
  for (const category of ACTION_CATEGORIES) {
    if (held.has(category)) continue
    next[category] = Math.max(0, next[category] - COOLDOWN_RATES[category] * bonus)
  }
  return next
}

export function effectiveBudget(energyModifier: number): number {
  return BASE_ENERGY + clamp(energyModifier, ENERGY_MODIFIER_MIN, ENERGY_MODIFIER_MAX)
}

/**
 * How costly a given point of the month's budget is to spend.
 *
 * `steady`   — the rest bonus survives; the month stays sustainable.
 * `stretch`  — spending this point forfeits the cooldown bonus that comes from
 *              leaving energy unused.
 * `hard`     — this month counts as high effort, and a run of them invites
 *              burnout.
 *
 * Derived from the thresholds rather than chosen for looks. A colour that
 * discriminates on the wrong boundary teaches a rule the game does not have —
 * so if the tuning moves, the zones move with it.
 *
 * `pointOfBudget` is 1-based: point 1 is the first energy committed.
 */
export type EnergyZone = 'steady' | 'stretch' | 'hard'

export function energyZone(
  pointOfBudget: number,
  budget: number,
  highEffortThreshold: number,
): EnergyZone {
  if (pointOfBudget >= highEffortThreshold) return 'hard'
  // Below this many unused, the 1.5x cooldown bonus is gone.
  if (budget - pointOfBudget < REST_THRESHOLD) return 'stretch'
  return 'steady'
}

/**
 * Consecutive months at or above the high-effort threshold, counting back from
 * the most recent. This is what burnout accumulates against.
 */
export function highEffortStreak(
  history: readonly { energySpent: number }[],
  highEffortThreshold: number,
): number {
  let streak = 0
  for (let i = history.length - 1; i >= 0; i--) {
    if ((history[i]?.energySpent ?? 0) < highEffortThreshold) break
    streak++
  }
  return streak
}
