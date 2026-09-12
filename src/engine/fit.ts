/**
 * Personal fit — the partially hidden relationship between the player and a
 * path (design doc §7.8).
 *
 * Fit is never a number on screen and never a bar. It is a phrase whose
 * confidence widens only as the player *acts*, because the design position is
 * that fit is learned through action rather than selected up front
 * (HIP_Decisions_And_Open_Questions.md, Q3).
 */

import type { Rng } from './rng'
import {
  FIT_DEFAULT_MEAN,
  FIT_DEFAULT_SD,
  FIT_MAX,
  FIT_MIN,
  FIT_STARTING_STRENGTH_MEAN,
  FIT_STARTING_STRENGTH_SD,
} from './tuning'
import type { FitAxis, FitObservations, FitVector, FitWeights, ObservationStrength } from './types'
import { assertWeightsSumToOne, clamp } from './util'

export const FIT_AXES: readonly FitAxis[] = [
  'deep_technical',
  'leadership',
  'research',
  'founding',
  'communication',
  'operations',
]

/**
 * The starting profile is a software engineer, so `deep_technical` is drawn
 * from a higher-mean distribution: a coherent history should imply something,
 * even though the player still cannot see the value.
 */
const AXIS_DISTRIBUTION: Record<FitAxis, { mean: number; sd: number }> = {
  deep_technical: { mean: FIT_STARTING_STRENGTH_MEAN, sd: FIT_STARTING_STRENGTH_SD },
  leadership: { mean: FIT_DEFAULT_MEAN, sd: FIT_DEFAULT_SD },
  research: { mean: FIT_DEFAULT_MEAN, sd: FIT_DEFAULT_SD },
  founding: { mean: FIT_DEFAULT_MEAN, sd: FIT_DEFAULT_SD },
  communication: { mean: FIT_DEFAULT_MEAN, sd: FIT_DEFAULT_SD },
  operations: { mean: FIT_DEFAULT_MEAN, sd: FIT_DEFAULT_SD },
}

export function rollFit(rng: Rng): FitVector {
  const fit = {} as FitVector
  for (const axis of FIT_AXES) {
    const { mean, sd } = AXIS_DISTRIBUTION[axis]
    fit[axis] = clamp(rng.normal(mean, sd), FIT_MIN, FIT_MAX)
  }
  return fit
}

export function emptyObservations(): FitObservations {
  const observations = {} as FitObservations
  for (const axis of FIT_AXES) observations[axis] = []
  return observations
}

export function weightedFit(fit: FitVector, weights: FitWeights): number {
  assertWeightsSumToOne(weights, 'fit')
  let total = 0
  for (const [axis, weight] of Object.entries(weights)) {
    if (weight === undefined) continue
    total += weight * fit[axis as FitAxis]
  }
  return clamp(total, 0, 1)
}

export function recordObservation(
  observations: FitObservations,
  axis: FitAxis,
  strength: ObservationStrength,
  turn = 0,
): FitObservations {
  return { ...observations, [axis]: [...observations[axis], { turn, strength }] }
}

type Confidence = 'none' | 'tentative' | 'moderate' | 'clear'

function confidenceFor(observationCount: number): Confidence {
  if (observationCount < 2) return 'none'
  if (observationCount < 4) return 'tentative'
  if (observationCount < 7) return 'moderate'
  return 'clear'
}

/**
 * What each axis is about, in the words a person would use.
 *
 * Every reading names its subject. The first version said "this" — "This may
 * suit you" — on the assumption that it would sit on a card about a specific
 * path. It never did: readings are only ever shown in the snapshot and the
 * retrospective, side by side, where two of them read as one contradictory
 * sentence.
 */
const SUBJECTS: Record<FitAxis, string> = {
  deep_technical: 'deep technical work',
  leadership: 'leading people',
  research: 'research',
  founding: 'building something of your own',
  communication: 'explaining and persuading',
  operations: 'making things run',
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const PHRASES: Record<
  Exclude<Confidence, 'none'>,
  Record<'high' | 'low' | 'mixed', (subject: string) => string>
> = {
  tentative: {
    high: (s) => `${capitalise(s)} may suit you.`,
    low: (s) => `${capitalise(s)} may not suit you.`,
    mixed: (s) => `Too early to say whether ${s} suits you.`,
  },
  moderate: {
    high: (s) => `${capitalise(s)} seems to suit you.`,
    low: (s) => `${capitalise(s)} has been consistently hard going.`,
    mixed: (s) => `The evidence on ${s} is mixed.`,
  },
  clear: {
    high: (s) => `${capitalise(s)} clearly plays to your strengths.`,
    low: (s) => `${capitalise(s)} clearly does not play to your strengths.`,
    mixed: (s) => `The evidence on ${s} stays stubbornly mixed.`,
  },
}

const HIGH_FIT = 0.55
const LOW_FIT = 0.45

/** Returns null until the player has acted enough times to have earned a read. */
export function describeFit(
  fit: FitVector,
  observations: FitObservations,
  axis: FitAxis,
): string | null {
  const confidence = confidenceFor(observations[axis].length)
  if (confidence === 'none') return null

  const value = fit[axis]
  const tone = value > HIGH_FIT ? 'high' : value < LOW_FIT ? 'low' : 'mixed'
  return PHRASES[confidence][tone](SUBJECTS[axis])
}

/** Every axis the player has any read on, for the career snapshot. */
export function describeAllFit(
  fit: FitVector,
  observations: FitObservations,
): { axis: FitAxis; phrase: string }[] {
  return FIT_AXES.flatMap((axis) => {
    const phrase = describeFit(fit, observations, axis)
    return phrase ? [{ axis, phrase }] : []
  })
}
