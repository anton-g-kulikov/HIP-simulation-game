# Architecture Decisions

Technical architecture decisions and their tradeoffs. This document owns *how the system is built*. Game design decisions live in [HIP_Decisions_And_Open_Questions.md](specs/HIP_Decisions_And_Open_Questions.md); mechanics live in [HIP_Simulation_Spec.md](specs/HIP_Simulation_Spec.md).

---

## ADR-001 — Vite + React + TypeScript web

**Decision.** The prototype is a mobile-first responsive web app on Vite, React 18 and TypeScript.

**Alternatives.** Expo/React Native, native SwiftUI, headless engine only.

**Why.** The prototype's purpose is balance tuning and playtesting, both of which are dominated by iteration speed. Native builds cost minutes per cycle; the web build costs seconds. React Native was rejected for the same reason, plus the prototype does not test notifications. A headless engine alone cannot answer a question about whether a loop is engaging.

**Cost.** No app store, no push notifications, no device-level daily gate. All three are deferred to a milestone that actually tests retention.

---

## ADR-002 — The engine is pure

**Decision.** Everything under `src/engine/` is pure TypeScript: no React, no DOM, no `localStorage`, no `fetch`, no `Date.now()`, no ambient randomness. Every engine entry point has the shape `(state, input) => newState`.

**Why.** Three things depend on it. The Monte Carlo balance harness needs to run tens of thousands of campaigns headlessly. Save/load reduces to JSON serialisation of a plain object. Porting to React Native or a server later touches no engine code.

**Enforcement.** `test/setup.ts` replaces `Math.random` with a throwing stub before every test, so an accidental dependency on ambient randomness fails loudly. Engine modules import nothing from `src/app/`.

**Cost.** Time is a parameter rather than something the engine can read, so the day gate lives entirely in the app layer.

---

## ADR-003 — Determinism by seeded PRNG

**Decision.** One `mulberry32` stream per campaign. The stream's position (`rngCursor`) is part of serialised state. A campaign is fully reproduced by `(seed, profileId, allocationLog)`.

**Why.** Reproducible bug reports, replayable playtest sessions, and a balance harness that can compare two policies *on the same world* rather than on two different ones. Paired-seed comparison is what makes invariant 6 in the simulation spec meaningful.

**Cost.** Every consumer must draw from the shared stream in a fixed order. Reordering draws changes historical campaigns, so the ordering is effectively part of the save format.

---

## ADR-004 — Content is validated JSON, not code

**Decision.** Opportunities, events, profiles and tuning constants live in JSON under `src/content/data/`, validated against Zod schemas at load. Validation failure is fatal and names file, field path, and expectation.

**Why.** These numbers change constantly during tuning, and they should be editable by someone who is not editing TypeScript. Silent content failure is the worst bug class in a tuned system — a mistyped field that quietly defaults produces a subtly wrong game with no error.

**Cost.** A schema change requires touching two places. Accepted: the schema is the content contract, and having it be explicit is the point.

---

## ADR-005 — Outcomes roll at commit, narrate at resolution

**Decision.** When the player commits energy to an action, the probability is computed and the die is rolled immediately. The result is stored on the pending effect. Narrative text is generated later, when the effect resolves.

**Why.** If the roll happened at resolution, an event landing in between could silently change an outcome the player had already earned, which breaks the causal contract the review screen makes. Rolling early also means the pending queue holds facts rather than promises, which simplifies save/load.

**Cost.** An event cannot legitimately affect an in-flight outcome's *result*. It can still affect its framing, and it affects everything committed after it.

---

## ADR-006 — Versioned localStorage, single slot

**Decision.** One save slot, a `saveVersion` integer, a migration switch. No accounts, no cloud.

**Why.** Sufficient for playtests, where sessions are single-sitting and supervised. Anything more is infrastructure that answers no prototype question.

**Cost.** A browser data clear loses the campaign. Acceptable at this stage.

---

## ADR-007 — Tests live in `/test`, mirroring `/src`

**Decision.** No colocated `*.test.ts` beside source. The test tree mirrors the source tree, and test intent is documented in [../test/test-documentation.md](../test/test-documentation.md).

**Why.** Required by the repository organisation reference in the metacoding workflow, which makes `/test` the single home for test intent and fixtures.

**Cost.** Slightly longer import paths, resolved by path aliases.

---

## ADR-008 — No player-facing score

**Decision.** The prototype has no score, grade, or rating. The retrospective reports what happened. The harness composite score exists only in `src/devtools/` and is unreachable from the app.

**Why.** A visible number becomes the thing players optimise, which would contaminate exactly the behavioural signal the playtest is trying to read. There is also no impact model yet for a score to be a score of.

**Cost.** Players who want a win condition will find the ending unsatisfying. That reaction is itself a finding worth recording.

---

## ADR-009 — Effects are a declarative grammar

**Decision.** Content templates describe outcomes as arrays of effect objects (`{"op": "capital", "target": "evidence", "amount": 6}`) interpreted by the engine, rather than as code.

**Why.** Keeps ADR-004 honest — if outcomes were functions, content would be code again and tuning would require a rebuild. It also makes the effect set enumerable, which is what lets the schema enforce that every failure outcome awards something (simulation spec §4.4).

**Cost.** The grammar is less expressive than code, and genuinely novel effects require an engine change. This is a deliberate ceiling: an effect that cannot be expressed declaratively is usually a mechanic that should be in the engine anyway.
