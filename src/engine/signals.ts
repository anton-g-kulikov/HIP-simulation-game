/**
 * Qualitative signals — HIP_Content_Spec.md §5.
 *
 * The player never sees a probability (design doc §9.3). These phrases are
 * generated from the same hidden values the outcome function uses, by fixed
 * thresholds, so a player who plays enough can learn to read them. That
 * learnability is the whole reason the mapping is fixed rather than authored
 * per template.
 */

import type { OpportunityTemplate } from '@content/schema'
import { weightedMatch } from './capital'
import type { CampaignState } from './types'

const SIGNAL_TEXT: Record<string, string> = {
  strong_capability_match: 'Well matched to your experience',
  partial_capability_match: 'Partly matched to your experience',
  capability_stretch: 'A stretch from where you are',
  thin_evidence: 'Limited evidence for this',
  crowded_field: 'Crowded applicant pool',
  high_uncertainty: 'High uncertainty',
  strong_learning: 'Unusually strong learning potential',
  slow_payoff: 'Slow to pay off',
  unclear_mission_fit: 'Mission fit unclear',
  reversible: 'Easy to step back from',
  hard_to_reverse: 'Hard to undo',
  crowded_calendar: 'You have been doing a lot of this lately',
  low_runway_required: 'Low financial runway required',
  pay_cut: 'Pays less than you earn now',
  pay_rise: 'Pays more than you earn now',
}

const MAX_SIGNALS = 3

/*
 * Calibrated against the distribution the game actually produces, not against
 * the 0–1 range in the abstract.
 *
 * The first cut put the top band at 0.70. Weighted match never exceeds about
 * 0.68 even with a well-built profile, so that band fired on zero of 2,635
 * card renders and every card in the game showed one of the remaining two
 * phrases. The most prominent signal on every card was therefore close to
 * uninformative — the failure mode most likely to make outcomes read as
 * arbitrary, which is the riskiest assumption in the prototype
 * (HIP_Decisions_And_Open_Questions.md, Q11).
 *
 * These sit near the 75th and 25th percentiles of observed match, so the top
 * band stays uncommon, the bottom band means something, and building capital
 * visibly moves cards up a band. Re-derive them with the scratch analysis in
 * the prototype notes if content weights change substantially.
 */
const STRONG_MATCH_ABOVE = 0.6
const PARTIAL_MATCH_ABOVE = 0.42

/**
 * Relative to what evidence-hungry roles ask for, rather than an absolute floor.
 * At 40 this never fired: the starting profile has 45 evidence and evidence
 * does not decay, so the warning was unreachable from turn one.
 */
const THIN_EVIDENCE_BELOW = 55
const EVIDENCE_WEIGHT_THAT_MATTERS = 0.25

const CROWDED_DIFFICULTY_ABOVE = 0.55
const SLOW_PAYOFF_TURNS = 2.2

function expectedDelay(delay: Record<string, number>): number {
  let total = 0
  for (const [turns, probability] of Object.entries(delay)) {
    total += Number(turns) * probability
  }
  return total
}

/**
 * Generated signals first, authored flags second, capped at three. Ordering is
 * deliberate: what is true of *this player* matters more than what is always
 * true of the card.
 */
export function generateSignals(state: CampaignState, template: OpportunityTemplate): string[] {
  const generated: string[] = []

  const match = weightedMatch(state.player.capital, template.check.match)
  if (match > STRONG_MATCH_ABOVE) generated.push('strong_capability_match')
  else if (match > PARTIAL_MATCH_ABOVE) generated.push('partial_capability_match')
  else generated.push('capability_stretch')

  const evidenceWeight = template.check.match.evidence ?? 0
  if (
    state.player.capital.evidence < THIN_EVIDENCE_BELOW &&
    evidenceWeight >= EVIDENCE_WEIGHT_THAT_MATTERS
  ) {
    generated.push('thin_evidence')
  }

  if (template.check.difficulty > CROWDED_DIFFICULTY_ABOVE) generated.push('crowded_field')

  if (expectedDelay(template.delay) > SLOW_PAYOFF_TURNS) generated.push('slow_payoff')

  if (template.roleOutcome) {
    generated.push(template.roleOutcome.compMultiplier < 1 ? 'pay_cut' : 'pay_rise')
  }

  const ordered = [...generated, ...template.signals]
  const unique = [...new Set(ordered)].slice(0, MAX_SIGNALS)

  return unique.map((id) => SIGNAL_TEXT[id] ?? id)
}
