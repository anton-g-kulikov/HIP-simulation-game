import type { OutcomeCard } from '@engine/types'

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
      {outcomes.map((outcome) => (
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

          {outcome.explanation.contributors.length > 0 && (
            <div className="outcome-why">
              {outcome.explanation.contributors.map((c) => (
                <span key={c.label}>
                  {c.label} {c.direction === 'helped' ? 'helped' : 'worked against you'}
                  {c.weight === 'decisive' ? ', decisively' : ''}.{' '}
                </span>
              ))}
              {outcome.explanation.luck !== 'as expected' && (
                <span>Luck {outcome.explanation.luck}.</span>
              )}
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
      ))}
    </>
  )
}
