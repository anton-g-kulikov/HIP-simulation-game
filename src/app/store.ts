/**
 * App state. Wraps the engine and owns no game logic of its own — every rule
 * lives behind `src/engine/index.ts` (ADR-002).
 */

import { create } from 'zustand'
import { loadContent, type Content } from '@content/loader'
import {
  commitAllocation,
  createCampaign,
  describeOffers,
  effectiveBudget,
  inflatedCost,
  isCampaignComplete,
  openTurn,
} from '@engine/index'
import type { Allocation, CampaignState, OfferView } from '@engine/types'
import {
  clearCampaign,
  isTurnAvailable,
  loadCampaign,
  loadSettings,
  saveCampaign,
  saveSettings,
  type Settings,
} from '@persistence/save'
import * as telemetry from '@telemetry/log'

export type Screen = 'start' | 'review' | 'allocate' | 'commit' | 'retrospective'

const PROFILE_ID = 'swe_bigtech_28'

export type Store = {
  content: Content
  state: CampaignState
  screen: Screen
  draft: Allocation
  settings: Settings
  error: string | null
  revealHidden: boolean

  offers: () => OfferView[]
  budget: () => number
  spent: () => number
  remaining: () => number
  chargeFor: (view: OfferView, effort: number) => number
  canAfford: (view: OfferView, effort: number) => boolean

  setEffort: (offerId: string, effort: number) => void
  clearDraft: () => void
  goTo: (screen: Screen) => void
  commit: () => void
  advance: () => void
  restart: (seed?: number) => void
  setSeed: (seed: number) => void
  toggleDayGate: () => void
  toggleReveal: () => void
  dismissError: () => void
  turnAvailable: () => boolean
}

const content = loadContent()

function newCampaign(seed: number): CampaignState {
  return openTurn(createCampaign(content, PROFILE_ID, seed), content)
}

/**
 * Seeds come from the clock so a fresh campaign is a fresh world. The engine
 * itself never reads a clock; this is the app choosing a number.
 */
function seedFromClock(): number {
  return Math.floor(Date.now() % 2147483647)
}

/**
 * Which screen a restored campaign should open on.
 *
 * A finished campaign has to land on the retrospective. Without this, reloading
 * after the last turn dropped the player onto an allocate screen with no offers
 * and no way forward — the campaign was over and the ending was unreachable.
 */
/**
 * Which screen a freshly opened turn lands on.
 *
 * A month where nothing resolved still gets the review screen if anything is in
 * flight, so the game can say "nothing came back" (HIP_UX_Spec.md §1.1).
 * Skipping it hides the delay, which is the mechanic the prototype exists to
 * test. Only a genuinely empty month — nothing resolved, nothing pending —
 * goes straight to the next hand.
 */
export function screenAfterOpen(state: CampaignState): Screen {
  return state.currentOutcomes.length > 0 || state.pending.length > 0 ? 'review' : 'allocate'
}

export function startingScreen(state: CampaignState): Screen {
  if (isCampaignComplete(state)) return 'retrospective'
  // Only a campaign that has not been played yet gets the premise screen.
  if (state.turn === 1 && state.history.length === 0) return 'start'
  return screenAfterOpen(state)
}

function initialState(): CampaignState {
  const saved = loadCampaign()
  if (saved) return saved.openedTurn === saved.turn ? saved : openTurn(saved, content)
  return newCampaign(seedFromClock())
}

export const useStore = create<Store>((set, get) => {
  const start = initialState()
  telemetry.startSession(start, Date.now())
  telemetry.beginTurn(start, effectiveBudget(start.player.energyModifier), Date.now())

  return {
    content,
    state: start,
    screen: startingScreen(start),
    draft: {},
    settings: loadSettings(),
    error: null,
    revealHidden: false,

    offers: () => describeOffers(get().state, get().content),

    budget: () => effectiveBudget(get().state.player.energyModifier),

    spent: () => {
      const { state, draft } = get()
      let total = 0
      for (const [offerId, effort] of Object.entries(draft)) {
        const offer = state.offers.find((o) => o.id === offerId)
        if (!offer || effort <= 0) continue
        total += offer.pipelineId ? effort : inflatedCost(effort, state.player.heat[offer.category])
      }
      return total
    },

    remaining: () => get().budget() - get().spent(),

    chargeFor: (view, effort) =>
      view.offer.pipelineId
        ? effort
        : inflatedCost(effort, get().state.player.heat[view.offer.category]),

    canAfford: (view, effort) => {
      const { draft } = get()
      const current = draft[view.offer.id] ?? 0
      const currentCharge = current > 0 ? get().chargeFor(view, current) : 0
      const nextCharge = effort > 0 ? get().chargeFor(view, effort) : 0
      return get().remaining() + currentCharge - nextCharge >= 0
    },

    setEffort: (offerId, effort) =>
      set((store) => {
        const draft = { ...store.draft }
        if (effort <= 0) delete draft[offerId]
        else draft[offerId] = effort
        return { draft }
      }),

    clearDraft: () => set({ draft: {} }),

    goTo: (screen) => {
      telemetry.enterScreen(screen, Date.now())
      set({ screen })
    },

    commit: () => {
      const { state, content: c, draft } = get()
      try {
        const next = commitAllocation(state, c, draft)
        telemetry.endTurn(next, draft, Date.now())
        saveCampaign(next)
        set({ state: next, draft: {}, error: null, screen: 'commit' })
      } catch (error) {
        set({ error: (error as Error).message })
      }
    },

    advance: () => {
      const { state, content: c, settings } = get()

      if (isCampaignComplete(state)) {
        set({ screen: 'retrospective' })
        return
      }

      const today = new Date().toISOString().slice(0, 10)
      if (!isTurnAvailable(settings, today)) return

      const next = openTurn(state, c)
      const nextSettings = settings.dayGate ? { ...settings, lastTurnDate: today } : settings
      if (settings.dayGate) saveSettings(nextSettings)

      saveCampaign(next)
      telemetry.beginTurn(next, effectiveBudget(next.player.energyModifier), Date.now())
      telemetry.enterScreen('review', Date.now())

      set({
        state: next,
        settings: nextSettings,
        draft: {},
        screen: screenAfterOpen(next),
      })
    },

    restart: (seed) => {
      clearCampaign()
      const next = newCampaign(seed ?? seedFromClock())
      telemetry.startSession(next, Date.now())
      telemetry.beginTurn(next, effectiveBudget(next.player.energyModifier), Date.now())
      saveCampaign(next)
      set({ state: next, draft: {}, screen: startingScreen(next), error: null })
    },

    setSeed: (seed) => get().restart(seed),

    toggleDayGate: () =>
      set((store) => {
        const settings = { ...store.settings, dayGate: !store.settings.dayGate }
        saveSettings(settings)
        return { settings }
      }),

    toggleReveal: () => set((store) => ({ revealHidden: !store.revealHidden })),

    dismissError: () => set({ error: null }),

    turnAvailable: () =>
      isTurnAvailable(get().settings, new Date().toISOString().slice(0, 10)),
  }
})
