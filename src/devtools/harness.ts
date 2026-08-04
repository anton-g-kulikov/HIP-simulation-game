/**
 * The Monte Carlo balance harness — spec §8.
 *
 * This is the instrument that turns design doc §23's balance goals from
 * aspirations into assertions. It is also the reason the engine is pure
 * (ADR-002): tens of thousands of campaigns have to run headlessly.
 *
 * The composite score below is an internal hypothesis about what a good
 * Level 1 looks like. It is never shown in the game (ADR-008), and it must be
 * checked against playtesters rather than trusted.
 */

import type { Content } from '@content/loader'
import { createCampaign, isCampaignComplete, openTurn, commitAllocation, runwayMonths } from '@engine/index'
import { createRng } from '@engine/rng'
import type { CampaignState } from '@engine/types'
import type { Policy } from './policies'

export type CampaignResult = {
  seed: number
  policy: string
  score: number
  evidence: number
  meanCapability: number
  reputation: number
  network: number
  runwayMonths: number
  compGrowthPct: number
  energySpent: number
  energyUnused: number
  categoriesUsed: number
  pipelinesOpened: number
  rolesAccepted: number
}

export type PolicySummary = {
  policy: string
  runs: CampaignResult[]
  median: number
  p25: number
  p75: number
  iqrShareOfMedian: number
  meanEnergySpent: number
}

const PROFILE_ID = 'swe_bigtech_28'

function meanCapabilityOf(capability: {
  technical: number
  execution: number
  communication: number
  leadership: number
}): number {
  return (
    (capability.technical + capability.execution + capability.communication + capability.leadership) / 4
  )
}

/**
 * Measures what the campaign *produced*, not where the player ended up.
 *
 * The first version of this scored absolute capital, which meant roughly
 * three-quarters of every score was the starting profile sitting still. That
 * suppressed the measured spread to about 5% of the median and made every
 * policy look alike — it was measuring the profile, not the play. Deltas make
 * doing nothing score near zero, which is the honest baseline.
 */
export function harnessScore(state: CampaignState, content: Content): number {
  const profile = content.profiles[PROFILE_ID]
  if (!profile) return 0

  const capital = state.player.capital
  const start = profile.capital
  const startComp = profile.finance.monthlyComp
  const startRunway = profile.finance.savings / profile.finance.monthlyBurn

  return (
    0.3 * (capital.evidence - start.evidence) +
    0.2 * (meanCapabilityOf(capital.capability) - meanCapabilityOf(start.capability)) +
    0.15 * (capital.reputation - start.reputation) +
    0.15 * (capital.network - start.network) +
    // Capped: past a few months of buffer, more runway buys little extra
    // freedom (design doc §8.7), and uncapped it lets pure passivity accrue
    // score just by not spending.
    0.1 * Math.min(runwayMonths(state.player.finance) - startRunway, 4) * 4 +
    0.1 * ((state.player.finance.monthlyComp - startComp) / startComp) * 100
  )
}

export function runCampaign(content: Content, policy: Policy, seed: number): CampaignResult {
  // A separate stream for policy decisions, so policy randomness never perturbs
  // the world's randomness for the same seed.
  const policyRng = createRng(seed ^ 0x9e3779b9)

  let state = openTurn(createCampaign(content, PROFILE_ID, seed), content)
  while (!isCampaignComplete(state)) {
    let allocation = {}
    try {
      allocation = policy.choose(state, content, policyRng)
    } catch {
      allocation = {}
    }

    try {
      state = commitAllocation(state, content, allocation)
    } catch {
      // A policy that proposes something unaffordable simply does nothing that
      // turn; that is a fact about the policy, not a harness failure.
      state = commitAllocation(state, content, {})
    }

    if (!isCampaignComplete(state)) state = openTurn(state, content)
  }

  const capital = state.player.capital
  const profile = content.profiles[PROFILE_ID]
  const startComp = profile?.finance.monthlyComp ?? state.player.finance.monthlyComp

  const energySpent = state.history.reduce((sum, r) => sum + r.energySpent, 0)
  const energyUnused = state.history.reduce((sum, r) => sum + r.energyUnused, 0)
  const categoriesUsed = new Set(state.history.flatMap((r) => r.categoriesUsed)).size

  return {
    seed,
    policy: policy.name,
    score: harnessScore(state, content),
    evidence: capital.evidence,
    meanCapability: meanCapabilityOf(capital.capability),
    reputation: capital.reputation,
    network: capital.network,
    runwayMonths: runwayMonths(state.player.finance),
    compGrowthPct: ((state.player.finance.monthlyComp - startComp) / startComp) * 100,
    energySpent,
    energyUnused,
    categoriesUsed,
    pipelinesOpened: state.pipelines.filter((p) => p.kind === 'hiring').length,
    rolesAccepted: state.pipelines.filter((p) => p.stage === 'accepted').length,
  }
}

export function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const position = (sorted.length - 1) * q
  const low = Math.floor(position)
  const high = Math.ceil(position)
  if (low === high) return sorted[low] as number
  const weight = position - low
  return (sorted[low] as number) * (1 - weight) + (sorted[high] as number) * weight
}

export function summarise(policy: string, runs: CampaignResult[]): PolicySummary {
  const scores = runs.map((r) => r.score)
  const median = quantile(scores, 0.5)
  const p25 = quantile(scores, 0.25)
  const p75 = quantile(scores, 0.75)
  return {
    policy,
    runs,
    median,
    p25,
    p75,
    iqrShareOfMedian: median === 0 ? 0 : (p75 - p25) / Math.abs(median),
    meanEnergySpent: runs.reduce((sum, r) => sum + r.energySpent, 0) / Math.max(1, runs.length),
  }
}

export function runPolicies(
  content: Content,
  policies: Policy[],
  seeds: number[],
): Map<string, PolicySummary> {
  const results = new Map<string, PolicySummary>()
  for (const policy of policies) {
    const runs = seeds.map((seed) => runCampaign(content, policy, seed))
    results.set(policy.name, summarise(policy.name, runs))
  }
  return results
}

// ---------------------------------------------------------------- invariants

export type InvariantResult = {
  id: number
  name: string
  passed: boolean
  detail: string
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

/** Share of paired seeds on which `a` beat `b`. */
function pairedWinRate(a: PolicySummary, b: PolicySummary): number {
  let wins = 0
  for (let i = 0; i < a.runs.length; i++) {
    if ((a.runs[i]?.score ?? 0) > (b.runs[i]?.score ?? 0)) wins++
  }
  return wins / Math.max(1, a.runs.length)
}

export function checkInvariants(
  summaries: Map<string, PolicySummary>,
  content: Content,
): InvariantResult[] {
  const get = (name: string) => summaries.get(name)
  const results: InvariantResult[] = []

  const named = (name: string): PolicySummary =>
    get(name) ?? { policy: name, runs: [], median: 0, p25: 0, p75: 0, iqrShareOfMedian: 0, meanEnergySpent: 0 }

  const allInNames = [
    'allIn:current_job',
    'allIn:job_search',
    'allIn:learning',
    'allIn:project',
    'allIn:network_public',
  ]
  const core = ['diversified', 'greedy', 'random', 'idle', ...allInNames].map(named)
  const contenders = core.filter((s) => s.policy !== 'idle')

  const ranked = [...contenders].sort((a, b) => b.median - a.median)

  // 1 — no dominant *action category*.
  //
  // Scoped to the five single-category strategies. The first version compared
  // every policy including `diversified`, which made it contradict invariants 2
  // and 6: those require diversified to win, so invariant 1 could only pass if
  // thoughtful play were no better than random. Design doc §3.4's claim is that
  // no single path is mechanically superior, not that skill should not pay.
  const singleCategory = allInNames.map(named).sort((a, b) => b.median - a.median)
  const topCategory = singleCategory[0]
  const secondCategory = singleCategory[1]
  const categoryGap =
    topCategory && secondCategory && secondCategory.median !== 0
      ? (topCategory.median - secondCategory.median) / Math.abs(secondCategory.median)
      : 0
  results.push({
    id: 1,
    name: 'No single action category dominates (top ≤25% above the next)',
    passed: categoryGap <= 0.25,
    detail: `${topCategory?.policy} leads ${secondCategory?.policy} by ${pct(categoryGap)}`,
  })

  // 2 — diversification pays
  const diversified = named('diversified')
  const bestAllIn = allInNames.map(named).sort((a, b) => b.median - a.median)[0]
  results.push({
    id: 2,
    name: 'Diversified is at least as good as every single-action strategy',
    passed: diversified.median >= (bestAllIn?.median ?? 0),
    detail: `diversified ${diversified.median.toFixed(1)} vs best allIn ${bestAllIn?.policy} ${bestAllIn?.median.toFixed(1)}`,
  })

  // 3 — effort beats dabbling
  const deep = named('deep')
  const shallow = named('shallow')
  // Measured against the field spread, not against shallow's own median: once
  // dabbling scores near or below zero, a ratio to it reports nonsense
  // (an earlier run printed "3034%").
  const fieldRange = (ranked[0]?.median ?? 0) - named('idle').median
  const effortEdge = fieldRange === 0 ? 0 : (deep.median - shallow.median) / fieldRange
  results.push({
    id: 3,
    name: 'Credible effort beats dabbling by ≥15% of the field spread',
    passed: effortEdge >= 0.15,
    detail: `deep ${deep.median.toFixed(1)} vs shallow ${shallow.median.toFixed(1)} (${pct(effortEdge)} of field)`,
  })

  // 4 — overinvestment is a real mistake
  const overinvest = named('overinvest')
  results.push({
    id: 4,
    name: 'Pouring everything into one action underperforms a credible effort',
    passed: overinvest.median < deep.median,
    detail: `overinvest ${overinvest.median.toFixed(1)} vs deep ${deep.median.toFixed(1)}`,
  })

  // 5 — doing nothing loses.
  //
  // Bottom-two rather than strictly last, because the harness score has no
  // impact term: a policy that trades a quarter of its pay for mission work
  // scores below idle on some seeds purely through the compensation term. That
  // is a limitation of the proxy, not a strategy the game should punish, and it
  // is recorded rather than tuned away.
  const idle = named('idle')
  const idleBelowAll = contenders.every((other) => other.median > idle.median)
  const bottomTwo = idle.runs.filter((run, i) => {
    const better = contenders.filter((other) => (other.runs[i]?.score ?? 0) > run.score).length
    return better >= contenders.length - 1
  }).length
  const bottomTwoRate = bottomTwo / Math.max(1, idle.runs.length)
  results.push({
    id: 5,
    name: 'Doing nothing loses: below every strategy on median, bottom two on >95% of seeds',
    passed: idleBelowAll && bottomTwoRate > 0.95,
    detail: `idle median ${idle.median.toFixed(1)}, below all: ${idleBelowAll}, bottom two on ${pct(bottomTwoRate)} of seeds`,
  })

  // 6 — randomness does not erase strategy
  const random = named('random')
  const diversifiedWinRate = pairedWinRate(diversified, random)
  results.push({
    id: 6,
    name: 'Diversified beats random on >70% of paired seeds',
    passed: diversifiedWinRate > 0.7,
    detail: `diversified won ${pct(diversifiedWinRate)} of paired seeds`,
  })

  // 7 — networking is slow but real
  const networkRank = ranked.findIndex((s) => s.policy === 'allIn:network_public')
  results.push({
    id: 7,
    name: 'Network-only is not bottom-two by the end',
    passed: networkRank >= 0 && networkRank < contenders.length - 2,
    detail: `allIn:network_public ranks ${networkRank + 1} of ${contenders.length}`,
  })

  // 8 — learning needs application.
  //
  // Measured on capability *gained* rather than on the composite score. The
  // composite version divided by study-only's median, which sits near zero by
  // design, so the ratio reported nonsense in both directions. Capability gain
  // is always positive and is what design doc §8.3 is actually about.
  const studyOnly = named('studyOnly')
  const studyThenApply = named('studyThenApply')
  const startCapability = content.profiles[PROFILE_ID]
    ? meanCapabilityOf(content.profiles[PROFILE_ID]!.capital.capability)
    : 0
  const gainOf = (summary: PolicySummary) =>
    quantile(summary.runs.map((r) => r.meanCapability), 0.5) - startCapability
  const studyGain = gainOf(studyOnly)
  const applyGain = gainOf(studyThenApply)
  const applyEdge = studyGain <= 0 ? (applyGain > 0 ? 1 : 0) : (applyGain - studyGain) / studyGain
  results.push({
    id: 8,
    name: 'Applying what you learn builds ≥25% more capability than studying alone',
    passed: applyEdge >= 0.25,
    detail: `apply +${applyGain.toFixed(2)} vs study-only +${studyGain.toFixed(2)} capability (${pct(applyEdge)})`,
  })

  // 9 — job hopping is not free
  const accept = named('acceptEverything')
  results.push({
    id: 9,
    name: 'Chasing every role does not beat a diversified strategy',
    passed: accept.median <= diversified.median,
    detail: `acceptEverything ${accept.median.toFixed(1)} vs diversified ${diversified.median.toFixed(1)}`,
  })

  // 10 — variance without chaos.
  //
  // Measured against the spread of the whole field rather than each policy's own
  // median. Dividing by a policy's own median explodes as that median approaches
  // zero — a weak strategy showed 1000% spread purely because it scored near
  // nothing — which measured the denominator, not the randomness.
  const fieldSpread = (ranked[0]?.median ?? 0) - idle.median
  const spreads = contenders.map((s) => ({
    policy: s.policy,
    share: fieldSpread === 0 ? 0 : (s.p75 - s.p25) / fieldSpread,
  }))
  const outOfBand = spreads.filter((s) => s.share < 0.1 || s.share > 0.6)
  results.push({
    id: 10,
    name: 'Within-policy spread is 10–60% of the whole field’s spread',
    passed: outOfBand.length === 0,
    detail:
      outOfBand.length === 0
        ? `all ${spreads.length} policies within band (field spread ${fieldSpread.toFixed(1)})`
        : outOfBand.map((s) => `${s.policy} ${pct(s.share)}`).join(', '),
  })

  void content
  return results
}
