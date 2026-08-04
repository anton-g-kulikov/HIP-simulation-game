/**
 * A minimal but valid content set for engine tests.
 *
 * Deliberately separate from the authored game content: engine tests should
 * fail when the engine breaks, not when someone retunes an opportunity.
 */

import type { Content } from '@content/loader'
import { buildContent } from '@content/loader'
import type { OpportunityTemplate } from '@content/schema'

type Overrides = Partial<OpportunityTemplate> & { id: string }

export function opportunity(overrides: Overrides): unknown {
  const base = {
    kind: 'current_job',
    category: 'current_job',
    title: 'Test action',
    description: 'A test action.',
    availability: {
      stages: ['exploitation'],
      professions: ['software_engineering'],
      seniority: { min: 0, max: 1 },
      requires: [],
      baseWeight: 1,
    },
    cost: { shape: 'scalable', min: 1, max: 5 },
    expiry: { turns: 3 },
    check: {
      difficulty: 0.5,
      match: { 'capability.execution': 1 },
      fit: { deep_technical: 1 },
    },
    delay: { '1': 1 },
    outcomes: {
      strong: {
        headline: 'It went unusually well.',
        effects: [{ op: 'capital', target: 'evidence', amount: 8 }],
      },
      success: {
        headline: 'It went well.',
        effects: [{ op: 'capital', target: 'evidence', amount: 5 }],
      },
      nearMiss: {
        headline: 'It nearly landed.',
        effects: [{ op: 'capital', target: 'capability.execution', amount: 2 }],
      },
      failure: {
        headline: 'It did not land.',
        effects: [{ op: 'capital', target: 'capability.execution', amount: 1 }],
      },
    },
    signals: [],
    tags: [],
  }
  return { ...base, ...overrides }
}

export const testProfile = {
  id: 'test_profile',
  name: 'Test Profile',
  profession: 'software_engineering',
  blurb: 'A profile for tests.',
  seniority: 0.55,
  role: {
    title: 'Senior Engineer',
    org: 'A large technology company',
    orgQuality: 0.65,
    managerQuality: 0.55,
  },
  capital: {
    capability: { technical: 62, execution: 55, communication: 38, leadership: 30 },
    evidence: 45,
    reputation: 18,
    network: 32,
    influence: 5,
    causeKnowledge: 5,
  },
  finance: { monthlyComp: 14000, monthlyBurn: 7500, savings: 60000 },
  strongFitAxis: 'deep_technical',
}

const hiringRole = opportunity({
  id: 'test_hiring_role',
  kind: 'hiring',
  category: 'job_search',
  title: 'A role at another company',
  cost: { shape: 'fixed', base: 2 },
  check: {
    difficulty: 0.5,
    match: { 'capability.technical': 0.5, evidence: 0.5 },
    fit: { deep_technical: 1 },
  },
  roleOutcome: {
    title: 'Staff Engineer',
    org: 'Another large company',
    compMultiplier: 1.18,
    orgQuality: 0.7,
    managerQuality: 0.6,
    seniorityDelta: 0.1,
  },
} as unknown as Overrides)

const learningStudy = opportunity({
  id: 'test_learning',
  kind: 'learning',
  category: 'learning',
  title: 'Study something',
  outcomes: {
    strong: {
      headline: 'You learned a great deal.',
      effects: [{ op: 'capital', target: 'capability.technical', amount: 8 }],
    },
    success: {
      headline: 'You learned something.',
      effects: [{ op: 'capital', target: 'capability.technical', amount: 5 }],
    },
    nearMiss: {
      headline: 'Some of it stuck.',
      effects: [{ op: 'capital', target: 'capability.technical', amount: 2 }],
    },
    failure: {
      headline: 'Little of it stuck.',
      effects: [{ op: 'capital', target: 'capability.technical', amount: 1 }],
    },
  },
} as unknown as Overrides)

const learningApply = opportunity({
  id: 'test_learning_apply',
  kind: 'learning',
  category: 'learning',
  title: 'Apply what you learned at work',
  cost: { shape: 'fixed', base: 3 },
  tags: ['applies_learning'],
} as unknown as Overrides)

const projectWork = opportunity({
  id: 'test_project',
  kind: 'project',
  category: 'project',
  title: 'Work on a side project',
  cost: { shape: 'scalable', min: 1, max: 8 },
} as unknown as Overrides)

const projectLaunch = opportunity({
  id: 'test_project_launch',
  kind: 'project',
  category: 'project',
  title: 'Launch the project',
  cost: { shape: 'fixed', base: 5 },
  availability: {
    stages: ['exploitation'],
    professions: ['software_engineering'],
    seniority: { min: 0, max: 1 },
    requires: [],
    baseWeight: 1,
    pipelineStage: ['prototype'],
  },
  check: {
    difficulty: 0.62,
    match: { 'capability.execution': 1 },
    fit: { founding: 1 },
  },
} as unknown as Overrides)

const networkAction = opportunity({
  id: 'test_network',
  kind: 'network_public',
  category: 'network_public',
  title: 'Reconnect with people',
  cost: { shape: 'scalable', min: 1, max: 4 },
  outcomes: {
    strong: {
      headline: 'Several conversations went somewhere.',
      effects: [{ op: 'capital', target: 'network', amount: 8 }],
    },
    success: {
      headline: 'A few conversations went somewhere.',
      effects: [{ op: 'capital', target: 'network', amount: 5 }],
    },
    nearMiss: {
      headline: 'Polite, but nothing came of it.',
      effects: [{ op: 'capital', target: 'network', amount: 2 }],
    },
    failure: {
      headline: 'Nothing came of it.',
      effects: [{ op: 'capital', target: 'network', amount: 1 }],
    },
  },
} as unknown as Overrides)

const currentJob = opportunity({ id: 'test_current_job' })

const testEvent = {
  id: 'test_event_manager_departs',
  type: 'organizational',
  narrative: { headline: 'Your manager is leaving.', body: 'They announced their departure.' },
  trigger: { minTurn: 3, maxTurn: 10, requires: [], weight: 1, oncePerCampaign: true },
  duration: 3,
  effects: [{ op: 'role', target: 'managerQuality', mode: 'set', amount: 0.35 }],
  opportunityModifiers: [],
}

export function testContent(): Content {
  return buildContent({
    opportunities: [
      currentJob,
      hiringRole,
      learningStudy,
      learningApply,
      projectWork,
      projectLaunch,
      networkAction,
    ],
    events: [testEvent],
    profiles: [testProfile],
  })
}

export const TEST_IDS = {
  currentJob: 'test_current_job',
  hiring: 'test_hiring_role',
  learning: 'test_learning',
  learningApply: 'test_learning_apply',
  project: 'test_project',
  projectLaunch: 'test_project_launch',
  network: 'test_network',
  profile: 'test_profile',
} as const
