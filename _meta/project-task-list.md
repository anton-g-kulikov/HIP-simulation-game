# Project Task List

Temporal status for the Level 1 prototype. Scope and rationale live in [HIP_Prototype_Plan.md](specs/HIP_Prototype_Plan.md); this document owns *what is done and what is next*.

**Last updated:** 2026-08-04

---

## Milestones

All eight are complete. The prototype is playable end to end and the balance invariants hold.

| ID | Milestone | Status | Evidence |
|---|---|---|---|
| M0 | Scaffold and MECE docs | ✅ done | `npm test`, `npm run typecheck` clean; `/src`, `/test`, `/_meta` established |
| M1 | Engine core | ✅ done | 51 unit tests over rng, energy, capital, resolution, fit; hand-computed against the spec |
| M2 | Content pipeline | ✅ done | Malformed content fails at load naming file, field and expectation |
| M3 | Four pipelines | ✅ done | 23 tests; every terminal failure emits a partial outcome |
| M3.5 | Content authoring | ✅ done | 24 opportunities, 10 events, 1 profile, all schema-valid |
| M4 | Playable UI | ✅ done | 12 turns playable at 375×812; verified in a real browser, not only in jsdom |
| M5 | Events, retrospective, persistence | ✅ done | Save survives a refresh; retrospective renders for a do-nothing campaign |
| M6 | Balance harness and tuning | ✅ done | 10/10 invariants hold over 1,000 seeds × 15 policies |
| M7 | Playtest instrumentation | ✅ done | Session exports one JSON file with every allocation, outcome, dwell time and probe |

**184 tests passing.** Suite runs in about 1.5 seconds.

---

## Balance results (M6)

`npm run harness` — 1,000 seeds × 15 policies, about 8 seconds. Invariant numbering follows [HIP_Simulation_Spec.md](specs/HIP_Simulation_Spec.md) §8.3.

| # | Invariant | Result |
|---|---|---|
| 1 | No single action category dominates | ✅ current_job leads project by 7.4% |
| 2 | Diversified ≥ every single-category strategy | ✅ 7.7 vs 2.1 |
| 3 | Credible effort beats dabbling | ✅ 42.2% of field spread |
| 4 | Overinvestment underperforms | ✅ 2.2 vs 4.3 |
| 5 | Doing nothing loses | ✅ bottom two on 98.6% of seeds |
| 6 | Diversified beats random | ⚠️ 70.3% against a 70% floor — passing, but the tightest margin |
| 7 | Networking slow but not worthless | ✅ ranks 6 of 8 |
| 8 | Learning needs application | ✅ +0.57 vs −0.41 capability |
| 9 | Job-hopping is not free | ✅ 5.5 vs 7.7 |
| 10 | Variance without chaos | ✅ all 8 contenders in band |

Re-run after any content or tuning change. Invariant 6 is close enough to its threshold that a content change could tip it.

### What the harness changed about the design

Three findings, each of which would have compromised a playtest had it shipped:

1. **Dabbling was the dominant strategy.** Effort scaled the probability of an outcome but not its size, so ten one-Energy attempts returned roughly three times the value per Energy of two five-Energy ones. Outcome magnitude now scales with effort (spec §4.2b). This is the single most consequential change made during implementation.
2. **A finished campaign could not reach its own ending.** Reloading after the last turn restored the save onto an allocate screen with no offers and no way forward. Found by playing the game in a browser rather than by running the tests, which is the argument for doing both. Fixed, with a regression test.
3. **Four invariants were measuring the wrong thing.** One contradicted two others outright; three divided by a quantity that approaches zero and reported figures like "3034%". Restated in spec §8.3, with the reasoning recorded there rather than silently adjusted.

---

## Pilot session findings (HIP_Playtest_Protocol.md §7)

The pilot was run against the built app at 375×812, playing as a first-time
participant would. Its purpose was to find blockers before real participants are
spent, and it found ten. All are fixed; each has a regression test.

Four of them would have quietly wrecked the round rather than obviously broken
the game, which is the argument for running a pilot at all. Two were invisible to
the test suite by construction.

| # | Finding | Why it mattered |
|---|---|---|
| 1 | **Every probe answer was being silently dropped.** Probes are answered on the commit screen, which renders *after* the turn is filed, so `noteProbe` had nothing to attach to. | The difficulty and awareness probes are the protocol's **primary metric**. The instrumentation looked like it was collecting them and was recording nothing. |
| 2 | **The game never said who you are.** The authored profile blurb was rendered nowhere. | Card copy like "the problem you have spent two years inside" referred to a person the game had not introduced. Added a premise screen. |
| 3 | **The top capability signal was unreachable.** Weighted match never exceeds ~0.68; the band was set at >0.70, so it fired on 0 of 2,635 card renders and every card showed one of two phrases. | The most prominent signal on every card carried almost no information — the fastest route to outcomes reading as arbitrary, which is failure mode C3 and the prototype's riskiest assumption. |
| 4 | **A month where nothing landed was skipped silently.** | The UX spec requires the game to *say* nothing came back. Skipping it hides the delay, which is the mechanic the prototype exists to test (claim C2). |
| 5 | **Restarting destroyed the session telemetry**, and "Play again" sat in the same footer position as "Next month". | A participant tapping in rhythm could wipe the only artifact the session produced. Sessions are now archived; export is the primary action. |
| 6 | **The thin-evidence signal was dead.** It fired below 40 evidence; the profile starts at 45 and evidence never decays. | A vocabulary entry that could never appear. Now relative to what the role asks for. |
| 7 | **The first month applied a month of decay and earnings before the player acted.** | The opening screen contradicted the authored profile — nine months of runway where the profile says eight. |
| 8 | **The `greedy` harness policy keyed on a phrase the game could not produce.** | It had been scoring zero on its main term for the whole balance exercise. |
| 9 | **Events were labelled with a result band** — a layoff announced itself as "Close". | Events are not something the player earned. They now render neutrally. |
| 10 | **Every bar in the game rendered as an empty track.** The fills were inline `<span>`s, and an inline element ignores `height` and percentage `width`, so all of them measured 0×0. | The career snapshot and the whole retrospective breakdown — the screen carrying the game's main lesson — showed nothing at all. jsdom performs no layout, so no behavioural test could catch it; it took looking at the built app on a phone-sized screen. |

Signal calibration is now covered by `test/engine/signals.test.ts`, which fails
if any band becomes unreachable or swamps the others — the class of bug that
would otherwise only surface in front of a participant.

---

## Deferred follow-ups

Recorded rather than done. None blocks the playtest.

| Item | Why deferred |
|---|---|
| Daily-gate re-entry experience | The gate itself is implemented and tested; the notification and return-to-game experience around it belongs with the retention milestone |
| Levels 2 and 3 | Out of prototype scope (design doc §26) |
| Impact scoring, cause areas, ethical weighting | Deferred by design — [HIP_Decisions_And_Open_Questions.md](specs/HIP_Decisions_And_Open_Questions.md) Q4, Q5, Q7 |
| Additional starting profiles | Schema and registry support N profiles; only the software engineer is authored |
| Counterfactual review (design doc §14.4) | Cheap later — seeded determinism makes "replay with one allocation changed" a supported operation |
| Accounts and cloud save | ADR-006 |
| An impact term in the harness score | Needs an impact model; its absence is why invariant 5 measures bottom-two rather than strictly-last |
| Visual regression tests | Behavioural tests cover the screens; pixel testing is premature at this fidelity |

---

## Known limitations

- **UI tests were written after the UI**, unlike every other milestone, which was strictly test-first. The tests pass and cover cases 9.1–9.8, but they did not drive the design of the screens.
- **Copy is untested.** Narrative text is asserted for presence, never for content. Tone is a human judgement for the playtest.
- **The harness score is unvalidated.** It is a hypothesis about what a good Level 1 looks like, and playtesting is what checks whether it is a sane one.

---

## Next action

**Recruit participants and run the round.** The pilot is done and its blockers are
fixed; the prototype is ready for real sessions.

- What is being measured, and the thresholds: [HIP_Playtest_Protocol.md](specs/HIP_Playtest_Protocol.md)
- How to run a session without losing the data: [HIP_Facilitator_Run_Sheet.md](specs/HIP_Facilitator_Run_Sheet.md)

Nothing further should be built before that round. The remaining open questions
are about whether the loop works, and no amount of additional implementation
will answer them.
