import { describe, it, expect } from 'vitest'
import { parseOpportunity, parseEvent, validateContentSet } from '@content/schema'

const parsed = (raw: unknown) => parseOpportunity(raw, 'test.json')

// Test intent: test/test-documentation.md, M2 (cases 7.2–7.7)
// Contract: _meta/specs/HIP_Content_Spec.md §1–§2

const validOpportunity = () => ({
  id: 'test_role',
  kind: 'hiring',
  category: 'job_search',
  title: 'A role',
  description: 'A description.',
  availability: {
    stages: ['exploitation'],
    professions: ['software_engineering'],
    seniority: { min: 0.4, max: 0.8 },
    requires: [],
    baseWeight: 1,
  },
  cost: { shape: 'fixed', base: 2 },
  expiry: { turns: 3 },
  check: {
    difficulty: 0.5,
    match: { 'capability.technical': 0.5, evidence: 0.5 },
    fit: { deep_technical: 1 },
  },
  delay: { '1': 0.5, '2': 0.5 },
  outcomes: {
    strong: { headline: 'Great', effects: [{ op: 'capital', target: 'evidence', amount: 6 }] },
    success: { headline: 'Good', effects: [{ op: 'capital', target: 'evidence', amount: 4 }] },
    nearMiss: { headline: 'Close', effects: [{ op: 'capital', target: 'network', amount: 2 }] },
    failure: { headline: 'No', effects: [{ op: 'capital', target: 'network', amount: 1 }] },
  },
  roleOutcome: {
    title: 'Staff Engineer',
    org: 'A large payments company',
    compMultiplier: 1.18,
    orgQuality: 0.7,
    managerQuality: 0.6,
    seniorityDelta: 0.1,
  },
  signals: ['crowded_field'],
  tags: [],
})

describe('content schema — opportunities', () => {
  it('accepts a well-formed template', () => {
    expect(() => parseOpportunity(validOpportunity(), 'test.json')).not.toThrow()
  })

  it('7.2 names the file, the field path and the expectation when a template is malformed', () => {
    const broken = validOpportunity() as Record<string, unknown>
    delete broken.title

    let message = ''
    try {
      parseOpportunity(broken, 'opportunities.json')
    } catch (error) {
      message = (error as Error).message
    }

    expect(message).toContain('opportunities.json')
    expect(message).toContain('title')
    expect(message.length).toBeGreaterThan(20)
  })

  it('7.2b rejects an unknown effect op rather than ignoring it', () => {
    const broken = validOpportunity()
    broken.outcomes.success.effects = [{ op: 'teleport', target: 'evidence', amount: 1 }] as never
    expect(() => parseOpportunity(broken, 'x.json')).toThrow(/effects/)
  })

  it('7.4 rejects match weights that do not sum to one', () => {
    const broken = validOpportunity()
    broken.check.match = { 'capability.technical': 0.5, evidence: 0.2 }
    expect(() => parseOpportunity(broken, 'x.json')).toThrow(/sum to 1/i)
  })

  it('7.4b rejects fit weights that do not sum to one', () => {
    const broken = validOpportunity()
    broken.check.fit = { deep_technical: 0.5 }
    expect(() => parseOpportunity(broken, 'x.json')).toThrow(/sum to 1/i)
  })

  it('7.5 rejects a delay distribution that does not sum to one', () => {
    const broken = validOpportunity()
    broken.delay = { '1': 0.5, '2': 0.2 }
    expect(() => parseOpportunity(broken, 'x.json')).toThrow(/sum to 1/i)
  })

  it('7.3 rejects a near-miss outcome that awards nothing', () => {
    const broken = validOpportunity()
    broken.outcomes.nearMiss.effects = []
    expect(() => parseOpportunity(broken, 'x.json')).toThrow(/near ?miss|partial|award/i)
  })

  it('7.3b rejects a failure outcome that awards nothing', () => {
    const broken = validOpportunity()
    broken.outcomes.failure.effects = []
    expect(() => parseOpportunity(broken, 'x.json')).toThrow(/failure|partial|award/i)
  })

  it('rejects a difficulty outside 0–1', () => {
    const broken = validOpportunity()
    broken.check.difficulty = 1.4
    expect(() => parseOpportunity(broken, 'x.json')).toThrow()
  })

  it('rejects a hiring template that does not state the role it leads to', () => {
    const broken = validOpportunity() as Record<string, unknown>
    delete broken.roleOutcome
    expect(() => parseOpportunity(broken, 'x.json')).toThrow(/roleOutcome|terms of the role/i)
  })

  it('rejects a scalable cost whose minimum exceeds its maximum', () => {
    const broken = validOpportunity() as Record<string, unknown>
    broken.cost = { shape: 'scalable', min: 5, max: 2 }
    expect(() => parseOpportunity(broken, 'x.json')).toThrow(/min/i)
  })
})

describe('content schema — events', () => {
  const validEvent = () => ({
    id: 'org_manager_departs',
    type: 'organizational',
    narrative: { headline: 'Your manager is leaving.', body: 'They announced their departure.' },
    trigger: { minTurn: 3, maxTurn: 10, requires: [], weight: 1, oncePerCampaign: true },
    duration: 3,
    effects: [{ op: 'role', target: 'managerQuality', mode: 'set', amount: 0.35 }],
    opportunityModifiers: [],
  })

  it('accepts a well-formed event', () => {
    expect(() => parseEvent(validEvent(), 'events.json')).not.toThrow()
  })

  it('rejects an event whose window is inverted', () => {
    const broken = validEvent()
    broken.trigger.minTurn = 9
    broken.trigger.maxTurn = 4
    expect(() => parseEvent(broken, 'events.json')).toThrow(/turn/i)
  })

  it('rejects an unknown event type', () => {
    const broken = validEvent() as Record<string, unknown>
    broken.type = 'meteorological'
    expect(() => parseEvent(broken, 'events.json')).toThrow()
  })
})

describe('content schema — whole-set rules', () => {
  it('7.6 rejects duplicate ids', () => {
    const a = validOpportunity()
    const b = validOpportunity()
    expect(() => validateContentSet([parsed(a), parsed(b)], [], [])).toThrow(/duplicate/i)
  })

  it('7.7 rejects an unlock effect pointing at a template that does not exist', () => {
    const a = validOpportunity()
    a.outcomes.success.effects = [
      { op: 'capital', target: 'evidence', amount: 4 },
      { op: 'unlock', template: 'does_not_exist' },
    ] as never
    expect(() => validateContentSet([parsed(a)], [], [])).toThrow(/does_not_exist/)
  })

  it('accepts a set whose unlock target exists', () => {
    const a = validOpportunity()
    const b = { ...validOpportunity(), id: 'other_role' }
    a.outcomes.success.effects = [
      { op: 'capital', target: 'evidence', amount: 4 },
      { op: 'unlock', template: 'other_role' },
    ] as never
    expect(() => validateContentSet([parsed(a), parsed(b)], [], [])).not.toThrow()
  })
})
