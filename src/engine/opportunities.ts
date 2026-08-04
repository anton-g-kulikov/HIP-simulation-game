/**
 * Opportunity generation — spec §6.
 *
 * Active pipeline continuations are never *drawn*: they are commitments, not
 * offers, and they always appear. New cards are filtered, weighted and drawn
 * without replacement, with one guarantee — at least one card from a category
 * the player has been ignoring, so a tunnel-visioned player is still shown the
 * road not taken.
 */

import type { Content } from '@content/loader'
import type { OpportunityTemplate } from '@content/schema'
import type { Rng } from './rng'
import { allPredicatesPass } from './paths'
import {
  countActiveHiring,
  hiringStageConfig,
  HIRING_TERMINAL_STAGES,
  projectStage,
} from './pipelines'
import type { ActionCategory, CampaignState, Offer } from './types'
import { ACTION_CATEGORIES } from './energy'

function categoriesUsedRecently(state: CampaignState, window: number): Set<ActionCategory> {
  const used = new Set<ActionCategory>()
  for (const record of state.history.slice(-window)) {
    for (const allocation of record.allocations) used.add(allocation.category)
  }
  return used
}

function templateShownRecently(state: CampaignState, templateId: string, window: number): boolean {
  return state.history
    .slice(-window)
    .some((record) => record.offersShown.some((id) => id.startsWith(`${templateId}@`)))
}

function isEligible(
  state: CampaignState,
  template: OpportunityTemplate,
  content: Content,
  professionOf: string,
): boolean {
  const availability = template.availability

  if (!availability.stages.includes(state.stage)) return false
  if (!availability.professions.includes(professionOf)) return false
  if (
    state.player.seniority < availability.seniority.min ||
    state.player.seniority > availability.seniority.max
  ) {
    return false
  }
  if (availability.unlockOnly && !state.unlockedTemplateIds.includes(template.id)) return false

  if (availability.pipelineStage) {
    const stage = projectStage(state)
    if (!stage || !availability.pipelineStage.includes(stage)) return false
  }

  // One live application per role, and a cap on how many can run at once.
  if (template.kind === 'hiring') {
    if (countActiveHiring(state) >= content.tuning.hiring.maxConcurrent) return false
    const alreadyPursuing = state.pipelines.some(
      (p) => p.templateId === template.id && !p.closed && !HIRING_TERMINAL_STAGES.includes(p.stage),
    )
    if (alreadyPursuing) return false
  }

  return allPredicatesPass(state, availability.requires)
}

function weightFor(
  state: CampaignState,
  template: OpportunityTemplate,
  content: Content,
  eventModifiers: Record<string, number>,
): number {
  let weight = template.availability.baseWeight
  if (templateShownRecently(state, template.id, content.tuning.offers.recencyWindow)) {
    weight *= template.availability.recencyPenalty ?? content.tuning.offers.defaultRecencyPenalty
  }
  weight *= eventModifiers[template.id] ?? 1
  return weight
}

/** Weight multipliers contributed by whatever events are currently running. */
export function activeOpportunityModifiers(
  state: CampaignState,
  content: Content,
): Record<string, number> {
  const modifiers: Record<string, number> = {}
  for (const active of state.activeEvents) {
    const event = content.eventById[active.templateId]
    if (!event) continue
    for (const modifier of event.opportunityModifiers) {
      modifiers[modifier.template] = (modifiers[modifier.template] ?? 1) * modifier.weightMultiplier
    }
  }
  return modifiers
}

function makeOffer(
  template: OpportunityTemplate,
  state: CampaignState,
  singleTurn: boolean,
): Offer {
  const cost = template.cost
  return {
    id: `${template.id}@${state.turn}`,
    templateId: template.id,
    category: template.category,
    baseCost: cost.shape === 'fixed' ? cost.base : cost.min,
    shape: cost.shape,
    minEnergy: cost.shape === 'fixed' ? cost.base : cost.min,
    maxEnergy: cost.shape === 'fixed' ? cost.base : cost.max,
    expiresAfterTurn: state.turn + (singleTurn ? 0 : template.expiry.turns - 1),
    createdTurn: state.turn,
  }
}

/** One continuation per live hiring pipeline, at whatever stage it has reached. */
export function continuationOffers(state: CampaignState, content: Content): Offer[] {
  const offers: Offer[] = []
  for (const pipeline of state.pipelines) {
    if (pipeline.kind !== 'hiring' || pipeline.closed) continue
    if (HIRING_TERMINAL_STAGES.includes(pipeline.stage)) continue

    const template = content.opportunityById[pipeline.templateId]
    if (!template) continue

    const stageConfig = hiringStageConfig(content.tuning, pipeline.stage)
    const cost = stageConfig ? stageConfig.cost : content.tuning.hiring.acceptCost

    offers.push({
      id: `cont_${pipeline.id}@${state.turn}`,
      templateId: template.id,
      category: template.category,
      pipelineId: pipeline.id,
      baseCost: cost,
      shape: 'fixed',
      minEnergy: cost,
      maxEnergy: cost,
      // A commitment does not expire; it lapses through neglect instead.
      expiresAfterTurn: state.turn,
      createdTurn: state.turn,
    })
  }
  return offers
}

export function generateOffers(state: CampaignState, content: Content, rng: Rng): Offer[] {
  const profile = content.profiles[state.player.profileId]
  const profession = profile?.profession ?? ''
  const modifiers = activeOpportunityModifiers(state, content)

  // A surviving offer is re-checked, not grandfathered: something the player is
  // no longer eligible for should leave the table rather than sit there until it
  // expires. Three live applications should mean no fourth card, not "no fourth
  // card unless one was already showing".
  const surviving = state.offers.filter((offer) => {
    if (offer.pipelineId || offer.expiresAfterTurn < state.turn) return false
    const template = content.opportunityById[offer.templateId]
    return template ? isEligible(state, template, content, profession) : false
  })
  const offers: Offer[] = [...continuationOffers(state, content), ...surviving]

  const taken = new Set(offers.map((o) => o.templateId))
  const pool = content.opportunities.filter(
    (template) => !taken.has(template.id) && isEligible(state, template, content, profession),
  )

  const target = rng.int(content.tuning.offers.minPerTurn, content.tuning.offers.maxPerTurn)

  // Anti-tunnel-vision: seed the draw with a category the player has been
  // ignoring, so the alternative is visible rather than merely available.
  const recentlyUsed = categoriesUsedRecently(state, content.tuning.offers.freshCategoryWindow)
  const neglected = ACTION_CATEGORIES.filter((category) => !recentlyUsed.has(category))
  const fresh = pool.filter((template) => neglected.includes(template.category))
  if (fresh.length > 0 && offers.length < target) {
    const chosen = rng.pick(fresh, (t) => weightFor(state, t, content, modifiers))
    offers.push(makeOffer(chosen, state, false))
  }

  const remaining = pool.filter((template) => !offers.some((o) => o.templateId === template.id))
  while (offers.length < target && remaining.length > 0) {
    const chosen = rng.pick(remaining, (t) => weightFor(state, t, content, modifiers))
    remaining.splice(remaining.indexOf(chosen), 1)
    offers.push(makeOffer(chosen, state, false))
  }

  return offers
}
