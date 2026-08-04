/**
 * Versioned single-slot save (ADR-006).
 *
 * A save from an incompatible version is discarded rather than migrated or
 * crashed on: during a prototype the campaign is cheap to restart and a
 * half-migrated state is expensive to debug.
 */

import { SAVE_VERSION } from '@engine/index'
import type { CampaignState } from '@engine/types'

const KEY = 'hip.campaign.v1'
const SETTINGS_KEY = 'hip.settings.v1'

export type Settings = {
  /** When true, only one turn per real day may be opened. */
  dayGate: boolean
  /** ISO date string of the last turn opened, for the day gate. */
  lastTurnDate?: string
}

const DEFAULT_SETTINGS: Settings = { dayGate: false }

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    // Private browsing and blocked-storage modes throw on access.
    return null
  }
}

export function saveCampaign(state: CampaignState): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(KEY, JSON.stringify(state))
  } catch {
    // A full quota should not take the game down mid-turn.
  }
}

export function loadCampaign(): CampaignState | null {
  const store = storage()
  if (!store) return null

  const raw = store.getItem(KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as CampaignState
    if (parsed.saveVersion !== SAVE_VERSION) {
      store.removeItem(KEY)
      return null
    }
    return parsed
  } catch {
    store.removeItem(KEY)
    return null
  }
}

export function clearCampaign(): void {
  storage()?.removeItem(KEY)
}

export function loadSettings(): Settings {
  const store = storage()
  if (!store) return { ...DEFAULT_SETTINGS }
  try {
    const raw = store.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Settings) } : { ...DEFAULT_SETTINGS }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: Settings): void {
  try {
    storage()?.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Ignored for the same reason as above.
  }
}

/**
 * The day gate, kept in the app layer because the engine has no clock (ADR-002).
 * Missing a day pauses the campaign; it never punishes (design doc §18).
 */
export function isTurnAvailable(settings: Settings, today: string): boolean {
  if (!settings.dayGate) return true
  return settings.lastTurnDate !== today
}
