import { describeMarket } from '@engine/index'
import { useStore } from '../store'
import { OutcomeList } from '../components/OutcomeList'

export function ReviewScreen() {
  const state = useStore((s) => s.state)
  const goTo = useStore((s) => s.goTo)
  const market = describeMarket(state.market)

  return (
    <>
      <h2 className="section">What came back</h2>
      <OutcomeList outcomes={state.currentOutcomes} pendingCount={state.pending.length} />

      {market && (
        <p className="muted" style={{ fontSize: 14 }}>
          {market}
        </p>
      )}

      <div className="footer-action">
        <div className="footer-inner">
          <button className="primary" onClick={() => goTo('allocate')}>
            Continue
          </button>
        </div>
      </div>
    </>
  )
}
