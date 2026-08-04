/**
 * Engine-level constants.
 *
 * These are structural: the shape of the curves and the scale of the world.
 * Per-action and per-template numbers live in content JSON (ADR-004), not here.
 * Every value is sourced from _meta/specs/HIP_Simulation_Spec.md; change the
 * spec and this file together.
 */

import type { ActionCategory } from './types'

// Energy — spec §2
export const BASE_ENERGY = 10
export const ENERGY_MODIFIER_MIN = -4
export const ENERGY_MODIFIER_MAX = 2
export const HEAT_CAP = 3.5
export const REST_THRESHOLD = 3
export const REST_COOLDOWN_BONUS = 1.5

/** Repetition multiplier by heat tier — spec §2.3. */
export const REPETITION_MULTIPLIERS = [1.0, 1.5, 2.0, 3.0] as const

/** Heat lost per turn of non-use — spec §2.4. */
export const COOLDOWN_RATES: Record<ActionCategory, number> = {
  current_job: 1.0,
  job_search: 1.0,
  learning: 0.5,
  project: 0.34,
  network_public: 0.5,
}

// Capital — spec §3
export const DIMINISHING_RETURNS_EXPONENT = 0.7
export const CAPITAL_MIN = 0
export const CAPITAL_MAX = 100

export const DECAY_PER_TURN = {
  reputation: 0.6,
  network: 0.4,
  capability: 0.1,
  evidence: 0,
} as const

/** Share of any pay rise that is absorbed by lifestyle — spec §3.3. */
export const LIFESTYLE_INFLATION_SHARE = 0.25
/** Reported instead of Infinity when burn is zero. */
export const MAX_RUNWAY_MONTHS = 999

// Resolution — spec §4
export const SCORE_WEIGHTS = {
  match: 0.4,
  fit: 0.2,
  effort: 0.3,
  momentum: 0.1,
} as const

export const EFFORT_CURVE_SCALE = 3
export const LOGISTIC_STEEPNESS = 6
export const PROBABILITY_MIN = 0.03
export const PROBABILITY_MAX = 0.95
export const STRONG_SUCCESS_SHARE = 0.35
export const NEAR_MISS_SHARE_OF_FAILURE = 0.3

/**
 * Curvature of the payoff-versus-effort relationship for scalable actions.
 * Above 1 a half-hearted attempt earns less than half the result.
 */
export const MAGNITUDE_EXPONENT = 1.4

/** Momentum saturates at this much cumulative energy in one pipeline — spec §4.1. */
export const MOMENTUM_SATURATION_ENERGY = 12

// Fit — spec §1
export const FIT_DEFAULT_MEAN = 0.5
export const FIT_DEFAULT_SD = 0.18
export const FIT_STARTING_STRENGTH_MEAN = 0.62
export const FIT_STARTING_STRENGTH_SD = 0.15
export const FIT_MIN = 0.1
export const FIT_MAX = 0.9

// Campaign
export const TURNS_PER_CAMPAIGN = 12
export const STARTING_AGE_MONTHS = 28 * 12
export const SAVE_VERSION = 1
