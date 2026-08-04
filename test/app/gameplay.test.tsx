import { describe, it, expect, beforeEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '@app/App'
import { useStore, startingScreen, screenAfterOpen } from '@app/store'
import { buildRetrospective } from '@engine/retrospective'
import { createCampaign, openTurn, commitAllocation, isCampaignComplete } from '@engine/index'
import { loadContent } from '@content/loader'
import { loadCampaign, saveCampaign, clearCampaign, isTurnAvailable } from '@persistence/save'
import type { CampaignState } from '@engine/types'

// Test intent: test/test-documentation.md, M4–M5 (cases 9.1–9.8)
// Behaviour only: no assertions on styling, copy, or store internals.

const content = loadContent()

beforeEach(() => {
  localStorage.clear()
  useStore.getState().restart(4242)
})

/** Most tests are about a turn, not about the opening screen. */
function skipIntro() {
  if (useStore.getState().screen === 'start') useStore.getState().goTo('allocate')
}

function footerButton() {
  return document.querySelector('.footer-action button') as HTMLButtonElement
}

describe('opening a campaign', () => {
  it('9.9 opens on an introduction that says who the player is', () => {
    useStore.getState().restart(4242)
    render(<App />)

    const profile = content.profiles['swe_bigtech_28']!
    // The premise has to be stated somewhere. Without it, card copy like "the
    // problem you have spent two years inside" refers to nothing.
    expect(document.body.textContent).toContain(profile.blurb)
    expect(document.body.textContent).toContain(profile.role.title)
  })

  it('9.9b states the one decision the game asks for', () => {
    useStore.getState().restart(4242)
    render(<App />)
    expect(document.body.textContent).toMatch(/energy/i)
    expect(document.body.textContent).toMatch(/each month|every month/i)
  })

  it('9.9c continues from the introduction into the first month', async () => {
    const user = userEvent.setup()
    useStore.getState().restart(4242)
    render(<App />)

    await user.click(footerButton())
    expect(screen.getByText(/Month 1 of 12/)).toBeTruthy()
    expect(screen.getByText(/This month/)).toBeTruthy()
  })

  it('9.9d does not show the introduction again for a campaign in progress', () => {
    let state = openTurn(createCampaign(content, 'swe_bigtech_28', 21), content)
    state = openTurn(commitAllocation(state, content, {}), content)

    useStore.setState({ state, screen: startingScreen(state) })
    render(<App />)

    const profile = content.profiles['swe_bigtech_28']!
    expect(document.body.textContent).not.toContain(profile.blurb)
  })

  it('9.9e shows no probabilities or numbers beyond money and time in the introduction', () => {
    useStore.getState().restart(4242)
    render(<App />)
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/\d+\s*%/)
    expect(text).not.toMatch(/probability|odds/i)
  })
})

describe('playing a turn', () => {
  it('9.1 lets a player choose an action, commit, and advance to the next month', async () => {
    const user = userEvent.setup()
    skipIntro()
    render(<App />)

    expect(screen.getByText(/Month 1 of 12/)).toBeTruthy()

    const doThis = screen.getAllByRole('button', { name: /Do this|More energy/ })[0]!
    await user.click(doThis)

    await user.click(footerButton())
    expect(screen.getByText(/Month closed/)).toBeTruthy()

    await user.click(footerButton())
    expect(screen.getByText(/Month 2 of 12/)).toBeTruthy()
  })

  it('9.1b allows a turn where the player spends nothing', async () => {
    const user = userEvent.setup()
    skipIntro()
    render(<App />)

    expect(footerButton().textContent).toMatch(/Do nothing this month/)
    await user.click(footerButton())

    expect(screen.getByText(/Month closed/)).toBeTruthy()
    expect(useStore.getState().state.history[0]!.energySpent).toBe(0)
  })

  it('9.2 stops the player over-allocating at the UI boundary', async () => {
    const user = userEvent.setup()
    skipIntro()
    render(<App />)

    // Pour energy into the first scalable card until the control disables.
    const plus = screen.getAllByRole('button', { name: /More energy/ })[0]
    if (plus) {
      for (let i = 0; i < 20; i++) {
        if ((plus as HTMLButtonElement).disabled) break
        await user.click(plus)
      }
      expect(useStore.getState().remaining()).toBeGreaterThanOrEqual(0)
    }

    expect(useStore.getState().spent()).toBeLessThanOrEqual(useStore.getState().budget())
  })

  it('9.4 shows what an outcome came from once one resolves', async () => {
    const user = userEvent.setup()
    skipIntro()
    render(<App />)

    const doThis = screen.getAllByRole('button', { name: /Do this|More energy/ })[0]!
    await user.click(doThis)
    await user.click(footerButton()) // commit
    await user.click(footerButton()) // next month

    // Turn 2 opens on the review screen when something resolved. Events also
    // appear here and legitimately have no source, so assert on a result card.
    const state = useStore.getState().state
    expect(screen.getByText(/What came back/)).toBeTruthy()

    const fromPlayer = state.currentOutcomes.filter((o) => o.kind === 'result')
    if (fromPlayer.length > 0) {
      expect(document.body.textContent).toMatch(/From:/)
      expect(document.body.textContent).toMatch(/last month|months ago/)
    }
    for (const outcome of state.currentOutcomes) {
      if (outcome.kind === 'event') {
        expect(document.body.textContent).toContain('Out of your hands')
      }
    }
  })

  it('9.3 shows the inflated cost when repetition has raised it', async () => {
    // Drive the engine directly to build up heat, then check the rendered card.
    let state = useStore.getState().state
    for (let i = 0; i < 2; i++) {
      const offer = state.offers.find((o) => o.category === 'current_job' && !o.pipelineId)
      if (!offer) break
      state = openTurn(commitAllocation(state, content, { [offer.id]: offer.minEnergy }), content)
    }
    useStore.setState({ state, screen: 'allocate', draft: {} })

    render(<App />)

    if (state.player.heat.current_job >= 1) {
      expect(document.body.textContent).toMatch(/→/)
      expect(document.body.textContent).toMatch(/costs more until you leave it alone/i)
    }
  })

  it('9.8 never renders a probability or a percentage anywhere on the allocate screen', () => {
    skipIntro()
    render(<App />)
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/\d+\s*%/)
    expect(text).not.toMatch(/probability|odds of|chance of/i)
  })

  it('surfaces an engine rejection as an error rather than crashing', () => {
    const state = useStore.getState().state
    const offer = state.offers[0]!
    useStore.setState({ draft: { [offer.id]: 99 } })
    useStore.getState().commit()

    expect(useStore.getState().error).toBeTruthy()
    expect(useStore.getState().state.turn).toBe(1)
  })
})

describe('the energy meter', () => {
  // Test intent: test/test-documentation.md, M4e (15.1–15.5)

  function meter() {
    return {
      total: document.querySelectorAll('.energy-pip').length,
      available: document.querySelectorAll('.energy-pip.available').length,
      committed: document.querySelectorAll('.energy-pip.committed').length,
    }
  }

  /** Commit `energy` to the first scalable card on the table. */
  function spend(energy: number) {
    const offer = useStore.getState().state.offers.find((o) => o.shape === 'scalable')!
    // Wrapped so React flushes the re-render before the meter is read.
    act(() => useStore.getState().setEffort(offer.id, energy))
  }

  it('15.5 reads as entirely available before anything is committed', () => {
    skipIntro()
    render(<App />)

    const budget = useStore.getState().budget()
    expect(meter()).toEqual({ total: budget, available: budget, committed: 0 })
  })

  it('15.4 moves exactly one pip for the first point committed', () => {
    skipIntro()
    render(<App />)
    const budget = useStore.getState().budget()

    spend(1)
    expect(meter()).toEqual({ total: budget, available: budget - 1, committed: 1 })
  })

  it('15.2 takes a pip out of the available run for every point committed', () => {
    skipIntro()
    render(<App />)
    const budget = useStore.getState().budget()

    for (const energy of [1, 2, 3, 4]) {
      spend(energy)
      const spentNow = useStore.getState().spent()
      expect(meter().available, `after committing ${energy}`).toBe(budget - spentNow)
      expect(meter().committed, `after committing ${energy}`).toBe(spentNow)
    }
  })

  it('16.5 gives every pip its zone, available ones included', () => {
    skipIntro()
    render(<App />)
    const budget = useStore.getState().budget()

    const zoned = document.querySelectorAll(
      '.energy-pip.steady, .energy-pip.stretch, .energy-pip.hard',
    )
    expect(zoned).toHaveLength(budget)

    // Boundaries follow the tuning: hard from the high-effort threshold up,
    // one stretch pip where the rest bonus is forfeited.
    const highEffort = useStore.getState().content.tuning.events.highEffortThreshold
    expect(document.querySelectorAll('.energy-pip.hard')).toHaveLength(budget - highEffort + 1)
    expect(document.querySelectorAll('.energy-pip.stretch').length).toBeGreaterThan(0)
  })

  it('16.5b consumes the cheap end of the budget first', () => {
    // Counting pips is not enough: committing five of ten must light the first
    // five, not the last five. An inverted mapping put the amber and red pips in
    // the committed state while the player was nowhere near them.
    skipIntro()
    render(<App />)

    spend(5)
    const pips = [...document.querySelectorAll('.energy-pip')]
    const committed = pips.filter((p) => p.classList.contains('committed'))

    expect(committed).toHaveLength(5)
    // The consumed pips are the leading ones, and all of them are steady.
    expect(pips.slice(0, 5).every((p) => p.classList.contains('committed'))).toBe(true)
    expect(committed.every((p) => p.classList.contains('steady'))).toBe(true)
    // Nothing in the hard zone has been touched yet.
    expect(
      pips.filter((p) => p.classList.contains('hard')).every((p) => p.classList.contains('available')),
    ).toBe(true)
  })

  it('16.6 says so once a commitment reaches the hard zone, and not before', () => {
    skipIntro()
    render(<App />)
    const highEffort = useStore.getState().content.tuning.events.highEffortThreshold

    spend(highEffort - 1)
    expect(document.querySelector('.energy-note')).toBeNull()

    spend(highEffort)
    expect(document.querySelector('.energy-note')?.textContent).toMatch(/hard going/i)
  })

  it('16.6b counts the run when hard months are already behind you', () => {
    skipIntro()
    const state = useStore.getState().state
    const highEffort = useStore.getState().content.tuning.events.highEffortThreshold
    // Two hard months already on the record.
    useStore.setState({
      state: {
        ...state,
        history: [
          { ...(state.history[0] ?? ({} as never)), energySpent: highEffort, turn: 1 },
          { ...(state.history[0] ?? ({} as never)), energySpent: highEffort, turn: 2 },
        ] as never,
      },
    })
    render(<App />)

    spend(highEffort)
    expect(document.querySelector('.energy-note')?.textContent).toMatch(/3 hard months in a row/i)
  })

  it('15.1 and 15.3 keep every pip in exactly one of two states', () => {
    skipIntro()
    render(<App />)
    const budget = useStore.getState().budget()

    for (const energy of [0, 1, 2, 3, 5]) {
      spend(energy)
      const m = meter()
      expect(m.total).toBe(budget)
      expect(m.available + m.committed).toBe(budget)
    }
  })
})

describe('the outcome card', () => {
  // Test intent: test/test-documentation.md, M4c (13.1–13.3, 13.9, 13.10)
  const card = (over: Partial<import('@engine/types').OutcomeCard> = {}) => ({
    id: 'o1',
    kind: 'result' as const,
    sourceTemplateId: 'x',
    sourceTitle: 'Get better at writing things down',
    sourceTurn: 1,
    turnsAgo: 3,
    band: 'failure' as const,
    headline: 'You wrote a lot of words nobody needed.',
    explanation: {
      contributors: [
        { label: 'The effort you put in', direction: 'hurt' as const, weight: 'notable' as const },
        { label: 'Your track record', direction: 'helped' as const, weight: 'decisive' as const },
      ],
      luck: 'ran against you' as const,
    },
    capitalChanges: [],
    changes: [],
    ...over,
  })

  function renderCard(over = {}) {
    const state = openTurn(createCampaign(content, 'swe_bigtech_28', 5), content)
    useStore.setState({
      state: { ...state, currentOutcomes: [card(over)] },
      screen: 'review',
    })
    render(<App />)
  }

  it('13.1 gives each causal factor its own row with an explicit state', () => {
    renderCard()

    const rows = document.querySelectorAll('.factor')
    // two contributors plus luck
    expect(rows).toHaveLength(3)

    const helped = document.querySelectorAll('.factor.helped')
    const hurt = document.querySelectorAll('.factor.hurt')
    expect(helped).toHaveLength(1)
    expect(hurt).toHaveLength(2)

    expect(document.body.textContent).toContain('held you back')
    expect(document.body.textContent).toContain('helped')
    // The old run-on phrasing is gone.
    expect(document.body.textContent).not.toContain('worked against you.')
  })

  it('13.2 omits luck when the roll landed as expected', () => {
    renderCard({
      explanation: {
        contributors: [
          { label: 'Your track record', direction: 'helped' as const, weight: 'minor' as const },
        ],
        luck: 'as expected' as const,
      },
    })
    expect(document.querySelectorAll('.factor')).toHaveLength(1)
    expect(document.body.textContent).not.toContain('Luck')
  })

  it('13.3 marks a decisive factor differently from a minor one', () => {
    renderCard()
    expect(document.querySelectorAll('.factor.decisive')).toHaveLength(1)
    expect(document.body.textContent).toContain('decisively')
  })

  it('13.4b draws a bar for a capital gain, sized by the move', () => {
    renderCard({
      capitalChanges: [
        {
          path: 'evidence' as const,
          label: 'Record of results',
          phrase: 'Your record of results got stronger.',
          before: 45,
          after: 51,
        },
      ],
    })

    expect(document.querySelectorAll('.change-bar')).toHaveLength(1)
    const moved = document.querySelector('.change-moved') as HTMLElement
    expect(moved.classList.contains('up')).toBe(true)
    expect(moved.style.width).toBe('6%')

    const steady = document.querySelector('.change-steady') as HTMLElement
    expect(steady.style.width).toBe('45%')

    expect(document.body.textContent).toContain('Your record of results got stronger.')
  })

  it('13.5b draws a loss in the other direction', () => {
    renderCard({
      capitalChanges: [
        {
          path: 'reputation' as const,
          label: 'Reputation',
          phrase: 'You dropped out of view a little.',
          before: 30,
          after: 24,
        },
      ],
    })

    const moved = document.querySelector('.change-moved') as HTMLElement
    expect(moved.classList.contains('down')).toBe(true)
    // The steady part is the lower end, so the lost slice sits on the end.
    const steady = document.querySelector('.change-steady') as HTMLElement
    expect(steady.style.width).toBe('24%')
  })

  it('13.8b keeps money as text, with no bar', () => {
    renderCard({ changes: ['Your savings are now 75,500.'] })
    expect(document.querySelectorAll('.change-bar')).toHaveLength(0)
    expect(document.body.textContent).toContain('Your savings are now 75,500.')
  })

  it('13.9 does not float the market line outside a card on the review screen', () => {
    renderCard()
    const cards = [...document.querySelectorAll('.card')]
    const marketText = /hiring has (cooled|picked up|frozen)/i
    // Any market wording on this screen must live inside a card.
    const loose = [...document.querySelectorAll('.app > p')].some((el) =>
      marketText.test(el.textContent ?? ''),
    )
    expect(loose).toBe(false)
    expect(cards.length).toBeGreaterThan(0)
  })
})

describe('a month where nothing lands', () => {
  it('9.10 still shows the review screen when something is in flight', () => {
    // HIP_UX_Spec.md §1.1: a turn that resolves nothing says so. Skipping
    // straight to the next hand hides the delayed feedback the prototype is
    // built to test.
    let state = openTurn(createCampaign(content, 'swe_bigtech_28', 31), content)
    const offer = state.offers.find((o) => o.shape === 'fixed')!
    state = commitAllocation(state, content, { [offer.id]: offer.minEnergy })
    state = { ...state, pending: state.pending.map((p) => ({ ...p, resolveOnTurn: 5 })) }

    expect(screenAfterOpen(openTurn(state, content))).toBe('review')
  })

  it('9.10b tells the player what is still in motion', () => {
    let state = openTurn(createCampaign(content, 'swe_bigtech_28', 32), content)
    const offer = state.offers.find((o) => o.shape === 'fixed')!
    state = commitAllocation(state, content, { [offer.id]: offer.minEnergy })
    // Constructed rather than played to a seed: an event firing would put a
    // card on the screen and stop this exercising the empty path at all.
    state = { ...openTurn(state, content), currentOutcomes: [] }

    useStore.setState({ state, screen: 'review' })
    render(<App />)

    expect(document.body.textContent).toMatch(/nothing came back/i)
    expect(document.body.textContent).toMatch(/still in motion/i)
  })

  it('9.10c goes straight to the next hand when nothing is in flight at all', () => {
    const state = openTurn(createCampaign(content, 'swe_bigtech_28', 33), content)
    expect(screenAfterOpen({ ...state, currentOutcomes: [], pending: [] })).toBe('allocate')
  })
})

describe('retrospective', () => {
  function playOut(seed: number, choose: (s: CampaignState) => Record<string, number>) {
    let state = openTurn(createCampaign(content, 'swe_bigtech_28', seed), content)
    while (!isCampaignComplete(state)) {
      state = commitAllocation(state, content, choose(state))
      if (!isCampaignComplete(state)) state = openTurn(state, content)
    }
    return state
  }

  it('9.5 renders for a campaign in which the player did nothing at all', () => {
    const final = playOut(11, () => ({}))
    useStore.setState({ state: final, screen: 'retrospective' })

    render(<App />)

    expect(screen.getByText(/Where your energy went/)).toBeTruthy()
    expect(screen.getByText(/You never touched/)).toBeTruthy()
  })

  it('9.5b reports the allocation breakdown for a campaign that was played', () => {
    const final = playOut(12, (state) => {
      const offer = state.offers.find((o) => !o.pipelineId && o.shape === 'scalable')
      return offer ? { [offer.id]: offer.minEnergy } : {}
    })
    const retro = buildRetrospective(final, content)

    expect(retro.turnsPlayed).toBe(12)
    expect(retro.energySpent).toBeGreaterThan(0)
    expect(retro.allocation.reduce((sum, slice) => sum + slice.energy, 0)).toBe(retro.energySpent)
  })

  it('shows no score, grade or rating', () => {
    const final = playOut(13, () => ({}))
    useStore.setState({ state: final, screen: 'retrospective' })
    render(<App />)

    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/\bscore\b/i)
    expect(text).not.toMatch(/\bgrade\b/i)
    expect(text).not.toMatch(/you (win|lose)/i)
  })

  it('makes exporting the session the primary action, not restarting', () => {
    const final = playOut(15, () => ({}))
    useStore.setState({ state: final, screen: 'retrospective' })
    render(<App />)

    const primary = document.querySelector('.footer-action button.primary')
    expect(primary?.textContent).toMatch(/export/i)
  })

  it('states plainly that this is not a prediction', () => {
    const final = playOut(14, () => ({}))
    useStore.setState({ state: final, screen: 'retrospective' })
    render(<App />)
    expect(screen.getByText(/not a prediction/i)).toBeTruthy()
  })
})

describe('persistence', () => {
  it('9.6 restores an in-progress campaign identically', () => {
    let state = openTurn(createCampaign(content, 'swe_bigtech_28', 88), content)
    const offer = state.offers[0]!
    state = commitAllocation(state, content, { [offer.id]: offer.minEnergy })

    saveCampaign(state)
    const restored = loadCampaign()

    expect(restored).toEqual(state)
  })

  it('9.7 discards a save from an incompatible version instead of crashing', () => {
    const state = openTurn(createCampaign(content, 'swe_bigtech_28', 89), content)
    saveCampaign({ ...state, saveVersion: 999 })

    expect(loadCampaign()).toBeNull()
  })

  it('returns null when there is nothing saved', () => {
    clearCampaign()
    expect(loadCampaign()).toBeNull()
  })

  it('reopens a finished campaign on the retrospective, not on an empty turn', () => {
    // Regression: reloading after the last turn used to land on an allocate
    // screen with no offers, leaving the ending unreachable.
    let state = openTurn(createCampaign(content, 'swe_bigtech_28', 55), content)
    while (!isCampaignComplete(state)) {
      state = commitAllocation(state, content, {})
      if (!isCampaignComplete(state)) state = openTurn(state, content)
    }
    saveCampaign(state)

    useStore.setState({ state, screen: startingScreen(state) })
    render(<App />)

    expect(screen.getByText(/Two years on/)).toBeTruthy()
    expect(screen.queryByText(/This month/)).toBeNull()
  })
})

describe('day gate', () => {
  it('is off by default, so all twelve turns are playable in one sitting', () => {
    expect(isTurnAvailable({ dayGate: false }, '2026-08-04')).toBe(true)
    expect(isTurnAvailable({ dayGate: false, lastTurnDate: '2026-08-04' }, '2026-08-04')).toBe(true)
  })

  it('allows one turn per day when enabled, and never punishes a missed day', () => {
    expect(isTurnAvailable({ dayGate: true, lastTurnDate: '2026-08-04' }, '2026-08-04')).toBe(false)
    expect(isTurnAvailable({ dayGate: true, lastTurnDate: '2026-08-04' }, '2026-08-05')).toBe(true)
    // A three-day gap simply resumes; nothing is lost.
    expect(isTurnAvailable({ dayGate: true, lastTurnDate: '2026-08-01' }, '2026-08-05')).toBe(true)
  })
})

describe('layout', () => {
  it('13.10 shows the market as standing context in the career snapshot', () => {
    skipIntro()
    const state = openTurn(createCampaign(content, 'swe_bigtech_28', 5), content)
    // A clearly cooled market, so the phrase is deterministic.
    useStore.setState({ state: { ...state, market: { hiring: -0.12 } }, screen: 'allocate' })
    render(<App />)

    const cards = [...document.querySelectorAll('.card')]
    expect(cards.some((c) => /hiring has cooled/i.test(c.textContent ?? ''))).toBe(true)
  })

  it('14.9 shows where you stand and what is going, open, above the choices', () => {
    skipIntro()
    render(<App />)

    // No collapse control anywhere on the screen.
    expect(document.querySelectorAll('details')).toHaveLength(0)

    const headings = [...document.querySelectorAll('h2.section')].map((h) => h.textContent)
    expect(headings[0]).toMatch(/where you stand/i)
    expect(headings[1]).toMatch(/what you have going/i)
    // The choices come after the context, not before it.
    expect(headings.findIndex((h) => /this month/i.test(h ?? ''))).toBeGreaterThan(1)

    // The bars are rendered, not hidden behind a toggle.
    expect(document.querySelectorAll('.bar-fill').length).toBeGreaterThan(0)
  })

  it('14.10 draws last month’s movement on the snapshot bars', () => {
    skipIntro()
    let state = openTurn(createCampaign(content, 'swe_bigtech_28', 11), content)
    state = openTurn(commitAllocation(state, content, {}), content)

    useStore.setState({ state, screen: 'allocate' })
    render(<App />)

    // Reputation and network erode enough in a month to be worth drawing.
    expect([...document.querySelectorAll('.bar-moved')].length).toBeGreaterThan(0)
  })

  it('14.10c says nothing in prose about a month of ordinary erosion', () => {
    // The bars carry it. A paragraph of bad news for doing nothing would
    // misread a quiet month as a bad one.
    skipIntro()
    let state = openTurn(createCampaign(content, 'swe_bigtech_28', 11), content)
    state = openTurn(commitAllocation(state, content, {}), content)

    useStore.setState({ state, screen: 'allocate' })
    render(<App />)

    expect(document.body.textContent).not.toMatch(/last month:/i)
  })

  it('14.10d does put a real move into words', () => {
    skipIntro()
    const state = openTurn(createCampaign(content, 'swe_bigtech_28', 11), content)
    const lifted = {
      ...state,
      capitalAtPreviousOpen: { ...state.capitalAtOpen, evidence: state.capitalAtOpen.evidence - 6 },
    }

    useStore.setState({ state: lifted, screen: 'allocate' })
    render(<App />)

    expect(document.body.textContent).toMatch(/last month:/i)
    expect(document.body.textContent).toMatch(/more to point at/i)
  })

  it('14.10b draws no movement on the very first month', () => {
    skipIntro()
    const state = openTurn(createCampaign(content, 'swe_bigtech_28', 12), content)
    useStore.setState({ state, screen: 'allocate' })
    render(<App />)

    expect(document.querySelectorAll('.bar-moved')).toHaveLength(0)
    expect(document.body.textContent).not.toMatch(/last month:/i)
  })

  it('renders a turn counter and an energy meter on the allocate screen', () => {
    skipIntro()
    render(<App />)
    expect(screen.getByText(/Month 1 of 12/)).toBeTruthy()
    const meter = document.querySelector('.energy-meter')
    expect(meter).toBeTruthy()
    expect(within(meter as HTMLElement).getByText(/of 10 left/)).toBeTruthy()
  })
})
