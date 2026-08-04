# HIP — Level 1 Prototype Implementation Plan

**Status:** proposed, not started
**Date:** 2026-08-04
**Source documents:** [HIP_Game_PRD.md](HIP_Game_PRD.md), [HIP_Game_Design_Doc.md](HIP_Game_Design_Doc.md) §26

---

## 1. What this prototype is for

The design doc states the prototype question directly:

> Does allocating scarce Energy across delayed, uncertain career investments create enough tension to support a daily-return game?

Everything in this plan is subordinate to answering that. The prototype is **not** a vertical slice of the shipping product. It is an instrument for measuring whether the core allocation loop is interesting when the player cannot see probabilities, cannot control execution, and does not learn the result on the same turn.

Three things follow from that framing:

1. **Level 1 only.** No Exploration, no Leverage, no full impact model. Age 28–29, 12 monthly turns.
2. **Balance is a first-class deliverable, not a polish pass.** If a single-action strategy dominates, the loop has no tension and the answer to the prototype question is "no" for reasons that have nothing to do with the UI. A headless Monte Carlo harness (M6) is therefore built alongside the game, not after it.
3. **Content is data, tuned by playtesting.** The engine ships with knobs; the numbers in [HIP_Simulation_Spec.md](HIP_Simulation_Spec.md) are starting values chosen to be plausible, not values believed to be correct.

### Explicit non-goals

Not built in this prototype, in addition to everything in design doc §20.3: the impact scoring model, cause areas, the Influence and Cause Knowledge capital dimensions as *player-facing* systems, multiple starting profiles, accounts, cloud save, push notifications, stage transitions, and the finale. Career capital dimensions that Level 1 barely exercises are still *tracked in state* so the model does not need reshaping later — they are simply not surfaced.

---

## 2. Decisions taken

Technical decisions — stack, engine purity, determinism, content format, persistence — are recorded as ADRs in [../architecture-decisions.md](../architecture-decisions.md).

Game-design decisions, including the design doc's §25 open questions this prototype answers by fiat rather than by design, are in [HIP_Decisions_And_Open_Questions.md](HIP_Decisions_And_Open_Questions.md).

The two that most shape this plan: the prototype is a **web app** because balance tuning is dominated by iteration speed (ADR-001), and all 12 turns are **playable in one sitting** by default, because a 12-real-day feedback cycle makes tuning impossible.

---

## 3. Scope, resolved against §26

The design doc's prototype list is slightly underspecified in one place: it asks for "five action categories" but names four pipelines. The resolution used here:

| # | Action category | Backing system |
|---|---|---|
| 1 | Current job | Current Employer pipeline (§8.2) |
| 2 | Job search | Hiring pipeline (§8.1) |
| 3 | Learning | Learning pipeline (§8.3) |
| 4 | Side project | Portfolio pipeline (§8.4) |
| 5 | Network & public work | **No pipeline.** A combined stat-and-inbound system: it moves Reputation and Network, which in turn gate inbound opportunities and referral bonuses in the other four. |

Category 5 has no stage machine on purpose. Design doc §8.6 asks networking to produce "weak short-term outcomes but strong option value and occasional nonlinear returns" — a system with no visible progress bar whose entire payoff arrives as better options elsewhere is the most honest expression of that, and it gives the prototype one category that deliberately resists the "fill the bar" instinct. If playtests show players never touch it, that is a finding, not a bug to be patched by adding a bar.

### Content volume

- **1** starting profile — *Senior software engineer, large technology company, age 28* (design doc §16.1, first preset)
- **24** opportunity templates (§26 asks 20–30) — see [HIP_Content_Spec.md](HIP_Content_Spec.md) for the manifest
- **10** event templates
- **12** turns, 10 Energy each

---

## 4. Architecture

The module map, engine public API, turn lifecycle and system-wide invariants are documented in [../system-documentation.md](../system-documentation.md).

The one architectural constraint worth restating here, because the rest of the plan depends on it: **the engine is pure** (ADR-002). No React, no DOM, no storage, no clock, no ambient randomness. This is what makes the Monte Carlo balance harness in M6 possible, and the harness is what turns the balance goals of design doc §23 from aspirations into assertions.

---

## 5. Milestones

Milestone definitions, acceptance criteria and current status live in [../project-task-list.md](../project-task-list.md).

They are ordered so the riskiest question — *does the math produce interesting decisions* — is answerable at M6, before UI effort is spent on a loop that might not work. M1–M3 and M6 are the load-bearing milestones; M4 is deliberately plain.

---

## 6. Risks

| Risk | Signal it is happening | Response |
|---|---|---|
| **Delayed feedback reads as "nothing happened."** The core mechanic could simply feel inert on a 2-minute session. | Playtesters describe turns as empty; sessions get faster over time rather than slower. | The pending-preview at end of turn (§5.5) is the mitigation and must ship in M4, not M5. If it still reads as inert, the finding is that Level 1's monthly resolution is too slow, and the fix to test is shortening delays — not adding a mini-game. |
| **A dominant strategy survives tuning.** Most likely candidate: current-job investment, which is cheap, fast-cooldown, and compounding. | M6 harness shows one AllIn policy at the top across most seeds. | Repetition cost and cooldown are the intended lever (§6.3). If they are insufficient, the next lever is opportunity-cost visibility, not a hard cap — hard caps contradict §6.3. |
| **Hidden fit is invisible in only 12 turns.** Fit needs repeated observations to become legible; a monthly Level 1 may not supply enough. | Playtesters never mention fit; confidence bands stay at "Unclear" at turn 12. | Acceptable prototype outcome. Fit is designed to pay off across Levels 2–3. Record the observation count reached and use it to size the reveal curve later. |
| **Balance harness measures the wrong thing.** A composite score invented for the harness can be gamed by the harness itself and does not represent player intent. | Policies rank stably but playtesters disagree with the ranking. | The harness score (spec §8.1) is explicitly an internal instrument, never shown in-game, and its ranking is treated as a hypothesis to be checked against playtesters — not as ground truth. |
| **Scope creep toward Level 2.** The design doc's later stages are more interesting to build than tuning Level 1. | Cause areas, impact scoring, or a second profile appear in a branch. | The prototype question is about Level 1. Anything answering a different question is deferred by default. |

---

## 7. What a successful prototype looks like

Success is not "the game is fun." It is having a defensible answer to the prototype question. Concretely, after playtests:

- Players can articulate a trade-off they made, without prompting.
- Allocation profiles differ meaningfully across players on the same seed.
- Unused Energy is low but non-zero — players are choosing, not just spending.
- No single action category exceeds ~40% of total allocated Energy in the median session.
- Players return for turn 2 in the day-gated variant at a rate worth measuring further.

The failure modes are equally informative and should be reported as such: if every player converges on the same allocation by turn 4, the loop lacks tension and the design needs a change at the mechanics level, not the presentation level.

---

## 8. Supporting documents

| Document | Contents |
|---|---|
| [HIP_Simulation_Spec.md](HIP_Simulation_Spec.md) | State model, energy and repetition math, the outcome function, pipeline state machines, capital dynamics, balance invariants |
| [HIP_Content_Spec.md](HIP_Content_Spec.md) | JSON schemas, the 24-opportunity and 10-event manifest, authoring rules, qualitative-signal vocabulary |
| [HIP_UX_Spec.md](HIP_UX_Spec.md) | Screen flow, card anatomy, allocation interaction, copy rules |
| [HIP_Decisions_And_Open_Questions.md](HIP_Decisions_And_Open_Questions.md) | Answers to design doc §25 for prototype purposes, with what each defers |
| [HIP_Playtest_Protocol.md](HIP_Playtest_Protocol.md) | How the prototype question gets answered: instrumentation, session script, analysis |
