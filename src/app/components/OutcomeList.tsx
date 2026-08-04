import type { CapitalChange, Explanation, OutcomeCard } from '@engine/types'

const BAND_LABEL: Record<OutcomeCard['band'], string> = {
  strong: 'Better than expected',
  success: 'It worked',
  nearMiss: 'Close',
  failure: 'It did not work',
}

const KIND_LABEL: Record<Exclude<OutcomeCard['kind'], 'result'>, string> = {
  event: 'Out of your hands',
  recognition: 'Recognised',
  lapse: 'Closed itself',
}

function monthsAgo(turns: number): string {
  if (turns <= 0) return 'this month'
  if (turns === 1) return 'last month'
  return `${turns} months ago`
}

type Factor = {
  label: string
  helped: boolean
  state: string
  decisive: boolean
}

/**
 * Causal factors as rows with an explicit state, rather than run-on prose.
 *
 * As a sentence these read badly and scan worse — "How well this suits you
 * worked against you" is three clauses to say one thing. Each factor is one
 * claim with one direction, so it should look like one.
 */
function factorsOf(explanation: Explanation): Factor[] {
  const factors: Factor[] = explanation.contributors.map((c) => ({
    label: c.label,
    helped: c.direction === 'helped',
    state: c.direction === 'helped' ? 'helped' : 'held you back',
    decisive: c.weight === 'decisive',
  }))

  if (explanation.luck !== 'as expected') {
    factors.push({
      label: 'Luck',
      helped: explanation.luck === 'ran your way',
      state: explanation.luck,
      decisive: false,
    })
  }

  return factors
}

/**
 * One bar per capital move, drawn the way the career snapshot draws the same
 * values, so a change can be seen rather than read.
 *
 * The steady part of the bar is whichever end is lower; the moved part sits on
 * the end and is coloured by direction. A gain therefore grows to the right and
 * a loss shows what came off. Small moves get a floor width so a one-point
 * change is still visible.
 */
function ChangeBar({ change }: { change: CapitalChange }) {
  const gained = change.after > change.before
  const steady = Math.min(change.before, change.after)
  const moved = Math.abs(change.after - change.before)

  return (
    <div className="change">
      <div className="change-phrase">{change.phrase || change.label}</div>
      <div className="change-bar" role="img" aria-label={`${change.label} ${gained ? 'up' : 'down'}`}>
        <div className="change-steady" style={{ width: `${Math.max(0, Math.min(100, steady))}%` }} />
        <div
          className={`change-moved ${gained ? 'up' : 'down'}`}
          style={{ width: `${Math.max(0, Math.min(100, moved))}%` }}
        />
      </div>
    </div>
  )
}

/**
 * The causal line is the whole point of this screen: what happened, what it
 * came from, and why (design doc §10.5). The turn distance is stated
 * explicitly, because delayed consequence is the mechanic being tested.
 */
export function OutcomeList({
  outcomes,
  pendingCount = 0,
}: {
  outcomes: OutcomeCard[]
  pendingCount?: number
}) {
  if (outcomes.length === 0) {
    return (
      <div className="card">
        <p className="card-desc" style={{ marginTop: 0 }}>
          Nothing came back this month.
        </p>
        <p className="muted" style={{ fontSize: 14, marginBottom: 0 }}>
          {pendingCount === 1
            ? 'One thing you started is still in motion.'
            : `${pendingCount} things you started are still in motion.`}
        </p>
      </div>
    )
  }

  return (
    <>
      {outcomes.map((outcome) => {
        const factors = factorsOf(outcome.explanation)

        return (
          <div className="card" key={outcome.id}>
            {/* Only results get a success band. An event is not something the
                player earned, and labelling it "Close" would be nonsense. */}
            <span className={`band ${outcome.kind === 'result' ? outcome.band : outcome.kind}`}>
              {outcome.kind === 'result' ? BAND_LABEL[outcome.band] : KIND_LABEL[outcome.kind]}
            </span>
            <div className="card-title">{outcome.headline}</div>

            {outcome.sourceTitle && outcome.turnsAgo > 0 && (
              <div className="outcome-source">
                From: {outcome.sourceTitle}, {monthsAgo(outcome.turnsAgo)}.
              </div>
            )}

            {factors.length > 0 && (
              <ul className="factors">
                {factors.map((factor) => (
                  <li
                    key={factor.label}
                    className={`factor ${factor.helped ? 'helped' : 'hurt'}${factor.decisive ? ' decisive' : ''}`}
                  >
                    <span className="factor-label">{factor.label}</span>
                    <span className="factor-state">
                      {factor.state}
                      {factor.decisive ? ', decisively' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {outcome.capitalChanges.length > 0 && (
              <div className="changes-bars">
                {outcome.capitalChanges.map((change) => (
                  <ChangeBar key={change.path} change={change} />
                ))}
              </div>
            )}

            {outcome.changes.length > 0 && (
              <ul className="changes">
                {outcome.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </>
  )
}
