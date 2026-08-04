/**
 * The turn reducer — the only two state transitions in the game.
 *
 * `openTurn` resolves what the player already committed to and puts a new set
 * of choices on the table. `commitAllocation` takes the player's one input and
 * turns it into consequences, most of which arrive later.
 *
 * Outcomes are rolled here, at commit, and narrated at resolution (ADR-005), so
 * an event landing in between cannot retroactively change a result the player
 * already earned.
 */

import type { Content } from '@content/loader'
import type { OpportunityTemplate } from '@content/schema'
import { accrueSavings, applyTurnDecay, weightedMatch, applyRaise } from './capital'
import { applyEffects } from './effects'
import { coolDown, effectiveBudget, inflatedCost, raiseHeat, repetitionMultiplier } from './energy'
import { rollEvent, expireEvents } from './events'
import { weightedFit } from './fit'
import { advanceMarket } from './market'
import { generateOffers } from './opportunities'
import {
  addProjectProgress,
  decayVisibleWork,
  ensureProjectPipeline,
  EMPLOYER_PIPELINE_ID,
  findPipeline,
  hiringStageAfter,
  hiringStageConfig,
  lapseNeglectedPipelines,
  noteLearningApplied,
  noteStudyTurn,
  openHiringPipeline,
  PROJECT_PIPELINE_ID,
  resetVisibleWork,
  studyDecayFactor,
  summarisePipeline,
  updatePipeline,
  visibleWork,
} from './pipelines'
import { createRng, type Rng } from './rng'
import { effortCurve, momentumFromEnergy, resolveCheck } from './resolution'
import { generateSignals } from './signals'
import { MAGNITUDE_EXPONENT, TURNS_PER_CAMPAIGN } from './tuning'
import type {
  ActionCategory,
  Allocation,
  CampaignState,
  CheckResult,
  Effect,
  Offer,
  OfferView,
  OutcomeCard,
  PendingEffect,
  TurnRecord,
} from './types'
import { clamp } from './util'

export { isCampaignComplete } from './campaign'

function rngFor(state: CampaignState): Rng {
  return createRng(state.seed, state.rngCursor)
}

function requireTemplateFor(content: Content, offer: Offer): OpportunityTemplate {
  const template = content.opportunityById[offer.templateId]
  if (!template) throw new Error(`Offer ${offer.id} references unknown template ${offer.templateId}`)
  return template
}

// ---------------------------------------------------------------- open turn

function resolvePending(
  state: CampaignState,
  content: Content,
): { state: CampaignState; outcomes: OutcomeCard[] } {
  const due = state.pending.filter((p) => p.resolveOnTurn <= state.turn)
  if (due.length === 0) return { state: { ...state, currentOutcomes: [] }, outcomes: [] }

  let current: CampaignState = { ...state, pending: state.pending.filter((p) => p.resolveOnTurn > state.turn) }
  const outcomes: OutcomeCard[] = []

  for (const pending of due) {
    const applied = applyEffects(current, pending.effects, {
      turn: current.turn,
      pipelineId: pending.pipelineId,
      tuning: content.tuning,
    })
    current = applied.state
    const changes = [...applied.changes]

    const structural = applyStructuralOutcome(current, content, pending)
    current = structural.state
    changes.push(...structural.changes)

    // The sentence for a capital move is shown beside its bar, so it must not
    // also appear in the plain text list.
    const spokenForByBars = new Set(applied.capitalChanges.map((c) => c.phrase))
    const textChanges = changes.filter((c) => !spokenForByBars.has(c))

    outcomes.push({
      id: pending.id,
      kind: 'result',
      sourceTemplateId: pending.sourceTemplateId,
      sourceTitle: pending.sourceTitle,
      sourceTurn: pending.sourceTurn,
      turnsAgo: current.turn - pending.sourceTurn,
      band: pending.result.band,
      headline: pending.headline,
      explanation: pending.result.explanation,
      capitalChanges: applied.capitalChanges,
      changes:
        textChanges.length > 0 || applied.capitalChanges.length > 0
          ? textChanges
          : ['Nothing measurable changed.'],
    })
  }

  return { state: { ...current, currentOutcomes: outcomes }, outcomes }
}

/**
 * Effects the content grammar cannot express: opening and advancing pipelines,
 * and taking a job. Kept here rather than in the effect interpreter because
 * they are mechanics, not content (ADR-009).
 */
function applyStructuralOutcome(
  state: CampaignState,
  content: Content,
  pending: PendingEffect,
): { state: CampaignState; changes: string[] } {
  const band = pending.result.band
  const succeeded = band === 'strong' || band === 'success'
  const changes: string[] = []

  if (pending.kind === 'hiring' && !pending.stage) {
    if (!succeeded) return { state, changes }
    const template = content.opportunityById[pending.sourceTemplateId]
    if (!template) return { state, changes }
    changes.push(
      pending.referral
        ? 'Someone inside put your name forward, so you skipped the first screen.'
        : 'The process is open.',
    )
    return {
      state: openHiringPipeline(
        state,
        template,
        content.tuning,
        pending.referral ?? false,
        state.turn,
      ),
      changes,
    }
  }

  if (pending.kind === 'hiring' && pending.stage && pending.pipelineId) {
    const pipeline = findPipeline(state, pending.pipelineId)
    if (!pipeline || pipeline.closed) return { state, changes }

    if (pending.stage === 'offer') {
      return acceptOffer(state, content, pipeline.id, pending.sourceTemplateId)
    }

    const nextStage = hiringStageAfter(
      content.tuning,
      pending.stage,
      band,
      Boolean(pipeline.data.referral),
    )
    const closed = nextStage === 'rejected'
    if (nextStage === 'offer') changes.push('There is an offer on the table.')
    if (closed) changes.push('That process is over.')

    return {
      state: updatePipeline(state, pipeline.id, (p) => ({ ...p, stage: nextStage, closed })),
      changes,
    }
  }

  if (pending.kind === 'project' && pending.stage === 'launch') {
    const nextStage = succeeded ? 'traction' : 'dormant'
    changes.push(
      succeeded ? 'People started showing up for it.' : 'It launched and nobody came.',
    )
    return {
      state: updatePipeline(state, PROJECT_PIPELINE_ID, (p) => ({ ...p, stage: nextStage })),
      changes,
    }
  }

  return { state, changes }
}

function acceptOffer(
  state: CampaignState,
  content: Content,
  pipelineId: string,
  templateId: string,
): { state: CampaignState; changes: string[] } {
  const template = content.opportunityById[templateId]
  const role = template?.roleOutcome
  if (!role) return { state, changes: [] }

  const finance = applyRaise(
    state.player.finance,
    state.player.finance.monthlyComp * role.compMultiplier,
  )

  const next: CampaignState = {
    ...state,
    player: {
      ...state.player,
      role: {
        title: role.title,
        org: role.org,
        orgQuality: role.orgQuality,
        managerQuality: role.managerQuality,
      },
      seniority: clamp(state.player.seniority + role.seniorityDelta, 0, 1),
      finance,
      rampTurnsLeft: content.tuning.hiring.rampTurns,
    },
  }

  const closed = updatePipeline(next, pipelineId, (p) => ({ ...p, stage: 'accepted', closed: true }))
  const withoutVisibility = resetVisibleWork(closed)

  return {
    state: withoutVisibility,
    changes: [
      `You took the role. You are now ${role.title} at ${role.org}.`,
      'Starting again somewhere new will cost you a couple of months of momentum.',
    ],
  }
}

/** Recognition at the current employer — spec §5.2. */
function checkRecognition(
  state: CampaignState,
  content: Content,
): { state: CampaignState; outcome?: OutcomeCard } {
  if (visibleWork(state) < content.tuning.employer.recognitionThreshold) return { state }

  const raised: CampaignState = {
    ...state,
    player: {
      ...state.player,
      finance: applyRaise(
        state.player.finance,
        state.player.finance.monthlyComp * content.tuning.employer.raiseMultiplier,
      ),
      seniority: clamp(state.player.seniority + content.tuning.employer.seniorityStep, 0, 1),
    },
  }

  const applied = applyEffects(raised, content.tuning.employer.recognitionEffects, {
    turn: state.turn,
    tuning: content.tuning,
  })

  return {
    state: resetVisibleWork(applied.state),
    outcome: {
      id: `recognition@${state.turn}`,
      kind: 'recognition',
      sourceTemplateId: 'employer',
      sourceTitle: 'Your current job',
      sourceTurn: state.turn,
      turnsAgo: 0,
      band: 'success',
      headline: content.tuning.employer.recognitionHeadline,
      explanation: { contributors: [], luck: 'as expected' },
      capitalChanges: applied.capitalChanges,
      changes: applied.changes.filter(
        (c) => !applied.capitalChanges.some((m) => m.phrase === c),
      ),
    },
  }
}

export function openTurn(state: CampaignState, content: Content): CampaignState {
  if (state.openedTurn === state.turn) return state
  if (state.turn > TURNS_PER_CAMPAIGN) return { ...state, phase: 'complete' }

  const rng = rngFor(state)
  const lastTurn = state.history[state.history.length - 1]

  let current = state

  // 1. Resolve what was already committed.
  const resolved = resolvePending(current, content)
  current = resolved.state
  const outcomes = [...resolved.outcomes]

  // 2. Recognition at the current employer, if enough visible work has piled up.
  const recognition = checkRecognition(current, content)
  current = recognition.state
  if (recognition.outcome) outcomes.push(recognition.outcome)

  // 3. Erosion: capital decay, visible work fading, heat cooling.
  //
  // Skipped on the very first opening. Decay and earnings represent a month
  // passing, and at the moment of the player's first decision none has — the
  // opening screen would otherwise contradict the authored profile, showing
  // nine months of runway where the profile says eight.
  const monthHasPassed = current.history.length > 0
  if (monthHasPassed) {
    current = {
      ...current,
      player: {
        ...current.player,
        capital: applyTurnDecay(current.player.capital),
        finance: accrueSavings(current.player.finance),
        heat: coolDown(
          current.player.heat,
          lastTurn?.energyUnused ?? 0,
          lastTurn?.categoriesUsed ?? [],
        ),
        rampTurnsLeft: Math.max(0, current.player.rampTurnsLeft - 1),
        energyModifierTurnsLeft: Math.max(0, current.player.energyModifierTurnsLeft - 1),
      },
    }
    if (current.player.energyModifierTurnsLeft === 0 && current.player.energyModifier !== 0) {
      current = { ...current, player: { ...current.player, energyModifier: 0 } }
    }
    current = decayVisibleWork(current, content.tuning)
  }

  // 4. The world moves.
  current = { ...current, market: advanceMarket(current.market, content.tuning, rng) }
  current = expireEvents(current)

  const event = rollEvent(current, content, rng)
  current = event.state
  if (event.event) {
    outcomes.push({
      id: `event_${event.event.id}@${current.turn}`,
      kind: 'event',
      sourceTemplateId: event.event.id,
      sourceTitle: 'Out of your hands',
      sourceTurn: current.turn,
      turnsAgo: 0,
      band: 'success',
      headline: event.event.narrative.headline,
      explanation: { contributors: [], luck: 'as expected' },
      capitalChanges: event.capitalChanges,
      changes:
        event.changes.length > 0 || event.capitalChanges.length > 0
          ? event.changes.filter((c) => !event.capitalChanges.some((m) => m.phrase === c))
          : [event.event.narrative.body],
    })
  }

  // 5. Neglected processes close themselves.
  const lapsed = lapseNeglectedPipelines(current, content.tuning)
  current = lapsed.state
  for (const pipeline of lapsed.lapsed) {
    outcomes.push({
      id: `lapsed_${pipeline.id}@${current.turn}`,
      kind: 'lapse',
      sourceTemplateId: pipeline.templateId,
      sourceTitle: pipeline.title,
      sourceTurn: pipeline.lastInvestedTurn,
      turnsAgo: current.turn - pipeline.lastInvestedTurn,
      band: 'failure',
      headline: 'That process went quiet while you were doing other things.',
      explanation: { contributors: [], luck: 'as expected' },
      capitalChanges: [],
      changes: ['One option closed itself.'],
    })
  }

  // 6. New choices.
  const offers = generateOffers(current, content, rng)

  return {
    ...current,
    offers,
    currentOutcomes: outcomes,
    openedTurn: current.turn,
    rngCursor: rng.cursor(),
    // Roll the two reference points forward exactly once per opened month, so
    // the snapshot shows what the last month did rather than the whole campaign.
    capitalAtPreviousOpen: state.capitalAtOpen,
    capitalAtOpen: current.player.capital,
  }
}

// ---------------------------------------------------------------- commit

/**
 * Repetition cost applies to *starting* things, not to following through on one.
 *
 * Charging it on pipeline continuations made a single hiring process literally
 * unaffordable — the assignment stage costs 6, and at two points of heat that is
 * 12 against a budget of 10 — which contradicts balance goal §23: repeated
 * actions should become unattractive before they become impossible. Mass
 * applying still accrues heat, because each application is a new action, and
 * that is the behaviour design doc §6.3 actually targets.
 */
function chargeFor(state: CampaignState, offer: Offer, effort: number): number {
  if (offer.pipelineId) return effort
  return inflatedCost(effort, state.player.heat[offer.category])
}

function validateAllocation(
  state: CampaignState,
  content: Content,
  allocation: Allocation,
): { charged: number; entries: { offer: Offer; effort: number; charge: number }[] } {
  const entries: { offer: Offer; effort: number; charge: number }[] = []
  let charged = 0

  for (const [offerId, effort] of Object.entries(allocation)) {
    if (effort <= 0) continue

    const offer = state.offers.find((o) => o.id === offerId)
    if (!offer) throw new Error(`No such offer on the table: ${offerId}`)

    if (!Number.isInteger(effort)) {
      throw new Error(`Energy must be a whole number, got ${effort} for offer ${offerId}`)
    }
    if (effort < offer.minEnergy) {
      throw new Error(
        `Cannot spend ${effort} energy on ${offerId}: it takes at least ${offer.minEnergy}.`,
      )
    }
    if (effort > offer.maxEnergy) {
      throw new Error(
        `Cannot spend ${effort} energy on ${offerId}: the most it takes is ${offer.maxEnergy}.`,
      )
    }

    const charge = chargeFor(state, offer, effort)
    charged += charge
    entries.push({ offer, effort, charge })

    // Guard against a duplicate template sneaking in through two offer ids.
    requireTemplateFor(content, offer)
  }

  const budget = effectiveBudget(state.player.energyModifier)
  if (charged > budget) {
    throw new Error(`That costs ${charged} energy and you have ${budget}.`)
  }

  return { charged, entries }
}

function scaleEffects(effects: readonly Effect[], factor: number): Effect[] {
  if (factor === 1) return [...effects]
  return effects.map((effect) => {
    if (effect.op === 'capital') return { ...effect, amount: effect.amount * factor }
    if (effect.op === 'visibleWork') return { ...effect, amount: effect.amount * factor }
    return effect
  })
}

/**
 * How much of an action's result a given effort actually earns.
 *
 * Without this, effort moved only the *probability* of a fixed payout, so ten
 * one-energy attempts beat two five-energy ones by roughly three to one — the
 * model made overinvestment costly but underinvestment nearly free. A
 * superficial attempt that happens to succeed should produce a superficial
 * result (design doc §10.2). Fixed-cost actions have no choice to make, so
 * their factor is always 1.
 */
function magnitudeFactor(effort: number, maxEnergy: number): number {
  if (effort >= maxEnergy) return 1
  const ratio = effortCurve(effort) / effortCurve(maxEnergy)
  return Math.pow(ratio, MAGNITUDE_EXPONENT)
}

function drawDelay(delay: Record<string, number>, rng: Rng): number {
  const entries = Object.entries(delay)
  const chosen = rng.pick(entries, ([, probability]) => probability)
  return Number(chosen[0])
}

export function commitAllocation(
  state: CampaignState,
  content: Content,
  allocation: Allocation,
): CampaignState {
  if (state.turn > TURNS_PER_CAMPAIGN) return state

  const { entries } = validateAllocation(state, content, allocation)
  const rng = rngFor(state)

  let current = state
  const pending: PendingEffect[] = []
  const categoriesUsed: ActionCategory[] = []
  const allocations: TurnRecord['allocations'] = []
  let energySpent = 0

  for (const { offer, effort, charge } of entries) {
    const template = requireTemplateFor(content, offer)
    const pipeline = offer.pipelineId ? findPipeline(current, offer.pipelineId) : undefined
    const stageConfig = pipeline ? hiringStageConfig(content.tuning, pipeline.stage) : undefined
    const isAcceptance = Boolean(pipeline) && pipeline?.stage === 'offer'

    categoriesUsed.push(offer.category)
    allocations.push({ templateId: template.id, category: offer.category, energy: charge })
    energySpent += charge

    // Project progress is deterministic: effort accumulates, the gamble is at launch.
    if (template.kind === 'project' && !template.tags.includes(content.tuning.project.launchTag)) {
      current = ensureProjectPipeline(current, template.title)
      current = addProjectProgress(current, effort, content.tuning)
    }

    const studyFactor =
      template.kind === 'learning' && !template.tags.includes(content.tuning.learning.applyTag)
        ? studyDecayFactor(current, content.tuning)
        : 1

    const result: CheckResult = isAcceptance
      ? { band: 'success', probability: 1, roll: 0, explanation: { contributors: [], luck: 'as expected' } }
      : resolveCheck(
          {
            match: weightedMatch(current.player.capital, template.check.match),
            fit: weightedFit(current.player.hiddenFit, template.check.fit),
            energy: effort,
            momentum: momentumFromEnergy(pipeline?.investedEnergy ?? 0),
            difficulty: stageConfig ? stageConfig.difficulty : template.check.difficulty,
            marketModifier: offer.category === 'job_search' ? current.market.hiring : 0,
            eventModifier:
              pipeline && Boolean(pipeline.data.referral) && stageConfig
                ? content.tuning.hiring.referralBonus
                : 0,
          },
          rng,
        )

    const source = stageConfig ? stageConfig.outcomes : template.outcomes
    const outcome = source[result.band]
    const effects = scaleEffects(
      outcome.effects,
      studyFactor * magnitudeFactor(effort, offer.maxEnergy),
    )

    // A referral is rolled once, when the application goes in.
    const referral =
      template.kind === 'hiring' && !pipeline
        ? rng.bool((current.player.capital.network / 100) * content.tuning.hiring.referralNetworkFactor)
        : undefined

    pending.push({
      id: `${offer.id}#${current.turn}`,
      sourceTemplateId: template.id,
      sourceTitle: stageConfig ? `${template.title} — ${stageConfig.label}` : template.title,
      sourceTurn: current.turn,
      resolveOnTurn: current.turn + (isAcceptance ? 1 : drawDelay(template.delay, rng)),
      kind: template.kind,
      stage: isAcceptance
        ? 'offer'
        : template.tags.includes(content.tuning.project.launchTag)
          ? 'launch'
          : pipeline?.stage,
      referral,
      pipelineId: pipeline?.id,
      energySpent: effort,
      result,
      headline: isAcceptance ? 'You accepted the offer.' : outcome.headline,
      effects,
    })

    if (pipeline) {
      current = updatePipeline(current, pipeline.id, (p) => ({
        ...p,
        investedEnergy: p.investedEnergy + effort,
        lastInvestedTurn: current.turn,
      }))
    }

    if (template.kind === 'learning') {
      current = template.tags.includes(content.tuning.learning.applyTag)
        ? noteLearningApplied(current)
        : noteStudyTurn(current)
    }

    if (template.kind === 'current_job') {
      current = updatePipeline(current, EMPLOYER_PIPELINE_ID, (p) => ({
        ...p,
        investedEnergy: p.investedEnergy + effort,
        lastInvestedTurn: current.turn,
      }))
    }
  }

  const budget = effectiveBudget(current.player.energyModifier)
  const consumedOfferIds = new Set(entries.map((e) => e.offer.id))

  const record: TurnRecord = {
    turn: current.turn,
    categoriesUsed: [...new Set(categoriesUsed)],
    energyBudget: budget,
    energySpent,
    energyUnused: budget - energySpent,
    allocations,
    offersShown: current.offers.map((o) => o.id),
    offersExpiredUnused: current.offers
      .filter((o) => !consumedOfferIds.has(o.id) && o.expiresAfterTurn <= current.turn)
      .map((o) => o.id),
    outcomes: current.currentOutcomes,
  }

  const eventThisTurn = current.activeEvents.find((e) => e.startedTurn === current.turn)
  if (eventThisTurn) record.eventTemplateId = eventThisTurn.templateId

  const nextTurn = current.turn + 1

  return {
    ...current,
    turn: nextTurn,
    ageMonths: current.ageMonths + 1,
    phase: nextTurn > TURNS_PER_CAMPAIGN ? 'complete' : 'awaiting_allocation',
    player: {
      ...current.player,
      heat: raiseHeat(current.player.heat, categoriesUsed),
    },
    offers: current.offers.filter((o) => !consumedOfferIds.has(o.id) && !o.pipelineId),
    pending: [...current.pending, ...pending],
    history: [...current.history, record],
    rngCursor: rng.cursor(),
  }
}

// ---------------------------------------------------------------- views

export function describeOffer(state: CampaignState, offer: Offer, content: Content): OfferView {
  const template = requireTemplateFor(content, offer)
  const pipeline = offer.pipelineId ? findPipeline(state, offer.pipelineId) : undefined
  const stageConfig = pipeline ? hiringStageConfig(content.tuning, pipeline.stage) : undefined

  const multiplier = offer.pipelineId ? 1 : repetitionMultiplier(state.player.heat[offer.category])
  const cost = offer.pipelineId
    ? offer.baseCost
    : inflatedCost(offer.baseCost, state.player.heat[offer.category])

  const isAcceptance = pipeline?.stage === 'offer'
  const title = isAcceptance
    ? `${template.title} — accept the offer`
    : stageConfig
      ? `${template.title} — ${stageConfig.label}`
      : template.title

  const view: OfferView = {
    offer,
    title,
    actionVerb: isAcceptance
      ? content.tuning.hiring.acceptVerb
      : (stageConfig?.verb ?? template.actionVerb),
    description: isAcceptance
      ? 'They made you an offer. Taking it means starting again somewhere new.'
      : template.description,
    cost,
    signals: pipeline ? generateSignals(state, template).slice(0, 3) : generateSignals(state, template),
    expiresIn: Math.max(0, offer.expiresAfterTurn - state.turn + 1),
    isCommitment: Boolean(offer.pipelineId),
  }

  if (multiplier > 1) view.inflatedFrom = offer.baseCost
  if (pipeline) view.pipelineSummary = summarisePipeline(pipeline, content)

  return view
}

export function describeOffers(state: CampaignState, content: Content): OfferView[] {
  const views = state.offers.map((offer) => describeOffer(state, offer, content))
  // Commitments first: they are obligations, not offers.
  return [...views.filter((v) => v.isCommitment), ...views.filter((v) => !v.isCommitment)]
}
