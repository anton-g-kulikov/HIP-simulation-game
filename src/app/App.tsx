import { lazy, Suspense, useRef, useState } from 'react'
import { TURNS_PER_CAMPAIGN } from '@engine/index'
import { useStore } from './store'
import { EnergyMeter } from './components/EnergyMeter'
import { StartScreen } from './screens/StartScreen'
import { ReviewScreen } from './screens/ReviewScreen'
import { AllocateScreen } from './screens/AllocateScreen'
import { CommitScreen } from './screens/CommitScreen'
import { RetrospectiveScreen } from './screens/RetrospectiveScreen'

const DebugPanel = import.meta.env.DEV
  ? lazy(() => import('@devtools/DebugPanel').then((m) => ({ default: m.DebugPanel })))
  : null

const TRIPLE_TAP_WINDOW_MS = 600

export function App() {
  const state = useStore((s) => s.state)
  const screen = useStore((s) => s.screen)

  const [debugOpen, setDebugOpen] = useState(false)
  const taps = useRef<number[]>([])

  function onCounterTap() {
    if (!DebugPanel) return
    const now = Date.now()
    taps.current = [...taps.current, now].filter((t) => now - t < TRIPLE_TAP_WINDOW_MS)
    if (taps.current.length >= 3) {
      taps.current = []
      setDebugOpen(true)
    }
  }

  const years = Math.floor(state.ageMonths / 12)
  const months = state.ageMonths % 12

  return (
    <div className="app">
      {screen !== 'retrospective' && screen !== 'start' && (
        <header className="topbar">
          <div className="topbar-row">
            <span className="turn-counter" onClick={onCounterTap}>
              Month {Math.min(state.turn, TURNS_PER_CAMPAIGN)} of {TURNS_PER_CAMPAIGN}
            </span>
            <span className="age">
              Age {years}
              {months > 0 ? ` years ${months} months` : ''}
            </span>
          </div>
          {screen === 'allocate' && <EnergyMeter />}
        </header>
      )}

      {screen === 'start' && <StartScreen />}
      {screen === 'review' && <ReviewScreen />}
      {screen === 'allocate' && <AllocateScreen />}
      {screen === 'commit' && <CommitScreen />}
      {screen === 'retrospective' && <RetrospectiveScreen />}

      {debugOpen && DebugPanel && (
        <Suspense fallback={null}>
          <DebugPanel onClose={() => setDebugOpen(false)} />
        </Suspense>
      )}
    </div>
  )
}
