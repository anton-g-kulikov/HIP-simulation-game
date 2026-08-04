/**
 * The declarative effect interpreter (ADR-009).
 *
 * Content describes what an outcome does; this module is the only place that
 * knows how to do it. Every effect also produces a player-facing change line,
 * written to the copy rules in HIP_Content_Spec.md §6: no RPG language, and no
 * numbers except money.
 */

import type { GameTuning } from '@content/schema'
import { gainCapital, applyRaise } from './capital'
import { recordObservation } from './fit'
import { clamp } from './util'
import type { CampaignState, Effect } from './types'

export type EffectContext = {
  turn: number
  pipelineId?: string
  tuning: GameTuning
}

export type EffectOutcome = {
  state: CampaignState
  changes: string[]
}

const CAPITAL_PHRASES: Record<string, { up: string; down: string }> = {
  'capability.technical': {
    up: 'Your technical depth improved.',
    down: 'Your technical edge dulled a little.',
  },
  'capability.execution': {
    up: 'You got better at getting things done.',
    down: 'Your execution slipped.',
  },
  'capability.communication': {
    up: 'You got better at explaining your work.',
    down: 'You are out of practice explaining your work.',
  },
  'capability.leadership': {
    up: 'You are more comfortable leading.',
    down: 'You had less chance to lead.',
  },
  evidence: {
    up: 'Your record of results got stronger.',
    down: 'Your record of results looks thinner.',
  },
  reputation: {
    up: 'More people know what you work on.',
    down: 'You dropped out of view a little.',
  },
  network: { up: 'Your network grew.', down: 'Some connections went cold.' },
  influence: { up: 'You have more say in what happens.', down: 'You have less say than you did.' },
  causeKnowledge: {
    up: 'You understand the problem better.',
    down: 'You have fallen behind the problem.',
  },
}

function formatMoney(amount: number): string {
  return Math.round(amount).toLocaleString('en-US')
}

/**
 * Post-job-change ramp: for a couple of turns after switching roles, execution
 * and evidence accrue more slowly. This is what makes accepting every offer a
 * real cost rather than a free upgrade (balance invariant 9).
 */
function rampFactor(state: CampaignState, target: string, tuning: GameTuning): number {
  if (state.player.rampTurnsLeft <= 0) return 1
  if (target === 'evidence') return tuning.hiring.rampEvidenceFactor
  if (target === 'capability.execution') return tuning.hiring.rampExecutionFactor
  return 1
}

export function applyEffect(
  state: CampaignState,
  effect: Effect,
  context: EffectContext,
): EffectOutcome {
  const player = state.player
  const changes: string[] = []

  switch (effect.op) {
    case 'capital': {
      const amount = effect.amount * rampFactor(state, effect.target, context.tuning)
      if (amount === 0) return { state, changes }
      const capital = gainCapital(player.capital, effect.target, amount)
      const phrase = CAPITAL_PHRASES[effect.target]
      if (phrase) changes.push(amount > 0 ? phrase.up : phrase.down)
      return { state: { ...state, player: { ...player, capital } }, changes }
    }

    case 'finance': {
      if (effect.target === 'monthlyComp') {
        const next =
          effect.mode === 'set'
            ? effect.amount
            : effect.mode === 'multiply'
              ? player.finance.monthlyComp * effect.amount
              : player.finance.monthlyComp + effect.amount
        const finance = applyRaise(player.finance, next)
        changes.push(`Your pay is now ${formatMoney(finance.monthlyComp)} a month.`)
        if (finance.monthlyBurn > player.finance.monthlyBurn) {
          changes.push('Some of the rise disappeared into how you live.')
        }
        return { state: { ...state, player: { ...player, finance } }, changes }
      }
      const savings =
        effect.mode === 'set'
          ? effect.amount
          : effect.mode === 'multiply'
            ? player.finance.savings * effect.amount
            : player.finance.savings + effect.amount
      changes.push(
        effect.amount < 0 && effect.mode === 'add'
          ? `Your savings dropped by ${formatMoney(Math.abs(effect.amount))}.`
          : `Your savings are now ${formatMoney(Math.max(0, savings))}.`,
      )
      return {
        state: {
          ...state,
          player: { ...player, finance: { ...player.finance, savings: Math.max(0, savings) } },
        },
        changes,
      }
    }

    case 'observeFit': {
      // Deliberately silent: fit is learned by noticing, not by being told.
      const fitObservations = recordObservation(
        player.fitObservations,
        effect.axis,
        effect.strength,
        context.turn,
      )
      return { state: { ...state, player: { ...player, fitObservations } }, changes }
    }

    case 'market': {
      const hiring = clamp(
        state.market.hiring + effect.amount,
        context.tuning.market.min,
        context.tuning.market.max,
      )
      return { state: { ...state, market: { hiring } }, changes }
    }

    case 'energy': {
      changes.push(
        effect.amount < 0
          ? 'You have less to give for a while.'
          : 'You have a little more in the tank.',
      )
      return {
        state: {
          ...state,
          player: {
            ...player,
            energyModifier: player.energyModifier + effect.amount,
            energyModifierTurnsLeft: Math.max(player.energyModifierTurnsLeft, effect.turns),
          },
        },
        changes,
      }
    }

    case 'unlock': {
      if (state.unlockedTemplateIds.includes(effect.template)) return { state, changes }
      changes.push('Something new opened up.')
      return {
        state: { ...state, unlockedTemplateIds: [...state.unlockedTemplateIds, effect.template] },
        changes,
      }
    }

    case 'role': {
      const current = player.role[effect.target]
      const value = clamp(effect.mode === 'set' ? effect.amount : current + effect.amount, 0, 1)
      if (effect.target === 'managerQuality') {
        changes.push(
          value < current ? 'Your support inside the company got thinner.' : 'You have better backing internally.',
        )
      } else {
        changes.push(value < current ? 'The company is on shakier ground.' : 'The company is doing better.')
      }
      return {
        state: { ...state, player: { ...player, role: { ...player.role, [effect.target]: value } } },
        changes,
      }
    }

    case 'visibleWork': {
      const pipeline = state.pipelines.find((p) => p.kind === 'employer')
      if (!pipeline) return { state, changes }
      const visibility =
        context.tuning.employer.visibilityBase +
        context.tuning.employer.visibilityFromManager * player.role.managerQuality
      const current = Number(pipeline.data.visibleWork ?? 0)
      const next = Math.max(0, current + effect.amount * visibility)
      changes.push(
        effect.amount > 0 ? 'The right people saw what you did.' : 'That work went unnoticed.',
      )
      return {
        state: {
          ...state,
          pipelines: state.pipelines.map((p) =>
            p.id === pipeline.id ? { ...p, data: { ...p.data, visibleWork: next } } : p,
          ),
        },
        changes,
      }
    }

    case 'seniority': {
      changes.push(effect.amount > 0 ? 'Your scope widened.' : 'Your scope narrowed.')
      return {
        state: {
          ...state,
          player: { ...player, seniority: clamp(player.seniority + effect.amount, 0, 1) },
        },
        changes,
      }
    }

    case 'pipeline': {
      // Stage transitions are driven by the pipeline modules during resolution;
      // a content-level pipeline effect only closes things down.
      if (effect.action === 'close' && context.pipelineId) {
        return {
          state: {
            ...state,
            pipelines: state.pipelines.map((p) =>
              p.id === context.pipelineId ? { ...p, closed: true } : p,
            ),
          },
          changes,
        }
      }
      return { state, changes }
    }
  }
}

export function applyEffects(
  state: CampaignState,
  effects: readonly Effect[],
  context: EffectContext,
): EffectOutcome {
  let current = state
  const changes: string[] = []
  for (const effect of effects) {
    const result = applyEffect(current, effect, context)
    current = result.state
    changes.push(...result.changes)
  }
  return { state: current, changes: [...new Set(changes)] }
}
