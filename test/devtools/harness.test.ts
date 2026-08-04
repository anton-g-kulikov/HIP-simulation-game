import { describe, it, expect } from 'vitest'
import { loadContent } from '@content/loader'
import { runCampaign, summarise, checkInvariants, quantile, harnessScore } from '@devtools/harness'
import { diversified, idle, allIn, CORE_POLICIES } from '@devtools/policies'
import type { CampaignResult, PolicySummary } from '@devtools/harness'
import { createCampaign, openTurn } from '@engine/index'

// Test intent: test/test-documentation.md, M6 (cases 10.1–10.3)

const content = loadContent()
const seeds = [1, 2, 3, 4, 5, 6, 7, 8]

describe('harness — running', () => {
  it('10.1 runs a full campaign for every policy without throwing', () => {
    for (const policy of CORE_POLICIES) {
      const result = runCampaign(content, policy, 42)
      expect(result.policy).toBe(policy.name)
      expect(Number.isFinite(result.score)).toBe(true)
    }
  })

  it('10.2 compares policies on the same worlds', () => {
    const a = seeds.map((seed) => runCampaign(content, diversified, seed))
    const b = seeds.map((seed) => runCampaign(content, idle, seed))
    expect(a.map((r) => r.seed)).toEqual(b.map((r) => r.seed))
  })

  it('is deterministic: the same policy and seed give the same result', () => {
    expect(runCampaign(content, diversified, 99)).toEqual(runCampaign(content, diversified, 99))
  })

  it('doing nothing spends no energy and scores below an active strategy', () => {
    const doingNothing = runCampaign(content, idle, 7)
    const doingSomething = runCampaign(content, diversified, 7)
    expect(doingNothing.energySpent).toBe(0)
    expect(doingSomething.score).toBeGreaterThan(doingNothing.score)
  })

  it('a single-category policy touches only that category', () => {
    const result = runCampaign(content, allIn('learning'), 5)
    expect(result.categoriesUsed).toBeLessThanOrEqual(1)
  })

  it('scores a campaign that changed nothing at close to zero', () => {
    // The score measures what the campaign produced, so an untouched profile
    // should sit near zero rather than at some large constant.
    const fresh = openTurn(createCampaign(content, 'swe_bigtech_28', 3), content)
    expect(Math.abs(harnessScore(fresh, content))).toBeLessThan(1)
  })
})

describe('harness — statistics', () => {
  it('computes quantiles', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    expect(quantile(values, 0.5)).toBeCloseTo(5.5, 5)
    expect(quantile(values, 0.25)).toBeCloseTo(3.25, 5)
    expect(quantile(values, 0.75)).toBeCloseTo(7.75, 5)
  })

  it('handles an empty sample without throwing', () => {
    expect(quantile([], 0.5)).toBe(0)
  })
})

// ------------------------------------------------------------------ 10.3

/**
 * The invariant checks are themselves code that can be wrong. These feed
 * fabricated summaries in so a broken balance is guaranteed to be caught.
 */
function fakeSummary(policy: string, scores: number[], meanCapability = 46.25): PolicySummary {
  const runs: CampaignResult[] = scores.map((score, i) => ({
    seed: i,
    policy,
    score,
    evidence: 0,
    meanCapability,
    reputation: 0,
    network: 0,
    runwayMonths: 0,
    compGrowthPct: 0,
    energySpent: 0,
    energyUnused: 0,
    categoriesUsed: 0,
    pipelinesOpened: 0,
    rolesAccepted: 0,
  }))
  return summarise(policy, runs)
}

// Starting mean capability for the authored profile; a policy's capability is
// expressed relative to it so invariant 8 has something real to measure.
const START_CAPABILITY = 46.25

function field(
  overrides: Record<string, number[]>,
  capability: Record<string, number> = {},
): Map<string, PolicySummary> {
  const base: Record<string, number[]> = {
    'allIn:current_job': [2, 3, 4, 5],
    'allIn:job_search': [2, 3, 4, 5],
    'allIn:learning': [2, 3, 4, 5],
    'allIn:project': [2, 3, 4, 5],
    'allIn:network_public': [2, 3, 4, 5],
    diversified: [6, 7, 8, 9],
    greedy: [4, 5, 6, 7],
    random: [3, 4, 5, 6],
    idle: [-1, -1, -1, -1],
    deep: [4, 5, 6, 7],
    shallow: [0, 1, 1, 2],
    overinvest: [1, 2, 3, 4],
    studyOnly: [-1, 0, 0, 1],
    studyThenApply: [2, 3, 4, 5],
    acceptEverything: [3, 4, 5, 6],
  }
  const baseCapability: Record<string, number> = {
    studyOnly: START_CAPABILITY + 2,
    studyThenApply: START_CAPABILITY + 6,
  }
  const mergedCapability = { ...baseCapability, ...capability }
  const merged = { ...base, ...overrides }
  return new Map(
    Object.entries(merged).map(([name, scores]) => [
      name,
      fakeSummary(name, scores, mergedCapability[name] ?? START_CAPABILITY),
    ]),
  )
}

const invariant = (results: ReturnType<typeof checkInvariants>, id: number) =>
  results.find((r) => r.id === id)!

describe('harness — the invariant checks catch a broken balance', () => {
  it('10.3 flags a dominant action category', () => {
    const broken = checkInvariants(field({ 'allIn:project': [40, 41, 42, 43] }), content)
    expect(invariant(broken, 1).passed).toBe(false)
  })

  it('10.3b flags a single-action strategy beating diversified play', () => {
    const broken = checkInvariants(field({ 'allIn:current_job': [20, 21, 22, 23] }), content)
    expect(invariant(broken, 2).passed).toBe(false)
  })

  it('10.3c flags dabbling being as good as a credible effort', () => {
    const broken = checkInvariants(field({ shallow: [4, 5, 6, 7] }), content)
    expect(invariant(broken, 3).passed).toBe(false)
  })

  it('10.3d flags overinvestment paying off', () => {
    const broken = checkInvariants(field({ overinvest: [8, 9, 10, 11] }), content)
    expect(invariant(broken, 4).passed).toBe(false)
  })

  it('10.3e flags doing nothing being competitive', () => {
    const broken = checkInvariants(field({ idle: [6, 7, 8, 9] }), content)
    expect(invariant(broken, 5).passed).toBe(false)
  })

  it('10.3f flags randomness swamping strategy', () => {
    const broken = checkInvariants(field({ random: [9, 9, 9, 9] }), content)
    expect(invariant(broken, 6).passed).toBe(false)
  })

  it('10.3g flags study without application building as much capability as applying it', () => {
    const broken = checkInvariants(
      field({}, { studyOnly: START_CAPABILITY + 6, studyThenApply: START_CAPABILITY + 6 }),
      content,
    )
    expect(invariant(broken, 8).passed).toBe(false)
  })

  it('10.3h flags job-hopping being free', () => {
    const broken = checkInvariants(field({ acceptEverything: [20, 21, 22, 23] }), content)
    expect(invariant(broken, 9).passed).toBe(false)
  })

  it('10.3i flags a deterministic field with no variance', () => {
    const flat: Record<string, number[]> = {}
    for (const name of ['allIn:current_job', 'allIn:job_search', 'allIn:learning', 'allIn:project', 'allIn:network_public', 'greedy', 'random']) {
      flat[name] = [3, 3, 3, 3]
    }
    const broken = checkInvariants(field(flat), content)
    expect(invariant(broken, 10).passed).toBe(false)
  })

  it('passes a healthy fabricated field', () => {
    const healthy = checkInvariants(field({}), content)
    const failures = healthy.filter((r) => !r.passed).map((r) => r.id)
    // The fabricated field is only shaped for the checks it exercises; 7 depends
    // on real ranking behaviour, so it is allowed to be the only exception.
    expect(failures.filter((id) => id !== 7)).toEqual([])
  })
})
