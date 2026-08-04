# HIP — Prototype UX Specification

**Companion to:** [HIP_Prototype_Plan.md](HIP_Prototype_Plan.md)
**Target:** mobile-first web, 375×812 baseline, one thumb, 2–5 minutes per session.

The prototype's UI is deliberately plain. Design doc §20.2 asks for "text-first presentation with restrained illustration," and for a prototype whose question is about *mechanics*, visual polish is a confound — if playtesters like it, we need to know whether they liked the decisions or the animation.

---

## 1. Session flow

Four screens, always in this order, always forward. There is no back button within a turn; a turn is committed once.

```
 ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐
 │  REVIEW  │ → │ ALLOCATE │ → │ COMMIT   │ → │  next turn   │
 │ outcomes │   │  cards   │   │ preview  │   │              │
 └──────────┘   └──────────┘   └──────────┘   └──────────────┘
   ~40 sec        ~90 sec        ~20 sec

 After turn 12:  → RETROSPECTIVE
```

Turn 1 skips Review — there is nothing to review — and opens on a short profile summary instead.

### 1.1 Review

One outcome card per resolved effect, in a vertical stack, most consequential first. Each card shows, in this order:

1. **What happened.** One sentence, plain.
2. **What it came from.** "From: applied to the platform role, three months ago." The turn distance is stated explicitly; it is the whole point of the mechanic.
3. **Why.** Up to three contributors with direction, plus the luck line. "Your evidence was decisive. The referral helped. The market ran against you."
4. **What changed.** State deltas as short phrases, not numbers, except money.

If a turn resolves nothing, the screen says so and moves on. It does not manufacture filler — a turn where nothing lands is real information about how career investment works, and hiding it would undercut the thing being tested.

### 1.2 Allocate

Top: a persistent **energy meter** — `7 of 10 remaining` — that updates live as allocations change, and turns amber when the last 2 Energy are committed.

Then, in fixed order:

- **Active commitments** — in-flight pipelines needing investment this turn. Always first, because they are obligations rather than offers.
- **New opportunities** — the 4–7 drawn cards.

Below the fold: a collapsed **career snapshot** and **pipeline list**. Both are reference material, not decision surfaces; putting them below the fold is a deliberate claim that the decision should be makeable from the cards alone. If playtesters constantly scroll down to decide, the cards are underspecified.

### 1.3 Commit

A single confirmation screen: what was allocated, what was left unspent, and a **pending preview** — vague by design.

> Three things are in motion. You should hear about the platform role within a month or two. The writing you published will take longer to show anything.

This screen is the primary defence against the loop feeling inert (Plan §6). It ships in M4.

### 1.4 Retrospective (after turn 12)

Design doc §13.2's Level 1 list: strongest evidence produced, career capital gained, underused assets, missed near-term opportunities, and the exploration paths now open. Plus, for the prototype specifically: an **energy allocation breakdown** by category across all 12 turns, shown as a simple bar. Players seeing how lopsided their own play was is the fastest route to the insight the game is trying to teach, and it is also the single most useful playtest artifact.

No score. No grade. No archetype yet — archetypes are a Level 3 finale feature and assigning one after 12 monthly turns would be false precision.

---

## 2. Opportunity card anatomy

```
┌────────────────────────────────────────────────┐
│ Staff Engineer — large payments company        │  title
│ Job search                            ⚡ 2     │  category · cost
│                                                │
│ A peer company is opening a staff-level role   │  1–2 sentences
│ on a platform team.                            │
│                                                │
│ Strong capability match · Crowded applicant    │  qualitative signals
│ pool · Slow to pay off                         │  (max 3)
│                                                │
│ Closes in 2 turns                              │  expiry, only if ≤2
│                                          [ + ] │  allocate
└────────────────────────────────────────────────┘
```

Scalable cards replace `[+]` with a stepper — `− 3 +` — capped at the card's max and at remaining Energy.

When a card's cost is inflated by repetition, the cost renders as `⚡ 2 → 4` with a tap target explaining: *"You have worked this angle recently. It costs more until you leave it alone for a turn or two."* The mechanic is only useful if it is visible at the moment of decision, and the explanation must never use the word "heat" or "multiplier."

**Never on a card:** a probability, a percentage, an expected value, a numeric fit rating, or a star rating. Design doc §9.3 is explicit that the player receives qualitative signals, and the prototype tests whether that is playable.

---

## 3. Pipeline row

```
Senior Operations Role
Final interview pending  ·  next step ⚡ 5
Strong mission fit · Moderate experience match · High competition
Lapses if ignored this turn
```

Taken directly from design doc §17.3. The player can inspect but not micromanage: there is no way to reorder stages, prep selectively, or withdraw strategically. The only verbs are *invest N* and *ignore*.

---

## 4. Career snapshot

Six rows, no numbers except money and time:

| Row | Rendering |
|---|---|
| Capability | four short labelled bars (technical, execution, communication, leadership) |
| Evidence | one bar |
| Reputation | one bar |
| Network | one bar |
| Money | `14,000/mo · 8 months of runway` |
| Fit | the phrases the player has earned so far, or nothing |

Bars are unlabelled by value and unsegmented — deliberately imprecise, so players reason about direction rather than optimising a number. Change since last turn is a small arrow, not a delta figure.

---

## 5. Interaction rules

1. **One commit per turn.** Allocation is editable freely until commit and never after.
2. **No undo of outcomes.** No rerolls, ever — design doc §19 rules them out as monetisation, and they would also destroy the mechanic being tested.
3. **Unspent energy is allowed** and never nagged about. The commit screen states it neutrally: *"You held back 4 Energy."*
4. **Everything is thumb-reachable.** Steppers and allocate buttons sit in the lower two-thirds.
5. **No timers, no streaks, no urgency.** §18 is explicit.
6. **Session resumable at any point.** State saves on every screen transition.

---

## 6. Debug panel (dev builds only)

Reachable by a triple-tap on the turn counter. Contains: current seed with a re-roll and a manual-set field, a full state inspector, a "reveal hidden values" toggle showing fit, difficulty, and computed probabilities, a turn skipper, and a forced-event picker. This is the tool that makes M6 tuning tractable, and it must be trivially strippable from the playtest build — playtesters seeing true probabilities would invalidate the session.
