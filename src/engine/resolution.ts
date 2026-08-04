/**
 * The outcome function — spec §4.
 *
 * Every check in the game goes through here. Four bands rather than
 * success/failure is what produces partial outcomes structurally (design doc
 * §10.4) instead of leaving them to be hand-written per template.
 *
 * The explanation is derived from the same score terms that produced the
 * result, so it cannot drift from what actually happened. It reports which
 * factors mattered without exposing the model (design doc §10.5).
 */

import type { CheckInputs, CheckResult, Contributor, Explanation, Luck, ResultBand } from './types'
import type { Rng } from './rng'
import {
  EFFORT_CURVE_SCALE,
  LOGISTIC_STEEPNESS,
  MOMENTUM_SATURATION_ENERGY,
  NEAR_MISS_SHARE_OF_FAILURE,
  PROBABILITY_MAX,
  PROBABILITY_MIN,
  SCORE_WEIGHTS,
  STRONG_SUCCESS_SHARE,
  BASE_ENERGY,
} from './tuning'
import { clamp } from './util'

const EFFORT_NORMALISER = 1 - Math.exp(-BASE_ENERGY / EFFORT_CURVE_SCALE)

/**
 * Effort effectiveness, normalised so a full 10-energy commitment scores 1.0.
 * Reproduces the design doc's superficial / credible / strong / near-maximum
 * ladder (§10.2) as a continuous curve, including the deliberately poor value
 * of the last two energy.
 */
export function effortCurve(energy: number): number {
  if (energy <= 0) return 0
  return (1 - Math.exp(-energy / EFFORT_CURVE_SCALE)) / EFFORT_NORMALISER
}

/** Cumulative prior investment in a pipeline, saturating so it cannot dominate. */
export function momentumFromEnergy(investedEnergy: number): number {
  return clamp(investedEnergy / MOMENTUM_SATURATION_ENERGY, 0, 1)
}

export function score(inputs: CheckInputs): number {
  return (
    SCORE_WEIGHTS.match * inputs.match +
    SCORE_WEIGHTS.fit * inputs.fit +
    SCORE_WEIGHTS.effort * effortCurve(inputs.energy) +
    SCORE_WEIGHTS.momentum * inputs.momentum
  )
}

const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z))

/**
 * Clamped so nothing is ever certain and nothing is ever hopeless. That is what
 * keeps outcomes readable as information rather than as arithmetic the player
 * already did.
 */
export function successProbability(inputs: CheckInputs): number {
  const z = LOGISTIC_STEEPNESS * (score(inputs) - inputs.difficulty)
  const raw = sigmoid(z) + inputs.marketModifier + inputs.eventModifier
  return clamp(raw, PROBABILITY_MIN, PROBABILITY_MAX)
}

export function bandForRoll(roll: number, probability: number): ResultBand {
  if (roll < STRONG_SUCCESS_SHARE * probability) return 'strong'
  if (roll < probability) return 'success'
  if (roll < probability + NEAR_MISS_SHARE_OF_FAILURE * (1 - probability)) return 'nearMiss'
  return 'failure'
}

const CONTRIBUTOR_LABELS = {
  match: 'Your track record',
  fit: 'How well this suits you',
  effort: 'The effort you put in',
  momentum: 'The work you had already put in',
  market: 'The hiring market',
  event: 'Recent events',
} as const

const INCLUSION_THRESHOLD = 0.02
const DECISIVE_THRESHOLD = 0.12
const NOTABLE_THRESHOLD = 0.06
const MAX_CONTRIBUTORS = 3
const LUCK_THRESHOLD = 0.25

function weightOf(magnitude: number): Contributor['weight'] {
  if (magnitude >= DECISIVE_THRESHOLD) return 'decisive'
  if (magnitude >= NOTABLE_THRESHOLD) return 'notable'
  return 'minor'
}

function luckFrom(roll: number, probability: number): Luck {
  if (roll < probability - LUCK_THRESHOLD) return 'ran your way'
  if (roll > probability + LUCK_THRESHOLD) return 'ran against you'
  return 'as expected'
}

/**
 * Ranks each score term by how far it deviated from neutral and reports the top
 * three. Momentum and the modifiers are measured against zero because "none"
 * is their neutral state; match, fit and effort are measured against the middle.
 */
export function buildExplanation(
  inputs: CheckInputs,
  roll: number,
  probability: number,
): Explanation {
  const candidates: { label: string; contribution: number }[] = [
    { label: CONTRIBUTOR_LABELS.match, contribution: SCORE_WEIGHTS.match * (inputs.match - 0.5) },
    { label: CONTRIBUTOR_LABELS.fit, contribution: SCORE_WEIGHTS.fit * (inputs.fit - 0.5) },
    {
      label: CONTRIBUTOR_LABELS.effort,
      contribution: SCORE_WEIGHTS.effort * (effortCurve(inputs.energy) - 0.5),
    },
    {
      label: CONTRIBUTOR_LABELS.momentum,
      contribution: SCORE_WEIGHTS.momentum * inputs.momentum,
    },
    { label: CONTRIBUTOR_LABELS.market, contribution: inputs.marketModifier },
    { label: CONTRIBUTOR_LABELS.event, contribution: inputs.eventModifier },
  ]

  const contributors = candidates
    .filter((c) => Math.abs(c.contribution) > INCLUSION_THRESHOLD)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, MAX_CONTRIBUTORS)
    .map<Contributor>((c) => ({
      label: c.label,
      direction: c.contribution > 0 ? 'helped' : 'hurt',
      weight: weightOf(Math.abs(c.contribution)),
    }))

  return { contributors, luck: luckFrom(roll, probability) }
}

/** Rolls now, narrates later (ADR-005). */
export function resolveCheck(inputs: CheckInputs, rng: Rng): CheckResult {
  const probability = successProbability(inputs)
  const roll = rng.next()
  return {
    band: bandForRoll(roll, probability),
    probability,
    roll,
    explanation: buildExplanation(inputs, roll, probability),
  }
}
