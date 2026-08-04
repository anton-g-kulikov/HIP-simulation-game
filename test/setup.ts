/**
 * Vitest setup.
 *
 * The engine is required to be deterministic (see _meta/architecture-decisions.md,
 * ADR-003). Stubbing Math.random to throw makes any accidental engine dependency
 * on ambient randomness fail loudly in tests rather than silently producing an
 * unreproducible campaign.
 */
const forbidden = () => {
  throw new Error(
    'Math.random() is forbidden. Engine randomness must come from the seeded Rng (src/engine/rng.ts).',
  )
}

beforeEach(() => {
  Math.random = forbidden
})
