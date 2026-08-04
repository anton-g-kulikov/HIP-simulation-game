import { useState } from 'react'
import { isCampaignComplete } from '@engine/index'
import { useStore } from '../store'
import { noteProbe } from '@telemetry/log'

/** Turns where the playtest protocol asks the tension probe (§3.3). */
const PROBE_TURNS = [4, 8, 12]

/**
 * A vague preview of what is in flight. This screen is the main defence against
 * the loop feeling inert: the player should leave knowing something is coming
 * without knowing what (design doc §5.5).
 */
function pendingPreview(count: number, soonest: number): string {
  if (count === 0) return 'Nothing is in motion. Next month starts from where you are.'
  const things = count === 1 ? 'One thing is' : `${count} things are`
  if (soonest <= 1) return `${things} in motion. You should hear about something within a month.`
  return `${things} in motion. None of it will come back immediately.`
}

export function CommitScreen() {
  const state = useStore((s) => s.state)
  const advance = useStore((s) => s.advance)
  const turnAvailable = useStore((s) => s.turnAvailable())
  const settings = useStore((s) => s.settings)

  const lastRecord = state.history[state.history.length - 1]
  const justPlayed = lastRecord?.turn ?? 0
  // Two probes, asked in order: how hard the decision felt, then whether the
  // player knows what they are waiting on (HIP_Playtest_Protocol.md §3.3).
  const [difficulty, setDifficulty] = useState<number | null>(null)
  const [probed, setProbed] = useState(false)

  const soonest = state.pending.reduce(
    (min, p) => Math.min(min, p.resolveOnTurn - state.turn + 1),
    99,
  )

  const complete = isCampaignComplete(state)
  const showProbe = PROBE_TURNS.includes(justPlayed) && !probed

  return (
    <>
      <h2 className="section">Month closed</h2>

      <div className="card">
        <p className="lead" style={{ margin: 0 }}>
          {pendingPreview(state.pending.length, soonest)}
        </p>
        {lastRecord && lastRecord.energyUnused > 0 && (
          <p className="card-desc">You held back {lastRecord.energyUnused} energy.</p>
        )}
      </div>

      {showProbe && difficulty === null && (
        <div className="card">
          <div className="card-title">How hard was that decision?</div>
          <div className="probe-options">
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} onClick={() => setDifficulty(value)}>
                {value}
              </button>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
            1 is obvious, 5 is genuinely difficult.
          </p>
        </div>
      )}

      {showProbe && difficulty !== null && (
        <div className="card">
          <div className="card-title">Do you know what you are waiting on?</div>
          <div className="probe-options">
            {['yes', 'roughly', 'no'].map((answer) => (
              <button
                key={answer}
                onClick={() => {
                  noteProbe(difficulty, answer)
                  setProbed(true)
                }}
              >
                {answer}
              </button>
            ))}
          </div>
        </div>
      )}

      {!turnAvailable && settings.dayGate && (
        <div className="card">
          <p className="card-desc" style={{ margin: 0 }}>
            The next month opens tomorrow. Nothing is lost by waiting.
          </p>
        </div>
      )}

      <div className="footer-action">
        <div className="footer-inner">
          <button className="primary" onClick={advance} disabled={!turnAvailable && !complete}>
            {complete ? 'See how it went' : 'Next month'}
          </button>
        </div>
      </div>
    </>
  )
}
