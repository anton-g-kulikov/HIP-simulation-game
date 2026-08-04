/**
 * End-of-campaign retrospective — design doc §13.2, Level 1 list.
 *
 * No score and no grade (ADR-008). The most useful thing it can show a player
 * is where their energy actually went, because seeing your own allocation
 * laid out is the fastest route to the lesson the game is trying to teach.
 */

import type { Content } from '@content/loader'
import { runwayMonths } from './capital'
import { describeAllFit } from './fit'
import { ACTION_CATEGORIES } from './energy'
import { summarisePipeline } from './pipelines'
import type { ActionCategory, CampaignState, OutcomeCard } from './types'

export type CategorySlice = {
  category: ActionCategory
  label: string
  energy: number
  share: number
  turnsUsed: number
}

export type TimelineEntry = {
  turn: number
  title: string
  detail: string
}

export type Retrospective = {
  turnsPlayed: number
  energyOffered: number
  energySpent: number
  energyUnused: number
  allocation: CategorySlice[]
  timeline: TimelineEntry[]
  capitalStart: Record<string, number>
  capitalEnd: Record<string, number>
  strongestResults: OutcomeCard[]
  untouched: string[]
  expiredUnused: number
  fitLearned: string[]
  openPaths: string[]
  finalRole: string
  monthlyComp: number
  runwayMonths: number
}

export const CATEGORY_LABELS: Record<ActionCategory, string> = {
  current_job: 'Current job',
  job_search: 'Job search',
  learning: 'Learning',
  project: 'Side project',
  network_public: 'Network & public work',
}

export function buildRetrospective(state: CampaignState, content: Content): Retrospective {
  const history = state.history
  const profile = content.profiles[state.player.profileId]

  const energyByCategory = {} as Record<ActionCategory, number>
  const turnsByCategory = {} as Record<ActionCategory, number>
  for (const category of ACTION_CATEGORIES) {
    energyByCategory[category] = 0
    turnsByCategory[category] = 0
  }

  let energySpent = 0
  let energyOffered = 0
  let expiredUnused = 0

  for (const record of history) {
    energyOffered += record.energyBudget
    energySpent += record.energySpent
    expiredUnused += record.offersExpiredUnused.length
    for (const allocation of record.allocations) {
      energyByCategory[allocation.category] += allocation.energy
    }
    for (const category of record.categoriesUsed) turnsByCategory[category] += 1
  }

  const allocation: CategorySlice[] = ACTION_CATEGORIES.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    energy: energyByCategory[category],
    share: energySpent > 0 ? energyByCategory[category] / energySpent : 0,
    turnsUsed: turnsByCategory[category],
  })).sort((a, b) => b.energy - a.energy)

  const allOutcomes = history.flatMap((record) => record.outcomes)
  const strongestResults = allOutcomes
    .filter((outcome) => outcome.band === 'strong')
    .slice(0, 4)

  const timeline: TimelineEntry[] = history
    .filter((record) => record.allocations.length > 0 || record.eventTemplateId)
    .map((record) => {
      const spent = record.allocations
        .map((a) => content.opportunityById[a.templateId]?.title ?? a.templateId)
        .join(' · ')
      const event = record.eventTemplateId
        ? content.eventById[record.eventTemplateId]?.narrative.headline
        : undefined
      return {
        turn: record.turn,
        title: spent || 'You held back this month.',
        detail: event ?? '',
      }
    })

  const untouched = allocation
    .filter((slice) => slice.energy === 0)
    .map((slice) => slice.label)

  const openPaths = state.pipelines
    .filter((pipeline) => !pipeline.closed)
    .map((pipeline) => `${pipeline.title}: ${summarisePipeline(pipeline, content)}`)

  const capitalStart: Record<string, number> = profile
    ? {
        Technical: profile.capital.capability.technical,
        Execution: profile.capital.capability.execution,
        Communication: profile.capital.capability.communication,
        Leadership: profile.capital.capability.leadership,
        Evidence: profile.capital.evidence,
        Reputation: profile.capital.reputation,
        Network: profile.capital.network,
      }
    : {}

  const capital = state.player.capital
  const capitalEnd: Record<string, number> = {
    Technical: capital.capability.technical,
    Execution: capital.capability.execution,
    Communication: capital.capability.communication,
    Leadership: capital.capability.leadership,
    Evidence: capital.evidence,
    Reputation: capital.reputation,
    Network: capital.network,
  }

  return {
    turnsPlayed: history.length,
    energyOffered,
    energySpent,
    energyUnused: energyOffered - energySpent,
    allocation,
    timeline,
    capitalStart,
    capitalEnd,
    strongestResults,
    untouched,
    expiredUnused,
    fitLearned: describeAllFit(state.player.hiddenFit, state.player.fitObservations).map(
      (entry) => entry.phrase,
    ),
    openPaths,
    finalRole: `${state.player.role.title}, ${state.player.role.org}`,
    monthlyComp: state.player.finance.monthlyComp,
    runwayMonths: runwayMonths(state.player.finance),
  }
}
