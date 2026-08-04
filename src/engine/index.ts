/**
 * The engine's public API. The app layer imports from here and nowhere else
 * inside `src/engine/`.
 */

export { createCampaign, isCampaignComplete } from './campaign'
export { openTurn, commitAllocation, describeOffer, describeOffers } from './turn'
export {
  effectiveBudget,
  inflatedCost,
  repetitionMultiplier,
  energyZone,
  highEffortStreak,
  ACTION_CATEGORIES,
} from './energy'
export type { EnergyZone } from './energy'
export { runwayMonths, capitalMovement, notableMovement, CAPITAL_LABELS } from './capital'
export { describeAllFit, FIT_AXES } from './fit'
export { describeMarket } from './market'
export { summarisePipeline, visibleWork } from './pipelines'
export { TURNS_PER_CAMPAIGN, SAVE_VERSION, BASE_ENERGY } from './tuning'

export type * from './types'
