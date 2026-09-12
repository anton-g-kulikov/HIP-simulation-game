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

1. **What it came from.** The decision is the card's subject — its title — with the turn distance above it: "From 3 months ago / Get better at writing things down." This leads because the link between an earlier choice and a later consequence is the mechanic the prototype exists to test; an earlier layout put it as a caption under the headline, where the eye skipped it.
2. **What happened.** The result band, then one plain sentence — the body of the card, not its title.
3. **Why.** Up to three contributors plus luck, as **one row each** with an explicit state — `helped` or `held you back`, colour-coded — not as a sentence. As prose these read badly and scan worse: "How well this suits you worked against you" is three clauses to say one thing. Each factor is one claim with one direction, so it looks like one.
4. **What changed.** Capital moves are **drawn**, using the same bar idiom as the career snapshot: the track is the dimension's 0–100 range, the quiet part is where the value already sat, and the coloured part is this month's move — green up, amber down. The sentence sits above its bar.

   The bars are at true scale, which means most are small: a month moves a dimension 1.3 points at the median and 4 at the 95th percentile, because the game's whole claim is that a month barely shifts you and a year adds up. Measured on the real bar width that is 4px and 14px respectively — distinguishable, but roughly half of all changes read as a tick. That is the honest picture. If magnitude ever needs to dominate over position, the alternative is to scale the bar to the *size of the move* rather than to the dimension, and drop the position context to the snapshot.

   Money, role and energy changes have no 0–100 range and stay as text.

If a turn resolves nothing, the screen says so and moves on. It does not manufacture filler — a turn where nothing lands is real information about how career investment works, and hiding it would undercut the thing being tested.

### 1.2 Allocate

Top: a persistent **energy meter** — `7 of 10 remaining` — that updates live as allocations change.

One pip per point of the budget, and it reads like a fuel gauge: full is every
pip lit, each point committed puts out the rightmost lit pip, and the last point
remaining is the leftmost one. Each pip carries the **zone** it would cost to
spend down to it, so the cost of a full month is visible before any of it is
paid — and because the gauge drains toward the left, the warning colours sit on
the reserve, which is where a fuel gauge keeps its red:

| Zone | Where | What it means |
|---|---|---|
| Steady | up to the point that still leaves 3 unused | The 1.5× cooldown bonus survives |
| Stretch | the point that forfeits that bonus | Spending here costs the breather |
| Hard | at and above the high-effort threshold | The month counts toward burnout |

At a 10 budget that is, reading left to right, two red, one amber, seven green. **The boundaries are derived from
the tuning, not chosen for looks** — a band that discriminates on the wrong point
teaches a rule the game does not have, and an event-reduced month that cannot
reach the burnout threshold correctly shows no hard zone at all.

A month in the hard zone says so, flatly, and counts the run: "That would be
three hard months in a row." Four in a row is what burnout accumulates against,
so the run is worth knowing. It is stated once, without urgency (§18).

Then, in fixed order:

- **Where you stand** — the career snapshot, open, with last month's movement drawn on each bar.
- **What you have going** — live pipelines, and what is still in flight, **by name**. An earlier version showed only a count ("one thing is still waiting to come back"), which withheld information the player already had — they made those decisions. The outcome stays hidden until its card; the decision and a loose sense of when are theirs to see.
- **Needs a decision** — in-flight pipelines wanting investment this turn. Obligations, not offers.
- **This month** — the 4–7 drawn cards.

Nothing floats outside a card on this screen. Standing world state — how the hiring market is running — is not an outcome and belongs in the snapshot, where it bears on the next decision.

**The standing context is open, at the top, every round.** An earlier version put it below the fold behind a collapse control, on the theory that the decision should be makeable from the cards alone. That was wrong for this game: compounding *is* the subject, and a player who has to go looking for their own accumulation will not watch it accumulate. Seeing what a month did to you is most of the reason to play a month.

The cost is that the first card now sits about one short scroll down. That is the right trade here — but if playtesters stop reaching the cards, the context is too long rather than wrongly placed.

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

**The button names the effort, never the result.** A role card says `Apply`, because applying is what the Energy buys; whether you get it is the simulation's business. An interview stage says `Interview`, an assignment `Do the assignment`, and taking an offer — the one hiring action whose outcome is certain — `Accept the offer`. Every template carries its own verb in content, and a test fails the build if any verb asserts an outcome.

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
| Market | how hiring is running, as a phrase — context for what to attempt, not a result |

Each bar also carries **last month's movement**, in the outcome cards' idiom: quiet where the value already sat, coloured for the move. Only moves of at least a quarter point are drawn — capability drifts 0.1 a month from disuse, and drawing that put a tick on all seven bars every idle month, which read as everything falling apart. Only moves of a full point get a sentence, so a quiet month stays quiet rather than producing a paragraph of bad news.

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
