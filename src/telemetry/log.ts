/**
 * Playtest instrumentation — HIP_Playtest_Protocol.md §4.
 *
 * Local only. No network, no analytics service, no identifiers. The whole
 * session leaves the machine as one file the participant hands over, which is
 * the only arrangement that is honest to tell a playtester about.
 */

import type { Allocation, CampaignState } from '@engine/types'

export type TurnTelemetry = {
  turn: number
  openedAt: number
  committedAt?: number
  energyAvailable: number
  energyAllocated: number
  energyUnused: number
  allocations: { templateId: string; category: string; energy: number }[]
  cardsOffered: string[]
  cardsExpiredUnused: string[]
  screenDwellMs: Record<string, number>
  snapshotExpanded: boolean
  pipelineViewOpened: boolean
  costInflationSeen: { category: string; from: number; to: number }[]
  probe?: { difficulty: number; awareness: string }
}

export type SessionTelemetry = {
  sessionId: string
  startedAt: number
  seed: number
  profileId: string
  turns: TurnTelemetry[]
  outcomesShown: { turn: number; fromTurn: number; band: string; templateId: string }[]
}

let session: SessionTelemetry | null = null
/**
 * Sessions already finished in this browser session.
 *
 * The retrospective's "play again" sits in the same footer position as "next
 * month", so a participant tapping through can restart before the facilitator
 * has collected anything. Archiving rather than replacing means the only
 * artifact a playtest produces cannot be destroyed by a stray tap.
 */
let archived: SessionTelemetry[] = []
let currentTurn: TurnTelemetry | null = null
let screenEnteredAt = 0
let currentScreen = ''

/** Non-cryptographic; it only has to be unique within one participant's files. */
function makeSessionId(now: number): string {
  return `s${now.toString(36)}`
}

export function startSession(state: CampaignState, now: number): void {
  if (session) archived.push(session)
  currentTurn = null
  currentScreen = ''
  session = {
    sessionId: makeSessionId(now),
    startedAt: now,
    seed: state.seed,
    profileId: state.player.profileId,
    turns: [],
    outcomesShown: [],
  }
}

export function beginTurn(state: CampaignState, energyAvailable: number, now: number): void {
  if (!session) return
  currentTurn = {
    turn: state.turn,
    openedAt: now - session.startedAt,
    energyAvailable,
    energyAllocated: 0,
    energyUnused: energyAvailable,
    allocations: [],
    cardsOffered: state.offers.map((o) => o.id),
    cardsExpiredUnused: [],
    screenDwellMs: {},
    snapshotExpanded: false,
    pipelineViewOpened: false,
    costInflationSeen: [],
  }
  for (const outcome of state.currentOutcomes) {
    session.outcomesShown.push({
      turn: state.turn,
      fromTurn: outcome.sourceTurn,
      band: outcome.band,
      templateId: outcome.sourceTemplateId,
    })
  }
}

export function enterScreen(name: string, now: number): void {
  if (currentScreen && currentTurn) {
    const spent = now - screenEnteredAt
    currentTurn.screenDwellMs[currentScreen] = (currentTurn.screenDwellMs[currentScreen] ?? 0) + spent
  }
  currentScreen = name
  screenEnteredAt = now
}

export function noteSnapshotExpanded(): void {
  if (currentTurn) currentTurn.snapshotExpanded = true
}

export function notePipelineViewOpened(): void {
  if (currentTurn) currentTurn.pipelineViewOpened = true
}

export function noteCostInflation(category: string, from: number, to: number): void {
  if (!currentTurn) return
  const seen = currentTurn.costInflationSeen.some((c) => c.category === category && c.to === to)
  if (!seen) currentTurn.costInflationSeen.push({ category, from, to })
}

/**
 * Attaches to the turn just played, not to the turn in progress.
 *
 * Probes are asked on the commit screen, which is rendered *after* `endTurn`
 * has already filed the turn and cleared `currentTurn`. Writing to
 * `currentTurn` therefore dropped every answer silently — including the whole
 * turn-12 probe — which would have left the playtest's primary metric empty
 * while looking like it was being collected.
 */
export function noteProbe(difficulty: number, awareness: string): void {
  const target = currentTurn ?? session?.turns[session.turns.length - 1]
  if (target) target.probe = { difficulty, awareness }
}

export function endTurn(
  state: CampaignState,
  allocation: Allocation,
  now: number,
): void {
  if (!session || !currentTurn) return
  enterScreen('', now)

  const record = state.history[state.history.length - 1]
  if (record) {
    currentTurn.energyAllocated = record.energySpent
    currentTurn.energyUnused = record.energyUnused
    currentTurn.allocations = record.allocations
    currentTurn.cardsExpiredUnused = record.offersExpiredUnused
  }
  currentTurn.committedAt = now - session.startedAt
  void allocation

  session.turns.push(currentTurn)
  currentTurn = null
  currentScreen = ''
}

export function exportSession(): SessionTelemetry | null {
  return session
}

export function allSessions(): SessionTelemetry[] {
  return session ? [...archived, session] : [...archived]
}

/** One file per participant, holding every campaign they played. */
export function sessionAsJson(): string {
  return JSON.stringify({ exportedSessions: allSessions().length, sessions: allSessions() }, null, 2)
}

/** Test-only: clears module state between cases. */
export function resetForTest(): void {
  session = null
  archived = []
  currentTurn = null
  currentScreen = ''
  screenEnteredAt = 0
}
