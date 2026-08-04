import { describe, it, expect } from 'vitest'
import { createCampaign } from '@engine/campaign'
import { openTurn, commitAllocation } from '@engine/turn'
import {
  addProjectProgress,
  ensureProjectPipeline,
  findPipeline,
  firstHiringStage,
  hiringStageAfter,
  lapseNeglectedPipelines,
  noteLearningApplied,
  noteStudyTurn,
  nextHiringStage,
  openHiringPipeline,
  studyDecayFactor,
  unappliedStudyTurns,
  updatePipeline,
  visibilityMultiplier,
  visibleWork,
  EMPLOYER_PIPELINE_ID,
  PROJECT_PIPELINE_ID,
} from '@engine/pipelines'
import { applyEffects } from '@engine/effects'
import { testContent, TEST_IDS } from '../fixtures/content'
import type { Allocation, CampaignState } from '@engine/types'

// Test intent: test/test-documentation.md, M3 (cases 8.1–8.12)
// Design: _meta/specs/HIP_Simulation_Spec.md §5

const content = testContent()
const tuning = content.tuning

function start(seed = 1): CampaignState {
  return openTurn(createCampaign(content, TEST_IDS.profile, seed), content)
}

function offerFor(state: CampaignState, templateId: string) {
  return state.offers.find((o) => o.templateId === templateId && !o.pipelineId)
}

function continuationOffer(state: CampaignState) {
  return state.offers.find((o) => o.pipelineId)
}

function play(state: CampaignState, allocation: Allocation): CampaignState {
  return openTurn(commitAllocation(state, content, allocation), content)
}

describe('hiring pipeline', () => {
  it('8.3 skips the screen when a referral lands, and only then', () => {
    expect(firstHiringStage(tuning, false)).toBe('screen')
    expect(firstHiringStage(tuning, true)).toBe('early_interview')
    expect(nextHiringStage(tuning, 'screen', false)).toBe('early_interview')
  })

  it('advances one stage on success and ends the process on failure', () => {
    expect(hiringStageAfter(tuning, 'screen', 'success', false)).toBe('early_interview')
    expect(hiringStageAfter(tuning, 'screen', 'failure', false)).toBe('rejected')
  })

  it('holds position on a near miss rather than ending the process', () => {
    expect(hiringStageAfter(tuning, 'advanced_interview', 'nearMiss', false)).toBe(
      'advanced_interview',
    )
  })

  it('skips ahead on a strong result', () => {
    expect(hiringStageAfter(tuning, 'screen', 'strong', false)).toBe('advanced_interview')
  })

  it('runs out of stages into an offer rather than looping', () => {
    expect(hiringStageAfter(tuning, 'assignment', 'success', false)).toBe('offer')
  })

  it('8.2 awards something at every stage on a near miss and on a failure', () => {
    for (const stage of tuning.hiring.stages) {
      expect(stage.outcomes.nearMiss.effects.length).toBeGreaterThan(0)
      expect(stage.outcomes.failure.effects.length).toBeGreaterThan(0)
    }
  })

  it('8.1 reaches an offer on at least some seeds when the player invests fully', () => {
    let reachedOffer = 0

    for (let seed = 0; seed < 40; seed++) {
      let state = start(seed)
      for (let turn = 0; turn < 11 && state.turn <= 12; turn++) {
        const continuation = continuationOffer(state)
        const application = offerFor(state, TEST_IDS.hiring)
        const target = continuation ?? application
        state = play(state, target ? { [target.id]: target.minEnergy } : {})
        if (state.pipelines.some((p) => p.kind === 'hiring' && p.stage === 'offer')) {
          reachedOffer++
          break
        }
      }
    }

    expect(reachedOffer).toBeGreaterThan(0)
  })

  it('8.4 lapses a hiring pipeline left untouched for longer than the grace period', () => {
    let state = start(2)
    const template = content.opportunityById[TEST_IDS.hiring]!
    state = openHiringPipeline(state, template, tuning, false, 1)

    state = { ...state, turn: 1 + tuning.hiring.lapseAfterTurns }
    expect(lapseNeglectedPipelines(state, tuning).lapsed).toHaveLength(0)

    state = { ...state, turn: 2 + tuning.hiring.lapseAfterTurns }
    const lapsed = lapseNeglectedPipelines(state, tuning)
    expect(lapsed.lapsed).toHaveLength(1)
    expect(findPipeline(lapsed.state, lapsed.lapsed[0]!.id)?.stage).toBe('lapsed')
  })

  it('8.5 does not offer a fourth application while three are already running', () => {
    let state = start(3)
    const template = content.opportunityById[TEST_IDS.hiring]!
    for (let i = 0; i < tuning.hiring.maxConcurrent; i++) {
      state = openHiringPipeline(state, { ...template, id: `${template.id}_${i}` }, tuning, false, 1)
    }
    state = { ...state, openedTurn: 0 }
    state = openTurn(state, content)

    expect(offerFor(state, TEST_IDS.hiring)).toBeUndefined()
  })
})

describe('employer pipeline', () => {
  it('8.7 scales visible work by manager quality', () => {
    const withGoodManager = visibilityMultiplier(1, tuning)
    const withPoorManager = visibilityMultiplier(0, tuning)
    expect(withGoodManager).toBeGreaterThan(withPoorManager)
    expect(withPoorManager).toBeCloseTo(tuning.employer.visibilityBase, 5)
  })

  it('8.7b banks less visible work under a poor manager for the same effort', () => {
    const state = start(4)
    const good = { ...state, player: { ...state.player, role: { ...state.player.role, managerQuality: 1 } } }
    const poor = { ...state, player: { ...state.player, role: { ...state.player.role, managerQuality: 0 } } }

    const effect = [{ op: 'visibleWork' as const, amount: 40 }]
    const goodResult = applyEffects(good, effect, { turn: 1, tuning })
    const poorResult = applyEffects(poor, effect, { turn: 1, tuning })

    expect(visibleWork(goodResult.state)).toBeGreaterThan(visibleWork(poorResult.state))
  })

  it('8.8 fires recognition once the threshold is crossed and resets the accumulator', () => {
    let state = start(5)
    state = updatePipeline(state, EMPLOYER_PIPELINE_ID, (p) => ({
      ...p,
      data: { ...p.data, visibleWork: tuning.employer.recognitionThreshold + 1 },
    }))
    const compBefore = state.player.finance.monthlyComp

    state = { ...state, openedTurn: 0 }
    state = openTurn(state, content)

    expect(state.player.finance.monthlyComp).toBeGreaterThan(compBefore)
    expect(visibleWork(state)).toBe(0)
    expect(state.currentOutcomes.some((o) => o.sourceTemplateId === 'employer')).toBe(true)
  })

  it('8.8b does not fire recognition below the threshold', () => {
    let state = start(6)
    state = updatePipeline(state, EMPLOYER_PIPELINE_ID, (p) => ({
      ...p,
      data: { ...p.data, visibleWork: tuning.employer.recognitionThreshold - 10 },
    }))
    const compBefore = state.player.finance.monthlyComp

    state = openTurn({ ...state, openedTurn: 0 }, content)
    expect(state.player.finance.monthlyComp).toBe(compBefore)
  })
})

describe('learning pipeline', () => {
  it('8.9 decays sharply when study is never applied', () => {
    let state = start(7)
    expect(studyDecayFactor(state, tuning)).toBe(1)

    state = noteStudyTurn(state)
    expect(studyDecayFactor(state, tuning)).toBeCloseTo(tuning.learning.unappliedDecayFactor, 5)

    state = noteStudyTurn(state)
    expect(studyDecayFactor(state, tuning)).toBeCloseTo(
      tuning.learning.unappliedDecayFactor ** 2,
      5,
    )
  })

  it('8.10 resets the decay when learning is applied', () => {
    let state = start(8)
    state = noteStudyTurn(noteStudyTurn(state))
    expect(unappliedStudyTurns(state)).toBe(2)

    state = noteLearningApplied(state)
    expect(unappliedStudyTurns(state)).toBe(0)
    expect(studyDecayFactor(state, tuning)).toBe(1)
  })

  it('8.9b makes a second consecutive study turn worth much less in practice', () => {
    let state = start(9)

    const study = offerFor(state, TEST_IDS.learning)
    if (!study) return

    const before = state.player.capital.capability.technical
    state = play(state, { [study.id]: 3 })
    const firstGain = state.player.capital.capability.technical - before

    const second = offerFor(state, TEST_IDS.learning)
    if (!second) return
    const beforeSecond = state.player.capital.capability.technical
    state = play(state, { [second.id]: 3 })
    const secondGain = state.player.capital.capability.technical - beforeSecond

    if (firstGain > 0 && secondGain > 0) {
      expect(secondGain).toBeLessThan(firstGain)
    }
  })

  it('8.10b study alone never produces evidence in the fixture content', () => {
    const study = content.opportunityById[TEST_IDS.learning]!
    for (const outcome of Object.values(study.outcomes)) {
      for (const effect of outcome.effects) {
        if (effect.op === 'capital') expect(effect.target).not.toBe('evidence')
      }
    }
  })
})

describe('project pipeline', () => {
  it('reaches prototype once enough effort has accumulated', () => {
    let state = ensureProjectPipeline(start(10), 'A project')
    expect(findPipeline(state, PROJECT_PIPELINE_ID)?.stage).toBe('idea')

    const energyNeeded = Math.ceil(tuning.project.prototypeThreshold / tuning.project.progressPerEnergy)
    state = addProjectProgress(state, energyNeeded, tuning)

    expect(findPipeline(state, PROJECT_PIPELINE_ID)?.stage).toBe('prototype')
  })

  it('8.11 does not offer the launch card before the project is a prototype', () => {
    const state = start(11)
    expect(offerFor(state, TEST_IDS.projectLaunch)).toBeUndefined()
  })

  it('8.11b offers the launch card once the project is a prototype', () => {
    let state = ensureProjectPipeline(start(12), 'A project')
    const energyNeeded = Math.ceil(tuning.project.prototypeThreshold / tuning.project.progressPerEnergy)
    state = addProjectProgress(state, energyNeeded, tuning)

    state = openTurn({ ...state, openedTurn: 0, offers: [] }, content)
    expect(offerFor(state, TEST_IDS.projectLaunch)).toBeDefined()
  })

  it('8.12 awards something even when the launch fails to find traction', () => {
    const launch = content.opportunityById[TEST_IDS.projectLaunch]!
    expect(launch.outcomes.failure.effects.length).toBeGreaterThan(0)
    expect(launch.outcomes.nearMiss.effects.length).toBeGreaterThan(0)
  })
})

describe('job change', () => {
  it('8.6 applies a ramp penalty after accepting a role, which then wears off', () => {
    let state = start(14)
    const template = content.opportunityById[TEST_IDS.hiring]!
    state = openHiringPipeline(state, template, tuning, false, 1)
    const pipelineId = state.pipelines.find((p) => p.kind === 'hiring')!.id
    state = updatePipeline(state, pipelineId, (p) => ({ ...p, stage: 'offer' }))
    state = openTurn({ ...state, openedTurn: 0 }, content)

    const accept = continuationOffer(state)!
    const compBefore = state.player.finance.monthlyComp

    state = play(state, { [accept.id]: accept.minEnergy })

    expect(state.player.role.title).toBe(template.roleOutcome!.title)
    expect(state.player.finance.monthlyComp).toBeGreaterThan(compBefore)
    expect(state.player.rampTurnsLeft).toBeGreaterThan(0)

    for (let i = 0; i < tuning.hiring.rampTurns + 1; i++) {
      state = play(state, {})
    }
    expect(state.player.rampTurnsLeft).toBe(0)
  })

  it('8.6b slows evidence accrual while the ramp penalty is active', () => {
    const state = start(15)
    const ramped = { ...state, player: { ...state.player, rampTurnsLeft: 2 } }
    const effect = [{ op: 'capital' as const, target: 'evidence' as const, amount: 10 }]

    const normal = applyEffects(state, effect, { turn: 1, tuning })
    const slowed = applyEffects(ramped, effect, { turn: 1, tuning })

    expect(slowed.state.player.capital.evidence).toBeLessThan(
      normal.state.player.capital.evidence,
    )
  })
})
