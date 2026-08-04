import { useStore } from '../store'

/**
 * Ten pips rather than a number, so the budget reads as "how much of the month
 * is left" rather than a resource to optimise. The last two turn amber: the
 * point where overinvestment starts being a real mistake (spec §4.2).
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
        {Array.from({ length: budget }, (_, i) => {
          const filled = i < remaining
          const isLastTwo = i >= remaining && i < remaining + 2 && spent > 0
          return (
            <span
              key={i}
              className={`energy-pip${filled ? ' filled' : ''}${!filled && isLastTwo ? ' last' : ''}`}
            />
          )
        })}
      </div>
    </div>
  )
}
