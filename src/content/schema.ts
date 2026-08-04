/**
 * The content contract (ADR-004).
 *
 * Content is data, and this file is the only place that says what shape that
 * data must have. Validation is fatal: there is no permissive mode, because a
 * mistyped field that quietly defaults produces a subtly wrong game with no
 * error, which is the worst bug class in a tuned system.
 *
 * Several rules here exist to make design-doc requirements unbreakable rather
 * than merely documented — most importantly that every non-success outcome
 * still awards something (design doc §10.4).
 */

import { z } from 'zod'

// ---------------------------------------------------------------- primitives

export const capitalPathSchema = z.enum([
  'capability.technical',
  'capability.execution',
  'capability.communication',
  'capability.leadership',
  'evidence',
  'reputation',
  'network',
  'influence',
  'causeKnowledge',
])

export const fitAxisSchema = z.enum([
  'deep_technical',
  'leadership',
  'research',
  'founding',
  'communication',
  'operations',
])

export const actionCategorySchema = z.enum([
  'current_job',
  'job_search',
  'learning',
  'project',
  'network_public',
])

export const pipelineKindSchema = z.enum(['hiring', 'employer', 'learning', 'project'])

export const observationStrengthSchema = z.enum(['minor', 'notable', 'decisive'])

export const predicateSchema = z.object({
  path: z.string().min(1),
  op: z.enum(['>=', '>', '<=', '<', '==', '!=']),
  value: z.union([z.number(), z.string(), z.boolean()]),
})

export const effectSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('capital'), target: capitalPathSchema, amount: z.number() }),
  z.object({
    op: z.literal('finance'),
    target: z.enum(['monthlyComp', 'savings']),
    mode: z.enum(['add', 'set', 'multiply']),
    amount: z.number(),
  }),
  z.object({
    op: z.literal('pipeline'),
    action: z.enum(['advance', 'close', 'open']),
    kind: pipelineKindSchema.optional(),
    stage: z.string().optional(),
  }),
  z.object({ op: z.literal('observeFit'), axis: fitAxisSchema, strength: observationStrengthSchema }),
  z.object({ op: z.literal('market'), amount: z.number() }),
  z.object({ op: z.literal('energy'), amount: z.number(), turns: z.number().int().positive() }),
  z.object({ op: z.literal('unlock'), template: z.string().min(1) }),
  z.object({
    op: z.literal('role'),
    target: z.enum(['orgQuality', 'managerQuality']),
    mode: z.enum(['add', 'set']),
    amount: z.number(),
  }),
  z.object({ op: z.literal('visibleWork'), amount: z.number() }),
  z.object({ op: z.literal('seniority'), amount: z.number() }),
])

const WEIGHT_TOLERANCE = 1e-6

function sumsToOne(values: number[]): boolean {
  const total = values.reduce((s, v) => s + v, 0)
  return Math.abs(total - 1) <= WEIGHT_TOLERANCE
}

const matchWeightsSchema = z
  .record(capitalPathSchema, z.number().min(0).max(1))
  .refine((w) => sumsToOne(Object.values(w) as number[]), {
    message: 'match weights must sum to 1',
  })

const fitWeightsSchema = z
  .record(fitAxisSchema, z.number().min(0).max(1))
  .refine((w) => sumsToOne(Object.values(w) as number[]), {
    message: 'fit weights must sum to 1',
  })

/** Keys are turn offsets as strings; values are probabilities. */
const delaySchema = z
  .record(z.string().regex(/^[1-9]\d*$/), z.number().min(0).max(1))
  .refine((d) => sumsToOne(Object.values(d)), {
    message: 'delay distribution must sum to 1',
  })

const outcomeSchema = z.object({
  headline: z.string().min(1),
  effects: z.array(effectSchema),
})

// ---------------------------------------------------------------- templates

export const opportunitySchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(['hiring', 'current_job', 'learning', 'project', 'network_public']),
    category: actionCategorySchema,
    title: z.string().min(1),
    description: z.string().min(1),

    availability: z.object({
      stages: z.array(z.literal('exploitation')).nonempty(),
      professions: z.array(z.string()).nonempty(),
      seniority: z.object({ min: z.number().min(0).max(1), max: z.number().min(0).max(1) }),
      requires: z.array(predicateSchema).default([]),
      baseWeight: z.number().positive(),
      recencyPenalty: z.number().min(0).max(1).optional(),
      /** Only offered once the referenced pipeline is at one of these stages. */
      pipelineStage: z.array(z.string()).optional(),
      /** Not drawn normally; must be unlocked by an effect. */
      unlockOnly: z.boolean().optional(),
    }),

    cost: z.discriminatedUnion('shape', [
      z.object({ shape: z.literal('fixed'), base: z.number().int().positive() }),
      z.object({
        shape: z.literal('scalable'),
        min: z.number().int().positive(),
        max: z.number().int().positive(),
      }),
    ]),

    expiry: z.object({ turns: z.number().int().positive() }),

    check: z.object({
      difficulty: z.number().min(0).max(1),
      match: matchWeightsSchema,
      fit: fitWeightsSchema,
    }),

    delay: delaySchema,

    outcomes: z.object({
      strong: outcomeSchema,
      success: outcomeSchema,
      nearMiss: outcomeSchema,
      failure: outcomeSchema,
    }),

    /** Required for hiring templates: the terms of the role being pursued. */
    roleOutcome: z
      .object({
        title: z.string().min(1),
        org: z.string().min(1),
        compMultiplier: z.number().positive(),
        orgQuality: z.number().min(0).max(1),
        managerQuality: z.number().min(0).max(1),
        seniorityDelta: z.number().default(0),
      })
      .optional(),

    /**
     * What the button offers to do. It must name the effort the player is
     * buying, never the result: applying for a role is not getting it.
     */
    actionVerb: z.string().min(1).default('Do this'),

    signals: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
  })
  .superRefine((template, ctx) => {
    if (template.kind === 'hiring' && !template.roleOutcome) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['roleOutcome'],
        message: 'a hiring template must state the terms of the role it leads to',
      })
    }
    if (template.cost.shape === 'scalable' && template.cost.min > template.cost.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cost', 'min'],
        message: 'scalable cost min must not exceed max',
      })
    }
    if (template.availability.seniority.min > template.availability.seniority.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['availability', 'seniority', 'min'],
        message: 'seniority min must not exceed max',
      })
    }
    // Design doc §10.4: a partial outcome is a rule, not a convention.
    if (template.outcomes.nearMiss.effects.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['outcomes', 'nearMiss', 'effects'],
        message: 'a nearMiss outcome must award at least one partial effect',
      })
    }
    if (template.outcomes.failure.effects.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['outcomes', 'failure', 'effects'],
        message: 'a failure outcome must award at least one partial effect',
      })
    }
  })

export const eventSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(['market', 'organizational', 'personal']),
    narrative: z.object({ headline: z.string().min(1), body: z.string().min(1) }),
    trigger: z.object({
      minTurn: z.number().int().min(1),
      maxTurn: z.number().int().min(1),
      requires: z.array(predicateSchema).default([]),
      weight: z.number().positive(),
      oncePerCampaign: z.boolean().default(true),
      /** Behavioural trigger: consecutive turns spending at least this much energy. */
      afterHighEffortTurns: z.number().int().positive().optional(),
    }),
    duration: z.number().int().min(0),
    effects: z.array(effectSchema).default([]),
    opportunityModifiers: z
      .array(z.object({ template: z.string().min(1), weightMultiplier: z.number().min(0) }))
      .default([]),
  })
  .superRefine((event, ctx) => {
    if (event.trigger.minTurn > event.trigger.maxTurn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['trigger', 'maxTurn'],
        message: 'maxTurn must not be earlier than minTurn',
      })
    }
  })

export const profileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  profession: z.string().min(1),
  blurb: z.string().min(1),
  seniority: z.number().min(0).max(1),
  role: z.object({
    title: z.string().min(1),
    org: z.string().min(1),
    orgQuality: z.number().min(0).max(1),
    managerQuality: z.number().min(0).max(1),
  }),
  capital: z.object({
    capability: z.object({
      technical: z.number().min(0).max(100),
      execution: z.number().min(0).max(100),
      communication: z.number().min(0).max(100),
      leadership: z.number().min(0).max(100),
    }),
    evidence: z.number().min(0).max(100),
    reputation: z.number().min(0).max(100),
    network: z.number().min(0).max(100),
    influence: z.number().min(0).max(100),
    causeKnowledge: z.number().min(0).max(100),
  }),
  finance: z.object({
    monthlyComp: z.number().nonnegative(),
    monthlyBurn: z.number().nonnegative(),
    savings: z.number().nonnegative(),
  }),
  /** The axis this profile's history implies, drawn from a higher-mean distribution. */
  strongFitAxis: fitAxisSchema,
})

export type OpportunityTemplate = z.infer<typeof opportunitySchema>
export type EventTemplate = z.infer<typeof eventSchema>
export type Profile = z.infer<typeof profileSchema>
export type ContentEffect = z.infer<typeof effectSchema>
export type Predicate = z.infer<typeof predicateSchema>

// ---------------------------------------------------------------- parsing

function formatIssues(error: z.ZodError, file: string, id: unknown): string {
  const lines = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(root)'
    return `  • ${path}: ${issue.message}`
  })
  const label = typeof id === 'string' ? ` (id: ${id})` : ''
  return `Invalid content in ${file}${label}:\n${lines.join('\n')}`
}

// Generic over the schema rather than its output type: `.default()` makes input
// and output types differ, and pinning only the output makes them unassignable.
function parseWith<S extends z.ZodTypeAny>(schema: S, raw: unknown, file: string): z.infer<S> {
  const result = schema.safeParse(raw)
  if (!result.success) {
    throw new Error(formatIssues(result.error, file, (raw as { id?: unknown })?.id))
  }
  return result.data
}

export function parseOpportunity(raw: unknown, file: string): OpportunityTemplate {
  return parseWith(opportunitySchema, raw, file)
}

export function parseEvent(raw: unknown, file: string): EventTemplate {
  return parseWith(eventSchema, raw, file)
}

export function parseProfile(raw: unknown, file: string): Profile {
  return parseWith(profileSchema, raw, file)
}

/**
 * Cross-template rules that a per-template schema cannot express: ids must be
 * unique across the whole set, and every referenced id must resolve.
 */
export function validateContentSet(
  opportunities: OpportunityTemplate[],
  events: EventTemplate[],
  profiles: Profile[],
): void {
  const problems: string[] = []

  const seen = new Set<string>()
  for (const id of [...opportunities, ...events, ...profiles].map((t) => t.id)) {
    if (seen.has(id)) problems.push(`duplicate template id: ${id}`)
    seen.add(id)
  }

  const opportunityIds = new Set(opportunities.map((o) => o.id))

  for (const opportunity of opportunities) {
    for (const outcome of Object.values(opportunity.outcomes)) {
      for (const effect of outcome.effects) {
        if (effect.op === 'unlock' && !opportunityIds.has(effect.template)) {
          problems.push(
            `${opportunity.id}: unlock effect points at unknown template "${effect.template}"`,
          )
        }
      }
    }
  }

  for (const event of events) {
    for (const modifier of event.opportunityModifiers) {
      if (!opportunityIds.has(modifier.template)) {
        problems.push(
          `${event.id}: opportunityModifier points at unknown template "${modifier.template}"`,
        )
      }
    }
    for (const effect of event.effects) {
      if (effect.op === 'unlock' && !opportunityIds.has(effect.template)) {
        problems.push(`${event.id}: unlock effect points at unknown template "${effect.template}"`)
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`Content set is invalid:\n${problems.map((p) => `  • ${p}`).join('\n')}`)
  }
}

// ---------------------------------------------------------------- game tuning

/**
 * Structural game numbers that are not per-template: pipeline stage costs and
 * difficulties, market volatility, offer counts. These belong in content rather
 * than in engine code (ADR-004) because they are tuned, not designed once.
 */

const stageOutcomeSchema = z.object({
  headline: z.string().min(1),
  effects: z.array(effectSchema).default([]),
})

const hiringStageSchema = z.object({
  stage: z.string().min(1),
  label: z.string().min(1),
  /** The effort this stage asks for, for the button. */
  verb: z.string().min(1),
  cost: z.number().int().positive(),
  difficulty: z.number().min(0).max(1),
  outcomes: z.object({
    strong: stageOutcomeSchema,
    success: stageOutcomeSchema,
    nearMiss: stageOutcomeSchema,
    failure: stageOutcomeSchema,
  }),
})

export const gameTuningSchema = z.object({
  hiring: z.object({
    /** Taking an offer is the one hiring action whose result is certain. */
    acceptVerb: z.string().min(1),
    maxConcurrent: z.number().int().positive(),
    lapseAfterTurns: z.number().int().positive(),
    referralNetworkFactor: z.number().min(0).max(1),
    referralBonus: z.number().min(0).max(0.5),
    rampTurns: z.number().int().min(0),
    rampExecutionFactor: z.number().min(0).max(1),
    rampEvidenceFactor: z.number().min(0).max(1),
    acceptCost: z.number().int().positive(),
    stages: z.array(hiringStageSchema).nonempty(),
  }),
  employer: z.object({
    recognitionThreshold: z.number().positive(),
    visibleWorkDecayPerTurn: z.number().min(0).max(1),
    visibilityBase: z.number().min(0).max(1),
    visibilityFromManager: z.number().min(0).max(1),
    raiseMultiplier: z.number().positive(),
    seniorityStep: z.number().min(0).max(1),
    recognitionHeadline: z.string().min(1),
    recognitionEffects: z.array(effectSchema).default([]),
  }),
  learning: z.object({
    unappliedDecayFactor: z.number().min(0).max(1),
    applyTag: z.string().min(1),
  }),
  project: z.object({
    progressPerEnergy: z.number().positive(),
    prototypeThreshold: z.number().positive(),
    launchTag: z.string().min(1),
  }),
  market: z.object({
    drift: z.number().min(0).max(1),
    volatility: z.number().min(0),
    min: z.number(),
    max: z.number(),
  }),
  offers: z.object({
    minPerTurn: z.number().int().positive(),
    maxPerTurn: z.number().int().positive(),
    recencyWindow: z.number().int().min(0),
    defaultRecencyPenalty: z.number().min(0).max(1),
    freshCategoryWindow: z.number().int().min(0),
  }),
  events: z.object({
    minGapTurns: z.number().int().min(0),
    firstEligibleTurn: z.number().int().min(1),
    highEffortThreshold: z.number().int().min(0),
  }),
})

export type GameTuning = z.infer<typeof gameTuningSchema>
export type HiringStageConfig = z.infer<typeof hiringStageSchema>

export function parseGameTuning(raw: unknown, file: string): GameTuning {
  return parseWith(gameTuningSchema, raw, file)
}
