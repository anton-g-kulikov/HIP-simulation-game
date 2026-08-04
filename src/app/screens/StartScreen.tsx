import { runwayMonths, TURNS_PER_CAMPAIGN } from '@engine/index'
import { useStore } from '../store'

/**
 * The premise, stated once.
 *
 * The pilot playthrough opened straight onto a hand of cards, and a
 * first-time player had no way to know who they were. Copy like "the problem
 * you have spent two years inside" and "publish something about what you
 * actually know" refers to a person the game had never introduced.
 *
 * This is premise, not rules. It deliberately does not explain repetition cost,
 * personal fit, or how outcomes resolve — whether the game teaches its own
 * mechanics is part of what the playtest is measuring
 * (HIP_Playtest_Protocol.md §3, step 1).
 */
export function StartScreen() {
  const state = useStore((s) => s.state)
  const content = useStore((s) => s.content)
  const goTo = useStore((s) => s.goTo)

  const profile = content.profiles[state.player.profileId]
  const { role, finance } = state.player

  return (
    <>
      <h2 className="section">Where you are</h2>

      <div className="card">
        <p className="lead" style={{ marginTop: 0 }}>
          {profile?.blurb}
        </p>
      </div>

      <div className="card">
        <div className="card-title">{role.title}</div>
        <p className="card-desc" style={{ marginTop: 4 }}>
          at {role.org}
        </p>
        <p className="muted" style={{ fontSize: 14, marginBottom: 0 }}>
          {Math.round(finance.monthlyComp).toLocaleString('en-US')} a month ·{' '}
          {runwayMonths(finance).toFixed(0)} months of savings if you stopped earning.
        </p>
      </div>

      <h2 className="section">What you decide</h2>

      <div className="card">
        <p className="card-desc" style={{ marginTop: 0 }}>
          Each month you have a fixed amount of energy and more things worth doing than it
          covers. Where you put it is the only decision you make.
        </p>
        <p className="card-desc">
          You do not sit the interviews, write the posts, or run the meetings. Those happen
          on their own, and you find out how they went later — usually a month or two later,
          sometimes not at all.
        </p>
        <p className="card-desc" style={{ marginBottom: 0 }}>
          {TURNS_PER_CAMPAIGN} months. Then you look back at what it added up to.
        </p>
      </div>

      <div className="footer-action">
        <div className="footer-inner">
          <button className="primary" onClick={() => goTo('allocate')}>
            Begin
          </button>
        </div>
      </div>
    </>
  )
}
