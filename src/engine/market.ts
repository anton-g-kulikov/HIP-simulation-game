/**
 * Market state — spec §7.
 *
 * One scalar, added directly to hiring probabilities. Shown to the player only
 * as a phrase: the market is context, not a number to optimise against.
 */

import type { GameTuning } from '@content/schema'
import type { Rng } from './rng'
import type { MarketState } from './types'
import { clamp } from './util'

export function advanceMarket(market: MarketState, tuning: GameTuning, rng: Rng): MarketState {
  const drifted = tuning.market.drift * market.hiring + rng.normal(0, tuning.market.volatility)
  return { hiring: clamp(drifted, tuning.market.min, tuning.market.max) }
}

export function describeMarket(market: MarketState): string | null {
  if (market.hiring > 0.07) return 'Hiring has picked up noticeably.'
  if (market.hiring > 0.03) return 'Hiring is a little warmer than usual.'
  if (market.hiring < -0.07) return 'Hiring has cooled noticeably.'
  if (market.hiring < -0.03) return 'Hiring is a little slower than usual.'
  return null
}
