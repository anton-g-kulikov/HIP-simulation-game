import { useStore } from '../store'
import { OfferCard } from '../components/OfferCard'
import { CareerSnapshot } from '../components/CareerSnapshot'

export function AllocateScreen() {
  const offers = useStore((s) => s.offers())
  const spent = useStore((s) => s.spent())
  const error = useStore((s) => s.error)
  const commit = useStore((s) => s.commit)
  const dismissError = useStore((s) => s.dismissError)

  const commitments = offers.filter((view) => view.isCommitment)
  const fresh = offers.filter((view) => !view.isCommitment)

  return (
    <>
      {error && (
        <div className="error" onClick={dismissError} role="alert">
          {error}
        </div>
      )}

      {/* Standing context first: what a month did to you, and what is still
          running, are the inputs to the decision below — not a footnote to it. */}
      <CareerSnapshot />

      {commitments.length > 0 && (
        <>
          <h2 className="section">Needs a decision</h2>
          {commitments.map((view) => (
            <OfferCard key={view.offer.id} view={view} />
          ))}
        </>
      )}

      <h2 className="section">This month</h2>
      {fresh.map((view) => (
        <OfferCard key={view.offer.id} view={view} />
      ))}

      <div className="footer-action">
        <div className="footer-inner">
          <button className="primary" onClick={commit}>
            {spent === 0 ? 'Do nothing this month' : `End the month — ${spent} ⚡ committed`}
          </button>
        </div>
      </div>
    </>
  )
}
