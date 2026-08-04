/**
 * Content loading and indexing.
 *
 * `buildContent` is the only way to obtain a `Content`, and it always validates
 * (ADR-004). Engine functions take `Content` as a parameter and never import
 * content directly, which is what lets the balance harness run the same engine
 * against modified numbers without touching engine code.
 */

import {
  parseEvent,
  parseGameTuning,
  parseOpportunity,
  parseProfile,
  validateContentSet,
  type EventTemplate,
  type GameTuning,
  type OpportunityTemplate,
  type Profile,
} from './schema'

import tuningJson from './data/tuning.json'
import opportunitiesJson from './data/opportunities.json'
import eventsJson from './data/events.json'
import profilesJson from './data/profiles.json'

export type Content = {
  opportunities: OpportunityTemplate[]
  opportunityById: Record<string, OpportunityTemplate>
  events: EventTemplate[]
  eventById: Record<string, EventTemplate>
  profiles: Record<string, Profile>
  tuning: GameTuning
}

export type RawContent = {
  opportunities: unknown[]
  events: unknown[]
  profiles: unknown[]
  tuning?: unknown
}

function indexById<T extends { id: string }>(items: T[]): Record<string, T> {
  const index: Record<string, T> = {}
  for (const item of items) index[item.id] = item
  return index
}

export function buildContent(raw: RawContent): Content {
  const opportunities = raw.opportunities.map((o) => parseOpportunity(o, 'opportunities.json'))
  const events = raw.events.map((e) => parseEvent(e, 'events.json'))
  const profiles = raw.profiles.map((p) => parseProfile(p, 'profiles.json'))
  const tuning = parseGameTuning(raw.tuning ?? tuningJson, 'tuning.json')

  validateContentSet(opportunities, events, profiles)

  return {
    opportunities,
    opportunityById: indexById(opportunities),
    events,
    eventById: indexById(events),
    profiles: indexById(profiles),
    tuning,
  }
}

let cached: Content | null = null

/** The authored game content. Validated once, then reused. */
export function loadContent(): Content {
  if (!cached) {
    cached = buildContent({
      opportunities: opportunitiesJson as unknown[],
      events: eventsJson as unknown[],
      profiles: profilesJson as unknown[],
      tuning: tuningJson,
    })
  }
  return cached
}

export function requireTemplate(content: Content, id: string): OpportunityTemplate {
  const template = content.opportunityById[id]
  if (!template) throw new Error(`Unknown opportunity template: ${id}`)
  return template
}

export function requireProfile(content: Content, id: string): Profile {
  const profile = content.profiles[id]
  if (!profile) throw new Error(`Unknown profile: ${id}`)
  return profile
}
