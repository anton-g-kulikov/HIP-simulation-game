import { energyZone, highEffortStreak } from '@engine/index'
import { useStore } from '../store'

/**
 * Pips rather than a number, so the budget reads as "how much of the month is
 * left" rather than a resource to optimise.
 *
 * One pip per point, in exactly two states: available, or committed to
 * something this month. Every point committed takes one pip out of the
 * available run, including the first.
 *
 * It reads like a fuel gauge. Full is every pip lit; each point committed puts
 * out the rightmost lit pip, so the last point remaining is the leftmost one.
 *
 * Each pip carries the zone it would cost to spend *down to* it: steady while
 * the month stays sustainable, a stretch at the point that forfeits the
 * cooldown bonus, and hard where the month starts counting toward burnout.
 * Because the gauge drains toward the left, that puts the warning colours on
 * the reserve — the last pips you would burn — which is where a fuel gauge
 * keeps its red. The boundaries come from the tuning rather than being chosen
 * for looks; a band on the wrong point would teach a rule the game does not
 * have.
 *
 * An earlier version painted a floating two-pip amber band that slid left as
 * energy was committed, filling the gap each commitment left behind, so the
 * meter appeared to ignore the first two points and showed a phantom reserve at
 * zero.
 */
export function EnergyMeter() {
  const budget = useStore((s) => s.budget())
  const spent = useStore((s) => s.spent())
  const state = useStore((s) => s.state)
  const content = useStore((s) => s.content)

  const remaining = budget - spent
  const highEffort = content.tuning.events.highEffortThreshold
  // Pip p is the (budget - p + 1)th point to be spent, so its zone is that
  // point's zone: pip 1 is the very last point, and sits in the hard zone.
  const zoneOfPip = (pip: number) => energyZone(budget - pip + 1, budget, highEffort)

  // Months already spent at this level, before whatever is being committed now.
  const streak = highEffortStreak(state.history, highEffort)
  const wouldBeHard = spent >= highEffort
  const runLength = streak + 1

  return (
    <div className="energy-meter">
      <div className="energy-label">
        <span>Energy</span>
        <span>
          {remaining} of {budget} left
        </span>
      </div>

      <div className="energy-track" role="img" aria-label={`${remaining} of ${budget} energy left`}>
        {Array.from({ length: budget }, (_, i) => {
          const pip = i + 1
          return (
            <span
              key={i}
              className={`energy-pip ${zoneOfPip(pip)} ${pip <= remaining ? 'available' : 'committed'}`}
            />
          )
        })}
      </div>

      {/* Stated flatly, and only while the commitment is actually in that zone.
          Burnout is a real modelled consequence; a run of hard months is worth
          knowing about, and nagging about it is not. */}
      {wouldBeHard && (
        <p className="energy-note">
          {runLength === 1
            ? 'A month this full counts as hard going.'
            : `That would be ${runLength} hard months in a row.`}
        </p>
      )}
    </div>
  )
}
