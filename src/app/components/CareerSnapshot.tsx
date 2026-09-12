import {
  capitalMovement,
  notableMovement,
  describePending,
  describeAllFit,
  describeMarket,
  runwayMonths,
  summarisePipeline,
  CAPITAL_LABELS,
} from '@engine/index'
import type { CapitalMovement, CapitalPath } from '@engine/types'
import { useStore } from '../store'

/**
 * Bars are unlabelled by value and deliberately imprecise: the player should
 * reason about direction, not optimise a number (HIP_UX_Spec.md §4). Money and
 * time are the only things shown numerically.
 *
 * The moved segment shows what the last month did, in the same idiom as the
 * outcome cards: quiet where the value already sat, coloured for the move.
 */
function Row({
  label,
  value,
  movement,
}: {
  label: string
  value: number
  movement?: CapitalMovement
}) {
  const steady = movement ? Math.min(movement.before, movement.after) : value
  const moved = movement ? Math.abs(movement.after - movement.before) : 0
  const gained = movement ? movement.after > movement.before : false

  return (
    <div className="snapshot-row">
      <span className="snapshot-label">{label}</span>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${Math.max(2, Math.min(100, steady))}%` }} />
        {movement && (
          <div
            className={`bar-moved ${gained ? 'up' : 'down'}`}
            style={{ width: `${Math.max(0, Math.min(100, moved))}%` }}
          />
        )}
      </div>
    </div>
  )
}

/**
 * Open, at the top, every round — not behind a toggle.
 *
 * This is the compounding the game is about. A player who has to go looking for
 * it will not watch it accumulate, and watching it accumulate is the lesson.
 */
export function CareerSnapshot() {
  const state = useStore((s) => s.state)
  const content = useStore((s) => s.content)

  const { capital, finance, role } = state.player
  const fit = describeAllFit(state.player.hiddenFit, state.player.fitObservations)
  const openPipelines = state.pipelines.filter((p) => !p.closed)
  // Standing context rather than an outcome: it bears on what to attempt next,
  // which is a decision made here.
  const market = describeMarket(state.market)

  const movement = capitalMovement(state)
  const notable = notableMovement(state)
  const inFlight = describePending(state)
  const movementFor = (path: CapitalPath) => movement.find((m) => m.path === path)

  const rows: { path: CapitalPath; value: number }[] = [
    { path: 'capability.technical', value: capital.capability.technical },
    { path: 'capability.execution', value: capital.capability.execution },
    { path: 'capability.communication', value: capital.capability.communication },
    { path: 'capability.leadership', value: capital.capability.leadership },
    { path: 'evidence', value: capital.evidence },
    { path: 'reputation', value: capital.reputation },
    { path: 'network', value: capital.network },
  ]

  return (
    <>
      <h2 className="section">Where you stand</h2>
      <div className="card">
        {rows.map((row) => (
          <Row
            key={row.path}
            label={CAPITAL_LABELS[row.path]}
            value={row.value}
            movement={movementFor(row.path)}
          />
        ))}

        {notable.length > 0 && (
          <p className="muted snapshot-note">
            Last month: {notable.map((m) => m.phrase.toLowerCase()).join(', ')}.
          </p>
        )}

        <p className="muted snapshot-note">
          {role.title}, {role.org}.<br />
          {Math.round(finance.monthlyComp).toLocaleString('en-US')} a month ·{' '}
          {runwayMonths(finance).toFixed(1)} months of runway.
        </p>

        {/* One reading per line. Joined into a paragraph, two readings about
            two different things read as a single contradictory claim. */}
        {fit.length > 0 && (
          <ul className="fit-readings muted">
            {fit.map((entry) => (
              <li key={entry.axis}>{entry.phrase}</li>
            ))}
          </ul>
        )}

        {market && <p className="muted snapshot-note">{market}</p>}
      </div>

      <h2 className="section">What you have going</h2>
      <div className="card">
        {openPipelines.map((pipeline) => (
          <p key={pipeline.id} className="pipeline-line">
            <strong>{pipeline.title}</strong>
            <br />
            <span className="muted">{summarisePipeline(pipeline, content)}</span>
          </p>
        ))}
        {/* Named, not counted. The player made these decisions; only the
            outcome is theirs to wait for. */}
        {inFlight.length === 0 ? (
          <p className="muted snapshot-note" style={{ marginBottom: 0 }}>
            Nothing is waiting to come back.
          </p>
        ) : (
          <div className="snapshot-note" style={{ marginBottom: 0 }}>
            <span className="muted">Waiting to come back</span>
            <ul className="in-flight">
              {inFlight.map((item, i) => (
                <li key={`${item.title}-${i}`}>
                  <span className="in-flight-title">{item.title}</span>
                  <span className="in-flight-when">{item.when}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  )
}
