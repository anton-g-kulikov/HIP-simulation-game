import { describeAllFit, runwayMonths, summarisePipeline } from '@engine/index'
import { useStore } from '../store'
import { noteSnapshotExpanded, notePipelineViewOpened } from '@telemetry/log'

/**
 * Bars are unlabelled by value and deliberately imprecise: the player should
 * reason about direction, not optimise a number (HIP_UX_Spec.md §4). Money and
 * time are the only things shown numerically.
 */
function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="snapshot-row">
      <span className="snapshot-label">{label}</span>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}

export function CareerSnapshot() {
  const state = useStore((s) => s.state)
  const content = useStore((s) => s.content)

  const { capital, finance, role } = state.player
  const fit = describeAllFit(state.player.hiddenFit, state.player.fitObservations)
  const openPipelines = state.pipelines.filter((p) => !p.closed)

  return (
    <>
      <details onToggle={(e) => e.currentTarget.open && noteSnapshotExpanded()}>
        <summary>Where you stand</summary>

        <div style={{ marginTop: 12 }}>
          <Bar label="Technical" value={capital.capability.technical} />
          <Bar label="Execution" value={capital.capability.execution} />
          <Bar label="Communication" value={capital.capability.communication} />
          <Bar label="Leading" value={capital.capability.leadership} />
          <Bar label="Evidence" value={capital.evidence} />
          <Bar label="Reputation" value={capital.reputation} />
          <Bar label="Network" value={capital.network} />

          <p className="muted" style={{ fontSize: 14, marginTop: 12 }}>
            {role.title}, {role.org}.<br />
            {Math.round(finance.monthlyComp).toLocaleString('en-US')} a month ·{' '}
            {runwayMonths(finance).toFixed(1)} months of runway.
          </p>

          {fit.length > 0 && (
            <p className="muted" style={{ fontSize: 14 }}>
              {fit.map((entry) => entry.phrase).join(' ')}
            </p>
          )}
        </div>
      </details>

      <details onToggle={(e) => e.currentTarget.open && notePipelineViewOpened()}>
        <summary>What is in motion</summary>
        <div style={{ marginTop: 12 }}>
          {openPipelines.map((pipeline) => (
            <p key={pipeline.id} className="muted" style={{ fontSize: 14, margin: '0 0 8px' }}>
              <strong style={{ color: 'var(--ink)' }}>{pipeline.title}</strong>
              <br />
              {summarisePipeline(pipeline, content)}
            </p>
          ))}
          {state.pending.length > 0 && (
            <p className="muted" style={{ fontSize: 14 }}>
              {state.pending.length === 1
                ? 'One thing is still waiting to come back.'
                : `${state.pending.length} things are still waiting to come back.`}
            </p>
          )}
        </div>
      </details>
    </>
  )
}
