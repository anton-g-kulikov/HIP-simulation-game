/**
 * `npm run harness` — headless balance run.
 *
 * Prints per-policy medians and one pass/fail line per balance invariant.
 * Re-run after any content or tuning change; the results table in
 * _meta/project-task-list.md is filled from this output.
 */

import { loadContent } from '@content/loader'
import { ALL_POLICIES } from './policies'
import { checkInvariants, runPolicies } from './harness'

const SEED_COUNT = Number(process.env.HARNESS_SEEDS ?? 1000)

const content = loadContent()
const seeds = Array.from({ length: SEED_COUNT }, (_, i) => i * 7919 + 13)

const startedAt = Date.now()
const summaries = runPolicies(content, ALL_POLICIES, seeds)
const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)

console.log(`\nHIP balance harness — ${SEED_COUNT} seeds x ${ALL_POLICIES.length} policies (${elapsed}s)\n`)

const rows = [...summaries.values()].sort((a, b) => b.median - a.median)
const width = Math.max(...rows.map((r) => r.policy.length))

console.log(`${'policy'.padEnd(width)}   median      p25      p75    IQR/med   mean ⚡`)
console.log('-'.repeat(width + 52))
for (const row of rows) {
  console.log(
    `${row.policy.padEnd(width)} ${row.median.toFixed(1).padStart(8)} ${row.p25
      .toFixed(1)
      .padStart(8)} ${row.p75.toFixed(1).padStart(8)} ${(row.iqrShareOfMedian * 100)
      .toFixed(1)
      .padStart(9)}% ${row.meanEnergySpent.toFixed(1).padStart(8)}`,
  )
}

console.log('\nBalance invariants (spec §8.3)\n')
const invariants = checkInvariants(summaries, content)
for (const invariant of invariants) {
  console.log(`${invariant.passed ? 'PASS' : 'FAIL'}  ${invariant.id}. ${invariant.name}`)
  console.log(`      ${invariant.detail}`)
}

const failed = invariants.filter((i) => !i.passed)
console.log(`\n${invariants.length - failed.length} of ${invariants.length} invariants hold.\n`)

process.exit(failed.length === 0 ? 0 : 1)
