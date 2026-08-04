/**
 * Career capital dynamics — spec §3.
 *
 * Gains diminish as a dimension rises, so compounding stays real but late-game
 * grinding of one stat flattens. Losses are linear: a setback at 90 should hurt
 * as much as a setback at 10.
 */

import {
  CAPITAL_MAX,
  CAPITAL_MIN,
  DECAY_PER_TURN,
  DIMINISHING_RETURNS_EXPONENT,
  LIFESTYLE_INFLATION_SHARE,
  MAX_RUNWAY_MONTHS,
} from './tuning'
import type { CapabilityKey, CapitalPath, CapitalState, FinanceState, MatchWeights } from './types'
import { assertWeightsSumToOne, clamp } from './util'

export const CAPABILITY_KEYS: readonly CapabilityKey[] = [
  'technical',
  'execution',
  'communication',
  'leadership',
]

export function applyGain(current: number, gain: number): number {
  if (gain <= 0) return clamp(current + gain, CAPITAL_MIN, CAPITAL_MAX)
  const headroom = (CAPITAL_MAX - current) / CAPITAL_MAX
  const effective = gain * Math.pow(headroom, DIMINISHING_RETURNS_EXPONENT)
  return clamp(current + effective, CAPITAL_MIN, CAPITAL_MAX)
}

export function readCapital(capital: CapitalState, path: CapitalPath): number {
  if (path.startsWith('capability.')) {
    const key = path.slice('capability.'.length) as CapabilityKey
    return capital.capability[key]
  }
  return capital[path as Exclude<CapitalPath, `capability.${string}`>]
}

export function writeCapital(
  capital: CapitalState,
  path: CapitalPath,
  value: number,
): CapitalState {
  const clamped = clamp(value, CAPITAL_MIN, CAPITAL_MAX)
  if (path.startsWith('capability.')) {
    const key = path.slice('capability.'.length) as CapabilityKey
    return { ...capital, capability: { ...capital.capability, [key]: clamped } }
  }
  return { ...capital, [path]: clamped }
}

export function gainCapital(
  capital: CapitalState,
  path: CapitalPath,
  amount: number,
): CapitalState {
  return writeCapital(capital, path, applyGain(readCapital(capital, path), amount))
}

/**
 * Small per-turn erosion of the dimensions that depend on being maintained.
 * Evidence does not decay: it is a record of what happened.
 */
export function applyTurnDecay(capital: CapitalState): CapitalState {
  return {
    ...capital,
    reputation: Math.max(CAPITAL_MIN, capital.reputation - DECAY_PER_TURN.reputation),
    network: Math.max(CAPITAL_MIN, capital.network - DECAY_PER_TURN.network),
    capability: {
      technical: Math.max(CAPITAL_MIN, capital.capability.technical - DECAY_PER_TURN.capability),
      execution: Math.max(CAPITAL_MIN, capital.capability.execution - DECAY_PER_TURN.capability),
      communication: Math.max(
        CAPITAL_MIN,
        capital.capability.communication - DECAY_PER_TURN.capability,
      ),
      leadership: Math.max(CAPITAL_MIN, capital.capability.leadership - DECAY_PER_TURN.capability),
    },
  }
}

/** The `match` term of the outcome function: how well measured capital fits the ask. */
export function weightedMatch(capital: CapitalState, weights: MatchWeights): number {
  assertWeightsSumToOne(weights, 'match')
  let total = 0
  for (const [path, weight] of Object.entries(weights)) {
    if (weight === undefined) continue
    total += weight * (readCapital(capital, path as CapitalPath) / CAPITAL_MAX)
  }
  return clamp(total, 0, 1)
}

export function runwayMonths(finance: FinanceState): number {
  if (finance.monthlyBurn <= 0) return MAX_RUNWAY_MONTHS
  return Math.min(MAX_RUNWAY_MONTHS, finance.savings / finance.monthlyBurn)
}

export function accrueSavings(finance: FinanceState): FinanceState {
  return { ...finance, savings: finance.savings + (finance.monthlyComp - finance.monthlyBurn) }
}

/**
 * A pay rise partly disappears into lifestyle, automatically and without a
 * player choice (design doc §8.7). A pay cut does not reduce burn — that is the
 * asymmetry that makes taking a lower-paid role a real decision.
 */
export function applyRaise(finance: FinanceState, newMonthlyComp: number): FinanceState {
  const delta = newMonthlyComp - finance.monthlyComp
  const burn =
    delta > 0 ? finance.monthlyBurn + delta * LIFESTYLE_INFLATION_SHARE : finance.monthlyBurn
  return { ...finance, monthlyComp: newMonthlyComp, monthlyBurn: burn }
}
