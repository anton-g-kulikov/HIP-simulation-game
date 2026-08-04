/**
 * Scripted strategies for the balance harness.
 *
 * Each policy is a deterministic function of state plus a seeded rng, so a
 * policy run on seed N always plays the same campaign. That is what makes
 * paired-seed comparison meaningful: two policies can be compared on the same
 * world rather than on two different ones.
 */

import type { Content } from '@content/loader'
import { describeOffers, effectiveBudget, ACTION_CATEGORIES } from '@engine/index'
import type { Rng } from '@engine/rng'
import type { ActionCategory, Allocation, CampaignState, OfferView } from '@engine/types'

export type Policy = {
  name: string
  choose: (state: CampaignState, content: Content, rng: Rng) => Allocation
}

type Picker = (views: OfferView[], budget: number, rng: Rng) => Allocation

/** Greedily fill the budget from an already-ordered list of candidates. */
function fill(
  views: OfferView[],
  budget: number,
  effortFor: (view: OfferView, remaining: number) => number,
): Allocation {
  const allocation: Allocation = {}
  let remaining = budget

  for (const view of views) {
    if (remaining <= 0) break
    const { offer } = view

    // Cost per unit of effort, so scalable actions price correctly under heat.
    const unit = offer.shape === 'fixed' ? view.cost / offer.minEnergy : view.cost / offer.minEnergy
    const wanted = effortFor(view, remaining)
    if (wanted < offer.minEnergy) continue

    const effort = Math.min(wanted, offer.maxEnergy)
    const charge = Math.ceil(effort * unit)
    if (charge > remaining) {
      // Try the largest affordable effort instead of skipping outright.
      const affordable = Math.floor(remaining / unit)
      if (affordable < offer.minEnergy) continue
      allocation[offer.id] = affordable
      remaining -= Math.ceil(affordable * unit)
      continue
    }

    allocation[offer.id] = effort
    remaining -= charge
  }

  return allocation
}

function policy(name: string, pick: Picker): Policy {
  return {
    name,
    choose: (state, content, rng) =>
      pick(describeOffers(state, content), effectiveBudget(state.player.energyModifier), rng),
  }
}

function ofCategory(views: OfferView[], category: ActionCategory): OfferView[] {
  // Commitments first: an unattended pipeline lapses, which no policy wants.
  const inCategory = views.filter((v) => v.offer.category === category)
  return [...inCategory.filter((v) => v.isCommitment), ...inCategory.filter((v) => !v.isCommitment)]
}

export function allIn(category: ActionCategory): Policy {
  return policy(`allIn:${category}`, (views, budget) =>
    fill(ofCategory(views, category), budget, (view) => view.offer.maxEnergy),
  )
}

/** Rotates categories and prefers whatever is currently coolest. */
export const diversified: Policy = {
  name: 'diversified',
  choose: (state, content) => {
    const views = describeOffers(state, content)
    const budget = effectiveBudget(state.player.energyModifier)

    const byHeat = [...ACTION_CATEGORIES].sort(
      (a, b) => state.player.heat[a] - state.player.heat[b],
    )
    const ordered = [
      ...views.filter((v) => v.isCommitment),
      ...byHeat.flatMap((category) => ofCategory(views, category).filter((v) => !v.isCommitment)),
    ]

    // A credible effort rather than a maximal one: spec §4.2's "strong effort".
    return fill(ordered, budget, (view) => Math.min(5, view.offer.maxEnergy))
  },
}

/** Always takes whatever looks best on the surface. */
export const greedy = policy('greedy', (views, budget) => {
  // Keyed to the signal vocabulary in src/engine/signals.ts. Worth re-checking
  // whenever that wording changes: this scored zero on its main term for a
  // while because it looked for a phrase the game could not produce.
  const score = (view: OfferView) =>
    (view.signals.includes('Well matched to your experience') ? 2 : 0) +
    (view.signals.includes('Unusually strong learning potential') ? 1 : 0) -
    (view.signals.includes('Crowded applicant pool') ? 1 : 0) -
    (view.signals.includes('A stretch from where you are') ? 1 : 0)

  const ordered = [
    ...views.filter((v) => v.isCommitment),
    ...views.filter((v) => !v.isCommitment).sort((a, b) => score(b) - score(a)),
  ]
  return fill(ordered, budget, (view) => Math.min(5, view.offer.maxEnergy))
})

export const random = policy('random', (views, budget, rng) => {
  const shuffled = [...views].sort(() => rng.next() - 0.5)
  return fill(shuffled, budget, (view) =>
    rng.int(view.offer.minEnergy, view.offer.maxEnergy),
  )
})

export const idle: Policy = { name: 'idle', choose: () => ({}) }

/*
 * `shallow` and `deep` exist to isolate one variable: how much effort goes into
 * a single action. Both are therefore restricted to scalable cards, where the
 * player actually has that choice. An earlier version let them take fixed-cost
 * cards too, which meant "shallow" was quietly taking half its actions at full
 * effectiveness and the comparison measured nothing.
 */
const scalableOnly = (views: OfferView[]) =>
  views.filter((v) => v.offer.shape === 'scalable' && !v.isCommitment)

/** Spreads the budget one point at a time — the dabbling strategy. */
export const shallow = policy('shallow', (views, budget) =>
  fill(scalableOnly(views), budget, (view) => view.offer.minEnergy),
)

/** Concentrates a credible effort on few things. */
export const deep = policy('deep', (views, budget) =>
  fill(scalableOnly(views), budget, (view) => Math.min(5, view.offer.maxEnergy)),
)

/** Pours everything into one action, including the wasteful last points. */
export const overinvest = policy('overinvest', (views, budget) =>
  fill(views.slice(0, 1), budget, (view) => view.offer.maxEnergy),
)

export const studyOnly: Policy = {
  name: 'studyOnly',
  choose: (state, content) => {
    const views = describeOffers(state, content)
    const budget = effectiveBudget(state.player.energyModifier)
    const study = views.filter(
      (v) =>
        v.offer.category === 'learning' &&
        !content.opportunityById[v.offer.templateId]?.tags.includes(content.tuning.learning.applyTag),
    )
    return fill(study, budget, (view) => Math.min(5, view.offer.maxEnergy))
  },
}

export const studyThenApply: Policy = {
  name: 'studyThenApply',
  choose: (state, content) => {
    const views = describeOffers(state, content)
    const budget = effectiveBudget(state.player.energyModifier)
    const applyTag = content.tuning.learning.applyTag

    const applying = views.filter((v) =>
      content.opportunityById[v.offer.templateId]?.tags.includes(applyTag),
    )
    const studying = views.filter(
      (v) =>
        v.offer.category === 'learning' &&
        !content.opportunityById[v.offer.templateId]?.tags.includes(applyTag),
    )

    // Apply whenever the card is on the table; study otherwise.
    return fill([...applying, ...studying], budget, (view) => Math.min(5, view.offer.maxEnergy))
  },
}

/** Pursues and accepts every role that appears. */
export const acceptEverything = policy('acceptEverything', (views, budget) => {
  const hiring = ofCategory(views, 'job_search')
  const rest = views.filter((v) => v.offer.category !== 'job_search')
  return fill([...hiring, ...rest], budget, (view) => Math.min(5, view.offer.maxEnergy))
})

/** The nine policies compared for the no-dominant-strategy invariants. */
export const CORE_POLICIES: Policy[] = [
  ...ACTION_CATEGORIES.map(allIn),
  diversified,
  greedy,
  random,
  idle,
]

export const ALL_POLICIES: Policy[] = [
  ...CORE_POLICIES,
  shallow,
  deep,
  overinvest,
  studyOnly,
  studyThenApply,
  acceptEverything,
]
