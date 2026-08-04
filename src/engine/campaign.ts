/**
 * Campaign creation.
 *
 * Hidden fit is rolled here, once, and never shown as a number. Everything else
 * comes from the profile, so a new starting profile is a content change rather
 * than a code change.
 */

import type { Content } from '@content/loader'
import { requireProfile } from '@content/loader'
import { emptyHeat } from './energy'
import { emptyObservations, FIT_AXES } from './fit'
import { createStandingPipelines } from './pipelines'
import { createRng } from './rng'
import { FIT_MAX, FIT_MIN, SAVE_VERSION, STARTING_AGE_MONTHS, TURNS_PER_CAMPAIGN } from './tuning'
import {
  FIT_DEFAULT_MEAN,
  FIT_DEFAULT_SD,
  FIT_STARTING_STRENGTH_MEAN,
  FIT_STARTING_STRENGTH_SD,
} from './tuning'
import type { CampaignState, FitAxis, FitVector } from './types'
import { clamp } from './util'

/**
 * The profile names one axis its history implies, drawn from a higher-mean
 * distribution. The player still cannot see any of these values.
 */
function rollFitFor(strongAxis: FitAxis, seed: number): FitVector {
  const rng = createRng(seed)
  const fit = {} as FitVector
  for (const axis of FIT_AXES) {
    const mean = axis === strongAxis ? FIT_STARTING_STRENGTH_MEAN : FIT_DEFAULT_MEAN
    const sd = axis === strongAxis ? FIT_STARTING_STRENGTH_SD : FIT_DEFAULT_SD
    fit[axis] = clamp(rng.normal(mean, sd), FIT_MIN, FIT_MAX)
  }
  return fit
}

export function createCampaign(content: Content, profileId: string, seed: number): CampaignState {
  const profile = requireProfile(content, profileId)

  // Fit uses a derived seed so that changing the campaign's draw order later
  // does not silently reroll who the player is.
  const hiddenFit = rollFitFor(profile.strongFitAxis, seed ^ 0x5f3759df)

  return {
    saveVersion: SAVE_VERSION,
    seed,
    rngCursor: 0,
    turn: 1,
    ageMonths: STARTING_AGE_MONTHS,
    stage: 'exploitation',
    phase: 'awaiting_allocation',

    player: {
      profileId,
      role: { ...profile.role },
      seniority: profile.seniority,
      capital: {
        capability: { ...profile.capital.capability },
        evidence: profile.capital.evidence,
        reputation: profile.capital.reputation,
        network: profile.capital.network,
        influence: profile.capital.influence,
        causeKnowledge: profile.capital.causeKnowledge,
      },
      finance: { ...profile.finance },
      hiddenFit,
      fitObservations: emptyObservations(),
      heat: emptyHeat(),
      energyModifier: 0,
      energyModifierTurnsLeft: 0,
      rampTurnsLeft: 0,
    },

    market: { hiring: 0 },
    activeEvents: [],
    firedEventTemplateIds: [],
    pipelines: createStandingPipelines(1),
    offers: [],
    pending: [],
    currentOutcomes: [],
    unlockedTemplateIds: [],
    history: [],
    openedTurn: 0,
  }
}

export function isCampaignComplete(state: CampaignState): boolean {
  return state.turn > TURNS_PER_CAMPAIGN
}
