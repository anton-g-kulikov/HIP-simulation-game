/**
 * The four persistent pipelines — design doc §8, spec §5.
 *
 * They are small enough to live together, and they share the same shape:
 * standing state on the campaign, advanced by player investment, resolved
 * through the common outcome function. Only hiring has a stage machine; the
 * other three are accumulators with a rule attached.
 */

import type { Content } from '@content/loader'
import type { GameTuning, HiringStageConfig, OpportunityTemplate } from '@content/schema'
import type { CampaignState, Pipeline, PipelineKind, ResultBand } from '../types'

export const EMPLOYER_PIPELINE_ID = 'pipeline_employer'
export const LEARNING_PIPELINE_ID = 'pipeline_learning'

/** Present from turn 1: the player already has a job and a learning habit. */
export function createStandingPipelines(turn: number): Pipeline[] {
  return [
    {
      id: EMPLOYER_PIPELINE_ID,
      kind: 'employer',
      templateId: '',
      title: 'Your current job',
      stage: 'ongoing',
      investedEnergy: 0,
      lastInvestedTurn: turn,
      openedTurn: turn,
      closed: false,
      data: { visibleWork: 0 },
    },
    {
      id: LEARNING_PIPELINE_ID,
      kind: 'learning',
      templateId: '',
      title: 'What you are learning',
      stage: 'study',
      investedEnergy: 0,
      lastInvestedTurn: turn,
      openedTurn: turn,
      closed: false,
      data: { unappliedStudyTurns: 0 },
    },
  ]
}

export function findPipeline(state: CampaignState, id: string): Pipeline | undefined {
  return state.pipelines.find((p) => p.id === id)
}

export function pipelinesOfKind(state: CampaignState, kind: PipelineKind): Pipeline[] {
  return state.pipelines.filter((p) => p.kind === kind && !p.closed)
}

export function updatePipeline(
  state: CampaignState,
  id: string,
  update: (pipeline: Pipeline) => Pipeline,
): CampaignState {
  return {
    ...state,
    pipelines: state.pipelines.map((p) => (p.id === id ? update(p) : p)),
  }
}

// ---------------------------------------------------------------- hiring

export const HIRING_ACTIVE_STAGES = ['screen', 'early_interview', 'advanced_interview', 'assignment']
export const HIRING_TERMINAL_STAGES = ['accepted', 'rejected', 'lapsed', 'declined']

export function hiringStageConfig(
  tuning: GameTuning,
  stage: string,
): HiringStageConfig | undefined {
  return tuning.hiring.stages.find((s) => s.stage === stage)
}

/**
 * A referral skips the screen outright and adds a bonus to the next check —
 * the mechanical form of design doc §8.1's "network access" variable.
 */
export function nextHiringStage(tuning: GameTuning, stage: string, hasReferral: boolean): string {
  const stages = tuning.hiring.stages.map((s) => s.stage)
  const index = stages.indexOf(stage)
  if (index === -1) return 'offer'
  let nextIndex = index + 1
  if (hasReferral && stages[nextIndex] === 'screen') nextIndex += 1
  return stages[nextIndex] ?? 'offer'
}

export function firstHiringStage(tuning: GameTuning, hasReferral: boolean): string {
  const stages = tuning.hiring.stages.map((s) => s.stage)
  if (hasReferral && stages[0] === 'screen') return stages[1] ?? 'offer'
  return stages[0] ?? 'offer'
}

export function countActiveHiring(state: CampaignState): number {
  return state.pipelines.filter(
    (p) => p.kind === 'hiring' && !p.closed && !HIRING_TERMINAL_STAGES.includes(p.stage),
  ).length
}

export function openHiringPipeline(
  state: CampaignState,
  template: OpportunityTemplate,
  tuning: GameTuning,
  hasReferral: boolean,
  turn: number,
): CampaignState {
  const pipeline: Pipeline = {
    id: `hiring_${template.id}_${turn}`,
    kind: 'hiring',
    templateId: template.id,
    title: template.title,
    stage: firstHiringStage(tuning, hasReferral),
    investedEnergy: 0,
    lastInvestedTurn: turn,
    openedTurn: turn,
    closed: false,
    data: { referral: hasReferral ? 1 : 0 },
  }
  return { ...state, pipelines: [...state.pipelines, pipeline] }
}

/**
 * Stage transition on a resolved check. A near miss holds position rather than
 * ending the process, which is what makes "you reached the final round" a real
 * and instructive outcome rather than a consolation message.
 */
export function hiringStageAfter(
  tuning: GameTuning,
  stage: string,
  band: ResultBand,
  hasReferral: boolean,
): string {
  if (band === 'failure') return 'rejected'
  if (band === 'nearMiss') return stage
  const next = nextHiringStage(tuning, stage, hasReferral)
  // A strong result skips a stage where one remains to skip.
  if (band === 'strong' && next !== 'offer') {
    return nextHiringStage(tuning, next, hasReferral)
  }
  return next
}

/** Pipelines the player has stopped feeding close on their own, with a message. */
export function lapseNeglectedPipelines(
  state: CampaignState,
  tuning: GameTuning,
): { state: CampaignState; lapsed: Pipeline[] } {
  const lapsed: Pipeline[] = []
  const pipelines = state.pipelines.map((pipeline) => {
    if (pipeline.kind !== 'hiring' || pipeline.closed) return pipeline
    if (HIRING_TERMINAL_STAGES.includes(pipeline.stage)) return pipeline
    if (state.turn - pipeline.lastInvestedTurn <= tuning.hiring.lapseAfterTurns) return pipeline
    lapsed.push(pipeline)
    return { ...pipeline, stage: 'lapsed', closed: true }
  })
  return { state: { ...state, pipelines }, lapsed }
}

// ---------------------------------------------------------------- employer

export function visibilityMultiplier(managerQuality: number, tuning: GameTuning): number {
  return tuning.employer.visibilityBase + tuning.employer.visibilityFromManager * managerQuality
}

export function visibleWork(state: CampaignState): number {
  return Number(findPipeline(state, EMPLOYER_PIPELINE_ID)?.data.visibleWork ?? 0)
}

export function decayVisibleWork(state: CampaignState, tuning: GameTuning): CampaignState {
  return updatePipeline(state, EMPLOYER_PIPELINE_ID, (pipeline) => ({
    ...pipeline,
    data: {
      ...pipeline.data,
      visibleWork: Number(pipeline.data.visibleWork ?? 0) * (1 - tuning.employer.visibleWorkDecayPerTurn),
    },
  }))
}

export function resetVisibleWork(state: CampaignState): CampaignState {
  return updatePipeline(state, EMPLOYER_PIPELINE_ID, (pipeline) => ({
    ...pipeline,
    data: { ...pipeline.data, visibleWork: 0 },
  }))
}

// ---------------------------------------------------------------- learning

export function unappliedStudyTurns(state: CampaignState): number {
  return Number(findPipeline(state, LEARNING_PIPELINE_ID)?.data.unappliedStudyTurns ?? 0)
}

/**
 * Design doc §8.3: learning without application has sharply diminishing value.
 * The first study turn is worth full value; each consecutive unapplied one is
 * worth a fraction of the last.
 */
export function studyDecayFactor(state: CampaignState, tuning: GameTuning): number {
  return Math.pow(tuning.learning.unappliedDecayFactor, unappliedStudyTurns(state))
}

export function noteStudyTurn(state: CampaignState): CampaignState {
  return updatePipeline(state, LEARNING_PIPELINE_ID, (pipeline) => ({
    ...pipeline,
    data: {
      ...pipeline.data,
      unappliedStudyTurns: Number(pipeline.data.unappliedStudyTurns ?? 0) + 1,
    },
  }))
}

export function noteLearningApplied(state: CampaignState): CampaignState {
  return updatePipeline(state, LEARNING_PIPELINE_ID, (pipeline) => ({
    ...pipeline,
    data: { ...pipeline.data, unappliedStudyTurns: 0 },
  }))
}

// ---------------------------------------------------------------- project

export const PROJECT_PIPELINE_ID = 'pipeline_project'

export function ensureProjectPipeline(state: CampaignState, title: string): CampaignState {
  if (findPipeline(state, PROJECT_PIPELINE_ID)) return state
  const pipeline: Pipeline = {
    id: PROJECT_PIPELINE_ID,
    kind: 'project',
    templateId: '',
    title,
    stage: 'idea',
    investedEnergy: 0,
    lastInvestedTurn: state.turn,
    openedTurn: state.turn,
    closed: false,
    data: { progress: 0 },
  }
  return { ...state, pipelines: [...state.pipelines, pipeline] }
}

export function addProjectProgress(
  state: CampaignState,
  energy: number,
  tuning: GameTuning,
): CampaignState {
  return updatePipeline(state, PROJECT_PIPELINE_ID, (pipeline) => {
    const progress = Number(pipeline.data.progress ?? 0) + energy * tuning.project.progressPerEnergy
    const stage =
      pipeline.stage === 'idea' && progress >= tuning.project.prototypeThreshold
        ? 'prototype'
        : pipeline.stage
    return { ...pipeline, stage, data: { ...pipeline.data, progress } }
  })
}

export function projectStage(state: CampaignState): string | undefined {
  return findPipeline(state, PROJECT_PIPELINE_ID)?.stage
}

/** Human-readable one-liner for the pipeline row in the UI. */
export function summarisePipeline(pipeline: Pipeline, content: Content): string {
  switch (pipeline.kind) {
    case 'hiring': {
      const config = hiringStageConfig(content.tuning, pipeline.stage)
      if (config) return `${config.label} pending`
      if (pipeline.stage === 'offer') return 'Offer on the table'
      if (pipeline.stage === 'accepted') return 'Accepted'
      if (pipeline.stage === 'rejected') return 'They passed'
      if (pipeline.stage === 'lapsed') return 'Lapsed'
      return pipeline.stage
    }
    case 'employer': {
      const work = Number(pipeline.data.visibleWork ?? 0)
      const share = work / content.tuning.employer.recognitionThreshold
      if (share > 0.75) return 'Your recent work is being noticed'
      if (share > 0.35) return 'Some of your work has landed visibly'
      return 'Nothing much has landed visibly yet'
    }
    case 'learning': {
      const unapplied = Number(pipeline.data.unappliedStudyTurns ?? 0)
      if (unapplied === 0) return 'What you are learning is going into the work'
      if (unapplied === 1) return 'You have studied without using it yet'
      return 'You have been studying without applying any of it'
    }
    case 'project': {
      if (pipeline.stage === 'idea') return 'Early: an idea and some scaffolding'
      if (pipeline.stage === 'prototype') return 'Working prototype, not launched'
      if (pipeline.stage === 'launched') return 'Launched, waiting to see if anyone comes'
      if (pipeline.stage === 'traction') return 'People are using it'
      return 'Dormant'
    }
  }
}
