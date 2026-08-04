# HIP — Playtest Protocol

**Purpose:** produce a defensible answer to the prototype question.

> Does allocating scarce Energy across delayed, uncertain career investments create enough tension to support a daily-return game?

The prototype is only worth building if this protocol is run. A prototype that gets built, demoed, and admired without instrumented playtests answers nothing.

---

## 1. What is actually being tested

The question decomposes into four claims, each of which can fail independently:

| Claim | Fails if |
|---|---|
| **C1 — The allocation decision is hard.** Players face genuine trade-offs, not obvious best moves. | Players converge on the same allocation by turn 4, or report the choice as easy. |
| **C2 — Delayed feedback is tolerable and interesting.** Waiting 1–3 turns creates anticipation rather than disconnection. | Players cannot recall what an outcome came from, or describe turns as empty. |
| **C3 — Uncertainty reads as fair.** Outcomes without visible probabilities feel explicable. | Players describe results as random, arbitrary, or rigged. |
| **C4 — Two minutes is enough and not too much.** | Median session is under 60 seconds (too thin) or over 6 minutes (too heavy). |

C3 is the highest-risk claim, because it is a bet made in the design rather than a detail of tuning — see [HIP_Decisions_And_Open_Questions.md](HIP_Decisions_And_Open_Questions.md) Q11.

---

The practical mechanics of running a session — building the playtest artifact, resetting between participants, collecting the export — are in [HIP_Facilitator_Run_Sheet.md](HIP_Facilitator_Run_Sheet.md).

## 2. Participants

**8–12 people**, run individually. Recruiting mix:

- 4–6 in early-career knowledge work, ages 25–35 — the actual audience
- 2–3 who play strategy or management games regularly — will find dominant strategies fastest
- 2–3 who play almost no games — will find the UI and vocabulary failures

Nobody who has read these documents. Nobody who has seen the design doc.

---

## 3. Session script (~45 minutes)

1. **Framing (2 min).** "This is a career strategy game. You have 12 turns, each one a month. Play it however you want. Think aloud when you can." Nothing else. No explanation of energy, repetition cost, fit, or pipelines — whether the game teaches its own rules is part of what is being measured.
2. **Play turns 1–12 (20–30 min), thinking aloud.** The facilitator does not answer rules questions during play; they note every one asked. A question asked is a UI failure logged.
3. **Tension probes** at turns 4, 8, and 12, asked in-app, one tap:
   - *"How hard was that decision?"* — 1 (obvious) to 5 (genuinely difficult)
   - *"Do you know what you're waiting on?"* — yes / roughly / no
4. **Retrospective screen (3 min).** Watch reactions unprompted. Surprise at the allocation breakdown is the signal to look for.
5. **Debrief (10 min).** In this order, without leading:
   - Describe a decision you found difficult and what you gave up.
   - Was there anything you decided was always the right move?
   - Tell me about an outcome that surprised you. Did it make sense afterwards?
   - What were you unsure about the whole time?
   - Would you open this again tomorrow? What would you want to find?
   - What did you think the game wanted you to do?

The last question is the one that catches unintended moralising — if participants say "it wanted me to quit my job and do good," the neutrality goal (§Q12) has failed.

---

## 4. Instrumentation

Every session exports one JSON file, local only, no network:

```jsonc
{
  "sessionId": "...", "seed": 918273, "profileId": "swe_bigtech_28",
  "turns": [
    {
      "turn": 3,
      "openedAt": 0, "committedAt": 94000,        // ms from session start
      "energyAvailable": 10, "energyAllocated": 8, "energyUnused": 2,
      "allocations": [ { "templateId": "cj_stretch_visible_project", "energy": 4 } ],
      "cardsOffered": ["...", "..."],
      "cardsExpiredUnused": ["..."],
      "screenDwellMs": { "review": 21000, "allocate": 61000, "commit": 12000 },
      "costInflationSeen": [ { "category": "current_job", "from": 4, "to": 6 } ],
      "probe": { "difficulty": 4, "awareness": "roughly" }
    }
  ],
  "outcomesShown": [ { "turn": 5, "fromTurn": 2, "band": "nearMiss", "templateId": "..." } ],
  "finalState": { }
}
```

No analytics service, no identifiers, no upload. Files are handed over by the participant or the facilitator.

The export holds **every campaign played in that browser session**, not only the last one, so a participant who restarts cannot destroy the record of what came before.

---

## 5. Metrics and thresholds

### Primary — the four claims

| Metric | Source | Healthy | Concerning |
|---|---|---|---|
| Median difficulty probe | in-app | 3–4 | ≤2 or =5 |
| Allocation divergence — mean pairwise distance between participants' 12-turn category vectors on the same seed | log | > 0.35 | < 0.20 |
| Max single-category share of total Energy, median across participants | log | < 40% | > 55% |
| "Do you know what you're waiting on" = yes/roughly | in-app | > 75% | < 50% |
| Participants who describe an outcome as arbitrary | debrief | 0–2 | ≥4 |
| Median session length, turns 2–11 | log | 2–5 min | <1 or >6 min |
| Would open again tomorrow | debrief | ≥ 7 of 10 | ≤ 4 of 10 |

### Secondary — mechanic legibility

| Metric | Healthy |
|---|---|
| Participants who noticed repeated actions cost more, unprompted | ≥ 6 of 10 |
| Participants who mention personal fit at any point | ≥ 3 of 10 |
| Median unused Energy per turn | 0.5–2.0 |
| Turns with zero allocation | < 5% |
| Rules questions asked during play | ≤ 3 per participant |

Median unused Energy is a better tension signal than it looks. Zero means players are spending reflexively rather than choosing; high means the cards on offer are not compelling. A small persistent remainder is what deliberate play looks like.

---

## 6. Interpreting the result

**Answer is yes** if C1–C4 all clear their healthy bands. Proceed to Level 2 design with the day-gate variant tested next.

**Answer is qualified** if C1, C2, C4 clear but C3 fails — players find the decisions hard and the waiting interesting, but the outcomes arbitrary. This is a *presentation and explanation* problem, not a mechanics problem, and it is the most likely qualified outcome. Iterate on the causal-explanation payload and the signal vocabulary; re-test with the same seeds.

**Answer is no** if C1 fails — a dominant strategy that the M6 harness missed, or decisions that feel obvious. This is a mechanics finding and it invalidates the loop as specified. The response is a design revision, not a UI pass: candidate levers, in order, are steeper repetition costs, fewer cards per turn, and reducing the base Energy budget to make every card a real sacrifice.

**Answer is inconclusive** if results split on gaming experience — experienced players find it easy and non-gamers find it opaque. Run a second round with onboarding changed and nothing else, to separate the two.

---

## 7. Sequencing against the milestones

The playtest runs after M7 and after the M6 balance invariants hold. Running it earlier wastes participants: they are a scarce, single-use resource for any given build, and a session spent discovering a dominant strategy the harness would have caught is a session wasted.

One exception: **a single pilot session after M4**, with one internal participant, purely to find blocking usability failures before the real sessions. Its data is not counted.
