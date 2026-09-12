import { buildRetrospective } from '@engine/retrospective'
import { useStore } from '../store'
import { sessionAsJson } from '@telemetry/log'

/**
 * No score, no grade, no archetype (ADR-008). The allocation breakdown is the
 * teaching moment: seeing how lopsided your own play was does more than any
 * summary sentence could.
 */
export function RetrospectiveScreen() {
  const state = useStore((s) => s.state)
  const content = useStore((s) => s.content)
  const restart = useStore((s) => s.restart)

  const retro = buildRetrospective(state, content)
  const maxEnergy = Math.max(1, ...retro.allocation.map((slice) => slice.energy))

  function exportSession() {
    const blob = new Blob([sessionAsJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'hip-playtest-session.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <h2 className="section">Two years on</h2>

      <div className="card">
        <p className="lead" style={{ marginTop: 0 }}>
          You are 30. {retro.finalRole}.
        </p>
        <p className="muted" style={{ marginBottom: 0 }}>
          {Math.round(retro.monthlyComp).toLocaleString('en-US')} a month ·{' '}
          {retro.runwayMonths.toFixed(1)} months of runway.
        </p>
      </div>

      <h2 className="section">Where your energy went</h2>
      <div className="card">
        {retro.allocation.map((slice) => (
          <div className="alloc-row" key={slice.category}>
            <span className="snapshot-label">{slice.label}</span>
            <div className="alloc-bar">
              <div className="alloc-fill" style={{ width: `${(slice.energy / maxEnergy) * 100}%` }} />
            </div>
            <span className="alloc-value">{slice.energy}</span>
          </div>
        ))}
        <p className="muted" style={{ fontSize: 14, marginBottom: 0 }}>
          {retro.energySpent} of {retro.energyOffered} energy spent.
          {retro.energyUnused > 0 && ` You held back ${retro.energyUnused}.`}
        </p>
      </div>

      {retro.untouched.length > 0 && (
        <div className="card">
          <div className="card-title">You never touched</div>
          <p className="card-desc">{retro.untouched.join(' · ')}</p>
        </div>
      )}

      <h2 className="section">What you built</h2>
      <div className="card">
        {Object.entries(retro.capitalEnd).map(([label, value]) => {
          const start = retro.capitalStart[label] ?? 0
          const delta = value - start
          return (
            <div className="snapshot-row" key={label}>
              <span className="snapshot-label">{label}</span>
              <div className="bar">
                <div className="bar-fill" style={{ width: `${Math.max(2, value)}%` }} />
              </div>
              <span className="trend">{delta > 1 ? '↑' : delta < -1 ? '↓' : '·'}</span>
            </div>
          )
        })}
      </div>

      {retro.fitLearned.length > 0 && (
        <div className="card">
          <div className="card-title">What you found out about yourself</div>
          <ul className="fit-readings card-desc">
            {retro.fitLearned.map((phrase) => (
              <li key={phrase}>{phrase}</li>
            ))}
          </ul>
        </div>
      )}

      {retro.strongestResults.length > 0 && (
        <>
          <h2 className="section">What went unusually well</h2>
          {/* Same hierarchy as the review screen: the decision leads, the
              result follows. A headline with only a month on it is the link
              between choice and consequence gone missing, in the one place
              the campaign is meant to be read back as a sequence of choices. */}
          {retro.strongestResults.map((outcome) => (
            <div className="card highlight" key={outcome.id}>
              <div className="outcome-from">
                <span className="outcome-from-when">Month {outcome.sourceTurn}</span>
                <div className="outcome-from-title">{outcome.sourceTitle}</div>
              </div>
              <div className="outcome-headline">{outcome.headline}</div>
            </div>
          ))}
        </>
      )}

      {retro.openPaths.length > 0 && (
        <>
          <h2 className="section">Still open</h2>
          <div className="card">
            {retro.openPaths.map((path) => (
              <p className="card-desc" key={path} style={{ marginTop: 0 }}>
                {path}
              </p>
            ))}
          </div>
        </>
      )}

      <h2 className="section">How it went, month by month</h2>
      <div className="card">
        {retro.timeline.map((entry) => (
          <div className="timeline-entry" key={entry.turn}>
            <div className="timeline-turn">Month {entry.turn}</div>
            <div style={{ fontSize: 15 }}>{entry.title}</div>
            {entry.detail && <div className="muted" style={{ fontSize: 14 }}>{entry.detail}</div>}
          </div>
        ))}
      </div>

      <p className="muted" style={{ fontSize: 13, marginTop: 20 }}>
        This is a game, not a prediction. The simulation is deliberately simplified and is not
        calibrated against real labour-market data.
      </p>

      {/*
        Export is the primary action, not "play again". The footer sits where
        "Next month" was a moment ago, and a participant tapping in rhythm would
        otherwise restart before the facilitator had collected anything. The
        telemetry log archives finished sessions so nothing is lost either way,
        but the ordering should not invite it.
      */}
      <div className="footer-action">
        <div className="footer-inner">
          <button className="primary" onClick={exportSession}>
            Export this session
          </button>
          <button className="secondary" onClick={() => restart()}>
            Start another campaign
          </button>
        </div>
      </div>
    </>
  )
}
