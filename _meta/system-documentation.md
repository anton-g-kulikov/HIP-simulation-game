# System Documentation

Evergreen description of how the prototype is put together. Status and roadmap live in [project-task-list.md](project-task-list.md); rationale lives in [architecture-decisions.md](architecture-decisions.md); mechanics live in [HIP_Simulation_Spec.md](specs/HIP_Simulation_Spec.md).

---

## Repository structure

```
/                          root: config only, no source
├── src/
│   ├── engine/            pure simulation — no framework, no I/O (ADR-002)
│   │   ├── rng.ts         seeded PRNG and distributions
│   │   ├── types.ts       CampaignState and every shape it contains
│   │   ├── tuning.ts      engine-level constants (curves, decay rates)
│   │   ├── energy.ts      cost, repetition heat, cooldown
│   │   ├── capital.ts     capital gains, diminishing returns, decay
│   │   ├── fit.ts         hidden fit vector, observations, confidence bands
│   │   ├── resolution.ts  the outcome function
│   │   ├── effects.ts     declarative effect interpreter (ADR-009)
│   │   ├── signals.ts     hidden values → qualitative phrases
│   │   ├── market.ts      hiring-market random walk
│   │   ├── events.ts      event eligibility and application
│   │   ├── opportunities.ts  eligibility filter, weighted draw, expiry
│   │   ├── pipelines/     hiring, employer, learning, project
│   │   ├── campaign.ts    campaign creation from a profile
│   │   ├── turn.ts        openTurn / commitAllocation
│   │   └── index.ts       the engine's public API
│   ├── content/
│   │   ├── schema.ts      Zod schemas — the content contract
│   │   ├── loader.ts      load, validate, index
│   │   └── data/          opportunities, events, profiles as JSON
│   ├── app/               React: screens, components, store
│   ├── devtools/          balance harness, scripted policies, debug panel
│   ├── persistence/       versioned localStorage save
│   ├── telemetry/         local-only playtest session log
│   └── main.tsx
├── test/                  mirrors src/ (ADR-007)
│   ├── test-documentation.md
│   └── fixtures/
└── _meta/                 all project documentation
```

---

## Engine public API

Everything the app layer may call is re-exported from `src/engine/index.ts`. The app never reaches into engine internals.

| Function | Shape | Purpose |
|---|---|---|
| `createCampaign` | `(content, profileId, seed) => CampaignState` | Roll hidden fit, seed starting capital, return turn-1 state |
| `openTurn` | `(state, content) => CampaignState` | Resolve pending effects, decay, roll events, generate opportunities. Idempotent for a given turn. |
| `commitAllocation` | `(state, content, allocation) => CampaignState` | Charge energy, raise heat, roll outcomes, schedule pending effects, advance the turn |
| `describeOffer` | `(state, offer, content) => OfferView` | Everything the UI needs to render one card, including qualitative signals and the live repetition-inflated cost |
| `isCampaignComplete` | `(state) => boolean` | True after turn 12 is committed |
| `buildRetrospective` | `(state) => Retrospective` | End-of-campaign summary from the history log |

`openTurn` and `commitAllocation` are the only state transitions. The player's entire input surface is the `allocation` argument: a map from offer id to energy.

### Turn lifecycle

```
openTurn(state)
  1. resolvePending      effects whose resolveOnTurn === turn fire → OutcomeCard[]
  2. applyDecay          reputation/network/capability decay, heat cooldown
  3. advanceMarket       hiring-market random walk
  4. rollEvent           at most one, gated by trigger predicates
  5. generateOffers      eligibility filter → weighted draw → 4–7 offers
                         + active pipeline continuations, always shown

           ── player allocates energy (the only input) ──

commitAllocation(state, allocation)
  6. validate            affordability against the inflated costs
  7. charge + heat       energy spent, heat incremented per category used
  8. roll outcomes       probability computed and die rolled now (ADR-005)
  9. schedule            pending effects with per-template delay draws
 10. record history      TurnRecord appended for the retrospective
 11. turn += 1
```

---

## Invariants

These hold across the whole engine and are covered by tests:

1. **No ambient randomness.** All randomness comes from the campaign's `Rng`. Enforced by a throwing `Math.random` stub in `test/setup.ts`.
2. **Determinism.** `(seed, profileId, allocationLog)` reproduces a campaign byte-identically.
3. **Serialisability.** `CampaignState` survives a `JSON.parse(JSON.stringify(state))` round trip with no behaviour change. No class instances, no functions, no `Map`/`Set` in state.
4. **Every failure pays something.** No resolution band produces an empty effect list; enforced by the content schema and covered by a test over all loaded content.
5. **Every resolution explains itself.** No outcome reaches the app layer without an `Explanation` payload derived from the same numbers that produced the result.
6. **Capital stays bounded.** All 0–100 dimensions are clamped after every mutation.
7. **Energy is never overspent.** `commitAllocation` rejects an allocation exceeding the budget rather than clamping it silently.

---

## Commands

```bash
npm run dev         # dev server
npm test            # full test suite
npm run test:watch  # watch mode
npm run typecheck   # tsc --noEmit
npm run build       # typecheck + production build
npm run harness     # headless Monte Carlo balance run
```

---

## Content pipeline

Content JSON is validated at load by `src/content/schema.ts`. A validation failure throws with the file, the field path, and the expected shape — there is no permissive mode (ADR-004).

The loader returns a `Content` object holding indexed templates, the profile registry, and tuning constants. Every engine function that needs game numbers takes `Content` as a parameter; no engine module imports content directly. This is what allows the harness to run the same engine against modified content without touching engine code.
