# Test Documentation

Test strategy and documented test intent for the HIP Level 1 prototype. This document owns *what is being proven and why*. It is written before the corresponding tests, per the mandatory-TDD rule of the metacoding workflow.

Runner: **Vitest**. Tests live in `/test`, mirroring `/src` (ADR-007). Run with `npm test`.

---

## Strategy

The prototype's value rests on the engine being correct and the balance being real. Test weight is distributed accordingly:

| Layer | Weight | What is tested | What is not |
|---|---|---|---|
| `engine/` | heaviest | Pure functions against hand-computed expected values; determinism; invariants over all content | — |
| `content/` | heavy | Schema rejects malformed content with an actionable message; all authored content loads; structural rules hold over every template | The *balance* of the numbers — that is the harness's job, not a unit test's |
| `pipelines/` | heavy | State machines advance, terminate, and always pay something on failure | Narrative copy |
| `app/` | moderate | User-observable behaviour: can a player allocate, commit, and see outcomes | Styling, exact copy, component internals |
| `devtools/` | light | The harness runs and its invariant assertions are themselves correct | — |

Two rules shape everything below:

1. **Hand-computed expectations.** Where a formula is specified in [../\_meta/HIP_Simulation_Spec.md](../_meta/specs/HIP_Simulation_Spec.md), the test asserts against a value computed by hand from the spec, not against whatever the implementation currently returns. A test that only pins current behaviour cannot catch a misreading of the spec.
2. **Property tests for invariants.** Claims of the form "no content template ever…" are tested by iterating the entire loaded content set, so authoring a bad template later fails the suite.

`Math.random` is replaced with a throwing stub before every test (`test/setup.ts`). Any engine code that reaches for ambient randomness fails immediately rather than silently producing an unreproducible campaign.

---

## M1 — Engine core

### `rng.ts`

| # | Case | Expectation |
|---|---|---|
| 1.1 | Same seed, same draw sequence | Two `Rng` instances seeded identically produce identical sequences |
| 1.2 | Different seeds diverge | Two differently-seeded instances differ within the first 10 draws |
| 1.3 | Range | 10,000 draws all lie in `[0, 1)` |
| 1.4 | Cursor round trip | Serialising cursor mid-sequence and restoring reproduces the remaining sequence exactly |
| 1.5 | `int(min, max)` inclusive bounds | Over many draws, both `min` and `max` occur and nothing outside does |
| 1.6 | `normal(mean, sd)` | Sample mean and sd of 20,000 draws are within tolerance of the parameters |
| 1.7 | `pick` weighted draw | A 3:1 weighting produces roughly a 3:1 split over 10,000 draws |
| 1.8 | `pick` rejects empty and all-zero-weight inputs | Throws rather than returning undefined |

### `energy.ts`

| # | Case | Expectation |
|---|---|---|
| 2.1 | Heat tiers map to multipliers | heat 0→1.0×, 1→1.5×, 2→2.0×, 3+→3.0×, matching spec §2.3 |
| 2.2 | Fractional heat floors to its tier | heat 1.9 uses the 1.5× multiplier |
| 2.3 | Cost rounds up | base 3 at 1.5× is 5, not 4.5 |
| 2.4 | Heat rises once per turn per category | Three allocations to one category in a turn raise heat by 1.0, not 3.0 |
| 2.5 | Cooldown decays at the category rate | `current_job` −1.0/turn, `project` −0.34/turn |
| 2.6 | Heat floors at zero | Repeated decay never goes negative |
| 2.7 | Heat caps at 3.5 | Sustained use does not exceed the cap |
| 2.8 | Rest bonus | ≥3 unused energy makes the next decay 1.5× |
| 2.9 | Affordability rejects overspend | An allocation exceeding the budget is rejected, not clamped |
| 2.10 | Energy modifier bounds | Budget stays within `[6, 12]` for modifiers in `[-4, +2]` |

### `capital.ts`

| # | Case | Expectation |
|---|---|---|
| 3.1 | Diminishing returns curve | gain 5 at 20 → +4.3; at 80 → +1.7 (±0.05), per spec §3.1 |
| 3.2 | Clamped to 0–100 | Large gains and large decays cannot leave the range |
| 3.3 | Decay rates | reputation −0.6, network −0.4, capability −0.1, evidence 0 per turn |
| 3.4 | Runway derivation | `savings / monthlyBurn`, and burn of 0 does not produce `Infinity` in output |
| 3.5 | Lifestyle inflation | A comp raise increases burn by 25% of the raise |

### `resolution.ts`

| # | Case | Expectation |
|---|---|---|
| 4.1 | Effort curve landmarks | 1→0.29, 3→0.66, 5→0.84, 8→0.96, 10→1.00 (±0.01), per spec §4.2 |
| 4.2 | Effort curve is monotonic and hits exactly 1.0 at max energy | — |
| 4.3 | Worked probability table | The five rows of spec §4.3 reproduce within ±0.01 |
| 4.4 | Probability clamps | p never leaves `[0.03, 0.95]` regardless of inputs |
| 4.5 | Band boundaries | Rolls placed either side of each threshold produce the expected band |
| 4.6 | Near miss is 30% of failure mass | Over many rolls at fixed p, near-miss frequency ≈ 0.30(1−p) |
| 4.7 | Explanation is derived, not invented | Every named contributor corresponds to a score term that actually deviated, and direction matches its sign |
| 4.8 | At most three contributors | Per content copy rule 7 |
| 4.9 | Match/fit weights must sum to 1 | Malformed weights throw rather than silently skewing the score |

### `fit.ts`

| # | Case | Expectation |
|---|---|---|
| 5.1 | Fit rolls within bounds | All axes in `[0.10, 0.90]` |
| 5.2 | `deep_technical` is drawn from the higher-mean distribution | Mean over many campaigns is near 0.62, other axes near 0.50 |
| 5.3 | Confidence bands by observation count | 0–1 → nothing, 2–3 → "may", 4–6 → "seems", 7+ → "clearly" |
| 5.4 | Observations accrue only from acting | Rendering an offer produces no observation |

### `turn.ts`

| # | Case | Expectation |
|---|---|---|
| 6.1 | Determinism end to end | Same `(seed, profile, allocation log)` → identical final state across two runs |
| 6.2 | Serialisation round trip | `JSON.parse(JSON.stringify(state))` continues identically |
| 6.3 | Pending effects resolve on their scheduled turn | Not before, not after |
| 6.4 | A 12-turn campaign completes | `isCampaignComplete` true after turn 12, false before |
| 6.5 | Empty allocation is legal | A do-nothing turn advances without error and records unused energy |
| 6.6 | History records every allocation | One `TurnRecord` per committed turn |

---

## M2 — Content pipeline

| # | Case | Expectation |
|---|---|---|
| 7.1 | All authored content loads | No validation error over the real content set |
| 7.2 | Malformed content is rejected with an actionable message | Error names the file, the field path, and the expectation |
| 7.3 | Every failure and near-miss outcome awards at least one effect | Property test over every template (spec §4.4, invariant 4) |
| 7.4 | Match and fit weights sum to 1.0 in every template | Property test |
| 7.5 | Delay distributions sum to 1.0 | Property test |
| 7.6 | Every template id is unique | Property test |
| 7.7 | Every referenced id resolves | `unlock` and follow-up targets point at templates that exist |
| 7.8 | Effect interpreter covers every op in the schema | No schema-legal effect is silently ignored |

---

## M3 — Pipelines

| # | Case | Expectation |
|---|---|---|
| 8.1 | Hiring advances discovery → offer under favourable rolls | Reaches `offer` |
| 8.2 | Hiring rejection always yields a partial outcome | Never an empty effect set |
| 8.3 | Referral skips the screen stage | And adds its bonus to the next check |
| 8.4 | Neglect lapses a pipeline after 2 turns | With a message |
| 8.5 | Concurrent hiring pipelines cap at 3 | A fourth is not offered |
| 8.6 | Accepting an offer applies the ramp penalty for 2 turns | Execution and evidence velocity reduced, then restored |
| 8.7 | Employer visibility multiplier tracks manager quality | Low manager quality reduces `visibleWork` gain |
| 8.8 | Recognition fires at the visibleWork threshold | And resets the accumulator |
| 8.9 | Unapplied study decays sharply | Second consecutive study turn yields ~35% of the first |
| 8.10 | Applying learning resets the decay and produces evidence | Study alone never produces evidence |
| 8.11 | Project launch is gated on prototype stage | Not offered earlier |
| 8.12 | Failed traction still awards capability and partial evidence | — |

---

## M4–M5 — App and persistence

| # | Case | Expectation |
|---|---|---|
| 9.1 | A player can allocate, commit, and see the turn advance | Rendered behaviour, not store internals |
| 9.2 | Over-allocation is prevented at the UI boundary | Controls disable at zero remaining |
| 9.3 | Repetition-inflated cost is displayed when it applies | The `2 → 4` treatment appears |
| 9.4 | Outcome cards state source turn and contributors | — |
| 9.5 | Retrospective renders for a do-nothing campaign | No crash, no empty-state hole |
| 9.6 | Save round trip restores an in-progress campaign | Identical state after reload |
| 9.7 | Save version mismatch is handled | Old save is discarded rather than crashing |
| 9.8 | No probability or numeric fit is rendered anywhere | Property test over rendered card output |

---

## M4b — Signals and the opening screen

Added after the pilot session, which found that the most prominent signal on
every card was close to uninformative.

| # | Case | Expectation |
|---|---|---|
| 11.1 | All three capability bands appear in real play | None is unreachable |
| 11.2 | No band swamps the others | Each on 3–75% of cards |
| 11.3 | The top band stays uncommon | Under 35% of cards |
| 11.4 | No dead vocabulary | Every phrase the generator can emit is produced in play |
| 11.5 | A better-built profile reads as a better match | Signals change as capital grows |
| 11.6 | The thin-evidence warning clears once evidence is built | — |
| 11.7 | A new campaign opens on the premise, naming the role and the blurb | — |
| 11.8 | A campaign in progress does not show the premise again | — |
| 11.9 | A month where nothing resolved still shows the review screen if anything is in flight | Says what is still in motion |
| 11.10 | A genuinely empty month goes straight to the next hand | No filler |
| 11.11 | The first month starts exactly where the profile says | No decay or earnings before the first decision |

## M7b — Playtest instrumentation

| # | Case | Expectation |
|---|---|---|
| 12.1 | One telemetry entry per turn played | 12 entries for a full campaign |
| 12.2 | Every field the protocol asks for is present | Dwell, allocations, offered and expired cards |
| 12.3 | Energy accounting balances | spent + unused = available, every turn |
| 12.4 | Outcomes shown are recorded with their source turn | — |
| 12.5 | Probe answers are recorded, including the one after the final turn | The probe is answered *after* the turn is filed |
| 12.6 | The export is valid JSON | — |
| 12.7 | Restarting cannot destroy a finished session | Finished sessions are archived, not replaced |
| 12.8 | Export is the primary action on the retrospective | Not "start another campaign" |

## M4c — Outcome card legibility

Requested after review of the review screen. Three problems: the causal factors
ran together as prose with no visible state, capital changes were bare sentences
while the game already has a bar idiom for exactly those values, and the market
line floated outside any card with nothing to attach it to.

| # | Case | Expectation |
|---|---|---|
| 13.1 | Each causal factor is its own row with an explicit state | `helped` or `held you back`, not run-on prose |
| 13.2 | Luck is a row in the same list when it mattered | Absent when the roll landed as expected |
| 13.3 | A decisive factor is marked as such | Distinguishable from a minor one |
| 13.4 | A capital gain reports before and after, not just a sentence | So the change can be drawn |
| 13.5 | A capital loss reports before above after | Direction is derivable without re-reading the copy |
| 13.6 | Repeated effects on one dimension collapse into a single change | One bar per dimension, spanning the whole move |
| 13.7 | A no-op effect produces no change row | Zero-amount effects do not draw an empty bar |
| 13.8 | Non-capital changes (money, role, energy) stay as text | They are not 0–100 dimensions and have no bar |
| 13.9 | The market line no longer floats outside a card on the review screen | — |
| 13.10 | The market reads as standing context in the career snapshot | Where the player consults it while deciding |

## M4d — Honest verbs and standing context

| # | Case | Expectation |
|---|---|---|
| 14.1 | An application card's button says apply, not do | The player controls the attempt, not the result |
| 14.2 | Every fixed-cost card names the effort it buys | No card falls back to a generic verb by accident |
| 14.3 | A pipeline stage carries its own verb | "Interview", "Do the assignment" — not "Do this" |
| 14.4 | Accepting an offer says accept | The one action whose result *is* certain |
| 14.5 | No card promises an outcome | No button text asserts a result |
| 14.6 | The engine reports what last month moved | Capital at this open versus the previous open |
| 14.7 | Turn 1 reports no movement | Nothing has happened yet |
| 14.8 | Movement survives a save round trip | It is campaign state, not view state |
| 14.9 | Where you stand and what is in motion are open, at the top, on every turn | No collapse control |
| 14.10 | The snapshot draws last month's movement on each bar | Same idiom as the outcome cards |

The "did they open the pipeline view" metric is retired: both views are now
always visible, so the question no longer has an answer worth recording.

## M4e — The energy meter

The meter appeared to ignore the first two points of a spend: committing two
recoloured pips without reducing the count, and only the third started removing
them. An amber band of fixed width two floated immediately after the remaining
pips and slid left as energy was committed, filling the gap it left behind.

| # | Case | Expectation |
|---|---|---|
| 15.1 | One pip per point of the budget, always | The track never loses or gains a pip |
| 15.2 | Committed pips equal what has been committed | Every point spent takes a pip out of the available run |
| 15.3 | Every pip is either available or committed | No third state, and no pip that is neither |
| 15.4 | Committing one point moves exactly one pip | Including the first one |
| 15.5 | An untouched budget reads as entirely available | — |

## M4f — Energy zones

The meter is colour-zoned so the cost of a full month is visible before it is
paid. Boundaries are derived from the mechanics, not chosen for looks: spending
at or above the high-effort threshold marks a month as hard going and counts
toward burnout, and spending past the point that leaves three energy unused
forfeits the cooldown bonus.

| # | Case | Expectation |
|---|---|---|
| 16.1 | The hard zone begins at the high-effort threshold | Not at an arbitrary position |
| 16.2 | The pip that forfeits the rest bonus is the stretch zone | Derived from the rest threshold |
| 16.3 | Everything below that is steady | — |
| 16.4 | A budget too small to reach the threshold has no hard zone | An event-reduced month cannot cause burnout, so it must not warn |
| 16.5 | Every pip carries its zone | Available pips too, so the shape is visible before spending |
| 16.6 | A hard month says so, and counts the run | Factual, and only while the commitment is in that zone |

## M4g — Naming what is in flight

"One thing is still waiting to come back" said that something was pending
without saying what. The player made those decisions; withholding their names
is not vagueness about the outcome, it is just confusion.

| # | Case | Expectation |
|---|---|---|
| 17.1 | Each pending decision is named | By the title the player chose it under |
| 17.2 | Timing is vague, not numeric | "next month", "a month or two", "a few months" — never a turn number |
| 17.3 | The outcome is never revealed | The band is already rolled; it must not leak before the card |
| 17.4 | Nothing pending says so plainly | — |
| 17.5 | The snapshot lists them under what you have going | Replacing the bare count |

## M4h — Fit readings name their subject

"This may suit you. It is not yet clear whether this suits you." — two readings
about two different things, both saying "this", joined into one line. The
phrases assumed a card that named a path; they are only ever shown in the
snapshot, where nothing does.

| # | Case | Expectation |
|---|---|---|
| 18.1 | Every fit reading names what it is about | Never a bare "this" |
| 18.2 | The subject is a plain phrase, not the axis id | "leading people", not "leadership" |
| 18.3 | Readings render one per line | Not joined into a paragraph that reads as one claim |
| 18.4 | Confidence bands and tone survive the rewrite | may / seems / clearly; not for a poor fit |

## M6 — Balance harness

| # | Case | Expectation |
|---|---|---|
| 10.1 | The harness runs a full campaign per policy without error | — |
| 10.2 | Paired-seed comparison uses the same world for both policies | Seeds match across policy runs |
| 10.3 | Invariant assertions detect a deliberately broken tuning | A sanity check: zeroing repetition cost must fail invariant 1 |

Invariants 1–10 themselves are asserted by `npm run harness`, not by the unit suite — they need 1,000 seeds per policy and are too slow for the default test run. `test/devtools/harness.test.ts` instead feeds the checker fabricated policy summaries, one per invariant, so a broken balance is guaranteed to be caught by code that is itself under test.

Four invariants were restated during M6 because the original wording measured the
wrong thing. The reasoning is recorded in [../\_meta/specs/HIP_Simulation_Spec.md](../_meta/specs/HIP_Simulation_Spec.md) §8.3 rather than here, so it has one home.

---

## Known limitations

- **The UI tests were written after the UI**, unlike every other milestone in this repository, which was strictly test-first. They pass and they cover cases 9.1–9.8, but they did not drive the design of the screens, and that is a weaker guarantee than the engine tests carry.
- **Nothing here tests layout.** Tests run in jsdom, which computes no geometry: an element can be 0×0 on screen and pass every assertion. The pilot found exactly this — every progress bar in the game rendered as an empty track because the fills were inline elements. Visual checks against the built app on a phone-sized viewport are not optional, and the facilitator run sheet makes one a pre-session step.
- **Copy is untested.** Narrative text is asserted only for presence, never content. Tone is a human judgement made in playtests.
- **The harness score is a hypothesis.** Invariants are checked against a composite defined in spec §8.1 that is itself unvalidated. It is a proxy for "career capital at 29", and playtesting is what checks whether it is a sane one.
- **No performance testing.** Not a meaningful risk at this scale.
