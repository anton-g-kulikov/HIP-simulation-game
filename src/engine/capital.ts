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
import type {
  CampaignState,
  CapabilityKey,
  CapitalMovement,
  CapitalPath,
  CapitalState,
  FinanceState,
  MatchWeights,
} from './types'
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

/** Short nouns for a bar row. The sentences carry the tone. */
export const CAPITAL_LABELS: Record<CapitalPath, string> = {
  'capability.technical': 'Technical depth',
  'capability.execution': 'Execution',
  'capability.communication': 'Communication',
  'capability.leadership': 'Leading',
  evidence: 'Record of results',
  reputation: 'Reputation',
  network: 'Network',
  influence: 'Influence',
  causeKnowledge: 'Understanding',
}

export const CAPITAL_PATHS: readonly CapitalPath[] = [
  'capability.technical',
  'capability.execution',
  'capability.communication',
  'capability.leadership',
  'evidence',
  'reputation',
  'network',
]

/**
 * Below this a move is not worth drawing.
 *
 * Capability drifts 0.1 a month from disuse. Drawing that put a floor-width
 * tick on all seven bars every idle month, which read as everything falling
 * apart and made a genuine one-point gain indistinguishable from noise. The
 * dimensions that erode meaningfully — reputation at 0.6 a month, network at
 * 0.4 — still show.
 */
const NOTICEABLE = 0.25

/** Below this a move is not worth a sentence, only a bar. */
const WORTH_SAYING = 1

/**
 * What the player's last month did to them.
 *
 * Compares this month's opening capital with the previous month's, so it covers
 * everything that landed in between — resolutions, events, recognition and the
 * ordinary erosion of not maintaining something.
 */
export function capitalMovement(state: CampaignState): CapitalMovement[] {
  const moves: CapitalMovement[] = []

  for (const path of CAPITAL_PATHS) {
    const before = readCapital(state.capitalAtPreviousOpen, path)
    const after = readCapital(state.capitalAtOpen, path)
    if (Math.abs(after - before) < NOTICEABLE) continue

    moves.push({
      path,
      label: CAPITAL_LABELS[path],
      phrase: MOVEMENT_PHRASES[path][after > before ? 'up' : 'down'],
      before,
      after,
    })
  }

  return moves
}

/**
 * The handful of moves worth putting in a sentence.
 *
 * A month of ordinary erosion should not produce a paragraph of bad news: the
 * bars already carry it. Only moves big enough to be worth remarking on get
 * words, largest first, and never more than three.
 */
export function notableMovement(state: CampaignState): CapitalMovement[] {
  return capitalMovement(state)
    .filter((m) => Math.abs(m.after - m.before) >= WORTH_SAYING)
    .sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before))
    .slice(0, 3)
}

const MOVEMENT_PHRASES: Record<CapitalPath, { up: string; down: string }> = {
  'capability.technical': { up: 'Deeper technically', down: 'A little rustier technically' },
  'capability.execution': { up: 'Getting more done', down: 'Getting less done' },
  'capability.communication': { up: 'Explaining yourself better', down: 'Out of practice explaining' },
  'capability.leadership': { up: 'More comfortable leading', down: 'Less chance to lead' },
  evidence: { up: 'More to point at', down: 'Less to point at' },
  reputation: { up: 'Better known', down: 'Slipping out of view' },
  network: { up: 'Better connected', down: 'Connections going cold' },
  influence: { up: 'More say in things', down: 'Less say in things' },
  causeKnowledge: { up: 'Understanding more', down: 'Falling behind' },
}
