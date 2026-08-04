import { useStore } from '../store'

/**
 * Pips rather than a number, so the budget reads as "how much of the month is
 * left" rather than a resource to optimise.
 *
 * One pip per point, in exactly two states: available, or committed to
 * something this month. Every point committed takes one pip out of the
 * available run, including the first.
 *
 * An earlier version also painted a two-pip amber band immediately after the
 * available run, meant to mark the last two energy as poor value. It floated —
 * it slid left as energy was committed — so it filled the gap the first two
 * commitments left behind, and the meter looked like it ignored them. The idea
 * behind it was wrong anyway: the diminishing returns in spec §4.2 are about
 * pouring energy into a *single action*, not about the month's budget. The last
 * two points of the month, spread across two different actions, are worth as
 * much as the first two.
 */
export function EnergyMeter() {
  const budget = useStore((s) => s.budget())
  const spent = useStore((s) => s.spent())
  const remaining = budget - spent

  return (
    <div className="energy-meter">
      <div className="energy-label">
        <span>Energy</span>
        <span>
          {remaining} of {budget} left
        </span>
      </div>
      <div className="energy-track" role="img" aria-label={`${remaining} of ${budget} energy left`}>
        {Array.from({ length: budget }, (_, i) => (
          <span key={i} className={`energy-pip ${i < remaining ? 'available' : 'committed'}`} />
        ))}
      </div>
    </div>
  )
}
