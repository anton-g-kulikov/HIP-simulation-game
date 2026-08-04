/**
 * Dev-only inspector. Compiled out of the playtest build: a playtester who can
 * see true probabilities is no longer answering the question the playtest asks
 * (HIP_UX_Spec.md §6).
 */

import { successProbability, effortCurve } from '@engine/resolution'
import { weightedMatch } from '@engine/capital'
import { weightedFit } from '@engine/fit'
import { useStore } from '../app/store'

export function DebugPanel({ onClose }: { onClose: () => void }) {
  const state = useStore((s) => s.state)
  const content = useStore((s) => s.content)
  const setSeed = useStore((s) => s.setSeed)
  const settings = useStore((s) => s.settings)
  const toggleDayGate = useStore((s) => s.toggleDayGate)

  return (
    <div className="debug">
      <div className="topbar-row">
        <strong>Debug</strong>
        <button onClick={onClose}>Close</button>
      </div>

      <h2 className="section">Campaign</h2>
      <p className="muted" style={{ fontSize: 14 }}>
        seed {state.seed} · turn {state.turn} · rng cursor {state.rngCursor} · market{' '}
        {state.market.hiring.toFixed(3)}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => setSeed(state.seed + 1)}>Next seed</button>
        <button onClick={() => setSeed(Math.floor(Math.random() * 2 ** 31))}>Random seed</button>
        <button onClick={toggleDayGate}>
          Day gate: {settings.dayGate ? 'on' : 'off'}
        </button>
      </div>

      <h2 className="section">Hidden fit</h2>
      <pre>
        {Object.entries(state.player.hiddenFit)
          .map(([axis, value]) => `${axis.padEnd(16)} ${value.toFixed(3)}`)
          .join('\n')}
      </pre>

      <h2 className="section">Heat</h2>
      <pre>
        {Object.entries(state.player.heat)
          .map(([category, value]) => `${category.padEnd(16)} ${value.toFixed(2)}`)
          .join('\n')}
      </pre>

      <h2 className="section">True probabilities on the table</h2>
      <pre>
        {state.offers
          .map((offer) => {
            const template = content.opportunityById[offer.templateId]
            if (!template) return `${offer.id}: unknown template`
            const energy = offer.shape === 'fixed' ? offer.minEnergy : 3
            const p = successProbability({
              match: weightedMatch(state.player.capital, template.check.match),
              fit: weightedFit(state.player.hiddenFit, template.check.fit),
              energy,
              momentum: 0,
              difficulty: template.check.difficulty,
              marketModifier: offer.category === 'job_search' ? state.market.hiring : 0,
              eventModifier: 0,
            })
            return `${template.id}\n  at ${energy}⚡  p=${p.toFixed(3)}  effort=${effortCurve(energy).toFixed(3)}  diff=${template.check.difficulty}`
          })
          .join('\n')}
      </pre>

      <h2 className="section">Pending</h2>
      <pre>
        {state.pending.length === 0
          ? 'nothing'
          : state.pending
              .map(
                (p) =>
                  `${p.sourceTemplateId} → turn ${p.resolveOnTurn} · ${p.result.band} (p=${p.result.probability.toFixed(2)}, roll=${p.result.roll.toFixed(2)})`,
              )
              .join('\n')}
      </pre>

      <h2 className="section">Active events</h2>
      <pre>
        {state.activeEvents.length === 0
          ? 'none'
          : state.activeEvents.map((e) => `${e.templateId} until turn ${e.endsAfterTurn}`).join('\n')}
      </pre>
    </div>
  )
}
