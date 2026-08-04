import { useEffect } from 'react'
import type { OfferView } from '@engine/types'
import { useStore } from '../store'
import { noteCostInflation } from '@telemetry/log'

/**
 * One card. Never shows a probability, a percentage, or a numeric fit — the
 * player gets qualitative signals only (design doc §9.3).
 */
export function OfferCard({ view }: { view: OfferView }) {
  const draft = useStore((s) => s.draft)
  const setEffort = useStore((s) => s.setEffort)
  const canAfford = useStore((s) => s.canAfford)
  const chargeFor = useStore((s) => s.chargeFor)

  const { offer } = view
  const effort = draft[offer.id] ?? 0
  const scalable = offer.shape === 'scalable'

  useEffect(() => {
    if (view.inflatedFrom !== undefined) {
      noteCostInflation(offer.category, view.inflatedFrom, view.cost)
    }
  }, [view.inflatedFrom, view.cost, offer.category])

  const charge = effort > 0 ? chargeFor(view, effort) : 0

  return (
    <div className={`card${view.isCommitment ? ' commitment' : ''}`}>
      <div className="card-head">
        <div className="card-title">{view.title}</div>
        <div className={`card-cost${view.inflatedFrom !== undefined ? ' inflated' : ''}`}>
          {view.inflatedFrom !== undefined ? `${view.inflatedFrom} → ${view.cost}` : view.cost}
          {scalable ? '+' : ''} ⚡
        </div>
      </div>

      <p className="card-desc">{view.description}</p>

      {view.pipelineSummary && <div className="pipeline-summary">{view.pipelineSummary}</div>}

      {view.signals.length > 0 && <div className="signals">{view.signals.join(' · ')}</div>}

      {view.inflatedFrom !== undefined && (
        <div className="signals">
          You have worked this angle recently. It costs more until you leave it alone for a turn or two.
        </div>
      )}

      {!view.isCommitment && view.expiresIn <= 2 && (
        <div className="expiry">
          {view.expiresIn <= 1 ? 'Gone after this month' : 'Closes in 2 months'}
        </div>
      )}

      {view.isCommitment && (
        <div className="expiry">Lapses if you leave it alone much longer</div>
      )}

      <div className="card-controls">
        {scalable ? (
          <>
            <button
              className="step"
              onClick={() => setEffort(offer.id, Math.max(0, effort - 1))}
              disabled={effort <= 0}
              aria-label={`Less energy on ${view.title}`}
            >
              −
            </button>
            <span className="effort-value">
              {effort === 0 ? 'nothing' : `${charge} ⚡ spent`}
            </span>
            <button
              className="step"
              onClick={() => setEffort(offer.id, Math.min(offer.maxEnergy, effort + 1))}
              disabled={effort >= offer.maxEnergy || !canAfford(view, effort + 1)}
              aria-label={`More energy on ${view.title}`}
            >
              +
            </button>
          </>
        ) : (
          <button
            className={effort > 0 ? 'selected' : ''}
            onClick={() => setEffort(offer.id, effort > 0 ? 0 : offer.minEnergy)}
            disabled={effort === 0 && !canAfford(view, offer.minEnergy)}
          >
            {effort > 0 ? 'Chosen' : `Do this — ${view.cost} ⚡`}
          </button>
        )}
      </div>
    </div>
  )
}
