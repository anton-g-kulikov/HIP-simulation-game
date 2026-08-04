/**
 * The shared vocabulary of the simulation.
 *
 * Everything here must be JSON-serialisable: no classes, no functions, no Map or
 * Set. `CampaignState` is saved by `JSON.stringify` and restored by `JSON.parse`
 * with no revival step (system-documentation.md, invariant 3).
 */

export type ActionCategory =
  | 'current_job'
  | 'job_search'
  | 'learning'
  | 'project'
  | 'network_public'

export type FitAxis =
  | 'deep_technical'
  | 'leadership'
  | 'research'
  | 'founding'
  | 'communication'
  | 'operations'

export type CapabilityKey = 'technical' | 'execution' | 'communication' | 'leadership'

export type ResultBand = 'strong' | 'success' | 'nearMiss' | 'failure'

export type PipelineKind = 'hiring' | 'employer' | 'learning' | 'project'

export type ObservationStrength = 'minor' | 'notable' | 'decisive'

// ---------------------------------------------------------------- capital

export type Capability = Record<CapabilityKey, number>

export type CapitalState = {
  capability: Capability
  evidence: number
  reputation: number
  network: number
  /** Tracked but effectively static in Level 1; present so Levels 2–3 need no reshape. */
  influence: number
  causeKnowledge: number
}

export type FinanceState = {
  monthlyComp: number
  monthlyBurn: number
  savings: number
}

export type HeatMap = Record<ActionCategory, number>

export type FitVector = Record<FitAxis, number>

export type FitObservation = { turn: number; strength: ObservationStrength }

export type FitObservations = Record<FitAxis, FitObservation[]>

/** Dotted paths into CapitalState that content templates may weight or target. */
export type CapitalPath =
  | 'capability.technical'
  | 'capability.execution'
  | 'capability.communication'
  | 'capability.leadership'
  | 'evidence'
  | 'reputation'
  | 'network'
  | 'influence'
  | 'causeKnowledge'

export type MatchWeights = Partial<Record<CapitalPath, number>>
export type FitWeights = Partial<Record<FitAxis, number>>

// ---------------------------------------------------------------- resolution

export type CheckInputs = {
  /** 0–1, how well the player's measured capital matches what this needs. */
  match: number
  /** 0–1, weighted hidden personal fit. */
  fit: number
  /** Energy committed to this action this turn. */
  energy: number
  /** 0–1, cumulative prior investment in the same pipeline. */
  momentum: number
  /** 0–1, from the content template. */
  difficulty: number
  marketModifier: number
  eventModifier: number
}

export type Contributor = {
  label: string
  direction: 'helped' | 'hurt'
  weight: 'minor' | 'notable' | 'decisive'
}

export type Luck = 'ran against you' | 'as expected' | 'ran your way'

export type Explanation = {
  contributors: Contributor[]
  luck: Luck
}

export type CheckResult = {
  band: ResultBand
  probability: number
  roll: number
  explanation: Explanation
}

// ---------------------------------------------------------------- world

export type MarketState = {
  /** Additive modifier to hiring probabilities, in [-0.15, 0.15]. */
  hiring: number
}

export type ActiveEvent = {
  templateId: string
  startedTurn: number
  endsAfterTurn: number
}

export type RoleState = {
  title: string
  org: string
  orgQuality: number
  managerQuality: number
}

// ---------------------------------------------------------------- pipelines

export type HiringStage =
  | 'discovered'
  | 'applied'
  | 'screen'
  | 'early_interview'
  | 'advanced_interview'
  | 'assignment'
  | 'offer'
  | 'accepted'
  | 'rejected'
  | 'lapsed'

export type ProjectStage = 'idea' | 'prototype' | 'launched' | 'traction' | 'dormant'

export type Pipeline = {
  id: string
  kind: PipelineKind
  templateId: string
  title: string
  /** Stage name; the legal set depends on `kind`. */
  stage: string
  /** Cumulative energy invested, feeds the momentum term. */
  investedEnergy: number
  /** Turn of the most recent player investment, for lapse detection. */
  lastInvestedTurn: number
  openedTurn: number
  closed: boolean
  /** Kind-specific scratch state (visibleWork, referral, progress, ...). */
  data: Record<string, number | string | boolean>
}

// ---------------------------------------------------------------- offers

/** A concrete, allocatable thing on the table this turn. */
export type Offer = {
  id: string
  templateId: string
  category: ActionCategory
  /** Set when this offer continues an existing pipeline rather than starting one. */
  pipelineId?: string
  /** Base cost before repetition inflation. */
  baseCost: number
  shape: 'fixed' | 'scalable'
  minEnergy: number
  maxEnergy: number
  expiresAfterTurn: number
  createdTurn: number
}

/** Everything the UI needs to render one card. Contains no probabilities. */
export type OfferView = {
  offer: Offer
  title: string
  description: string
  /** Cost after repetition inflation. */
  cost: number
  /** Present only when repetition raised the cost above base. */
  inflatedFrom?: number
  signals: string[]
  expiresIn: number
  isCommitment: boolean
  pipelineSummary?: string
}

export type Allocation = Record<string, number>

// ---------------------------------------------------------------- effects

export type Effect =
  | { op: 'capital'; target: CapitalPath; amount: number }
  | { op: 'finance'; target: 'monthlyComp' | 'savings'; mode: 'add' | 'set' | 'multiply'; amount: number }
  | { op: 'pipeline'; action: 'advance' | 'close' | 'open'; kind?: PipelineKind; stage?: string }
  | { op: 'observeFit'; axis: FitAxis; strength: ObservationStrength }
  | { op: 'market'; amount: number }
  | { op: 'energy'; amount: number; turns: number }
  | { op: 'unlock'; template: string }
  | { op: 'role'; target: 'orgQuality' | 'managerQuality'; mode: 'add' | 'set'; amount: number }
  | { op: 'visibleWork'; amount: number }
  | { op: 'seniority'; amount: number }

export type OpportunityKind =
  | 'hiring'
  | 'current_job'
  | 'learning'
  | 'project'
  | 'network_public'

export type PendingEffect = {
  id: string
  sourceTemplateId: string
  sourceTitle: string
  sourceTurn: number
  resolveOnTurn: number
  kind: OpportunityKind
  /** Set for a pipeline continuation: which stage was attempted. */
  stage?: string
  /** Rolled at commit for a hiring application; decides whether the screen is skipped. */
  referral?: boolean
  pipelineId?: string
  energySpent: number
  /** Rolled at commit time, not at resolution (ADR-005). */
  result: CheckResult
  headline: string
  effects: Effect[]
}

/**
 * Where an outcome card came from. Events and system notices are not results:
 * they must not be labelled with a success band, because the player did not do
 * anything to earn them.
 */
export type OutcomeKind = 'result' | 'event' | 'recognition' | 'lapse'

export type OutcomeCard = {
  id: string
  kind: OutcomeKind
  sourceTemplateId: string
  sourceTitle: string
  sourceTurn: number
  turnsAgo: number
  band: ResultBand
  headline: string
  explanation: Explanation
  changes: string[]
}

// ---------------------------------------------------------------- history

export type TurnRecord = {
  turn: number
  /** Categories used, so cooldown can skip them next turn. */
  categoriesUsed: ActionCategory[]
  energyBudget: number
  energySpent: number
  energyUnused: number
  allocations: { templateId: string; category: ActionCategory; energy: number }[]
  offersShown: string[]
  offersExpiredUnused: string[]
  eventTemplateId?: string
  outcomes: OutcomeCard[]
}

// ---------------------------------------------------------------- player

export type PlayerState = {
  profileId: string
  role: RoleState
  seniority: number
  capital: CapitalState
  finance: FinanceState
  hiddenFit: FitVector
  fitObservations: FitObservations
  heat: HeatMap
  /** Additive energy modifier from events, applied then decremented per turn. */
  energyModifier: number
  energyModifierTurnsLeft: number
  /** Turns of post-job-change ramp penalty remaining. */
  rampTurnsLeft: number
}

export type CampaignPhase = 'awaiting_allocation' | 'complete'

export type CampaignState = {
  saveVersion: number
  seed: number
  rngCursor: number
  turn: number
  ageMonths: number
  stage: 'exploitation'
  phase: CampaignPhase

  player: PlayerState
  market: MarketState
  activeEvents: ActiveEvent[]
  firedEventTemplateIds: string[]
  pipelines: Pipeline[]
  offers: Offer[]
  pending: PendingEffect[]
  /** Outcomes that resolved at the start of the current turn. */
  currentOutcomes: OutcomeCard[]
  /** Templates unlocked by effects, beyond their normal availability rules. */
  unlockedTemplateIds: string[]
  history: TurnRecord[]
  /** Set when the last turn was opened, so openTurn is idempotent. */
  openedTurn: number
}
