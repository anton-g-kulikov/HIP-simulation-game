# HIP — Prototype Decisions Against Open Design Questions

Design doc §25 lists fifteen open questions. A prototype cannot leave them open — it has to pick something in order to exist. This document records what the prototype assumes, why, and what each choice defers rather than settles.

The distinction matters: a prototype decision is a **testable assumption**, not an answer. Several of these should change after playtesting.

---

| # | Question | Prototype decision | Reasoning | Deferred |
|---|---|---|---|---|
| 1 | Always exactly 10 Energy? | Yes, flat, modified only by events within `[-4, +2]` | A stable budget is what makes the repetition-cost system legible; varying both the budget and the costs at once would make it impossible to attribute a balance problem to either. | Whether later stages need a different budget. |
| 2 | What happens to unused Energy? | Lost, but ≥3 unused accelerates cooldown by 1.5× that turn | "Lost" keeps the opportunity cost sharp. The cooldown bonus makes deliberate rest a *legible* strategy without making it optimal — the design doc's third option (a resilience benefit) risks a dominant hoarding strategy in a 12-turn game. | Whether rest should carry a real mechanical reward at quarterly and annual resolution, where "a quiet year" means something different. |
| 3 | How visible is personal fit? | Never numeric. Confidence-banded phrases, earned only by acting | §7.8 says fit is learned through action. Showing it as a bar would let players optimise against it directly, which is the opposite of the intended lesson. | Whether 12 monthly turns generate enough observations for fit to register at all — flagged as a known prototype risk. |
| 4 | Ethical priorities: chosen or discovered? | Neither. No ethical weighting in the prototype | Level 1 is about exploiting existing career capital; there is no impact scoring to weight. Introducing it here would answer a question the prototype isn't asking. | The entire value-pluralism system (§12.5). |
| 5 | How many cause areas? | Zero in the prototype | Same reasoning. One project template (`proj_prototype_for_nonprofit`) seeds cause knowledge in state so the hook exists. | §12.1 entirely. |
| 6 | Finale at 44, or estimate the rest? | N/A — the prototype ends with a Level 1 retrospective, not a finale | | The finale (§14). |
| 7 | How strongly should real cause-prioritisation frameworks drive scoring? | N/A — no scoring | | §12.3. |
| 8 | Fixed or procedural world timeline? | Procedural, seeded. Market is a random walk; events are weighted draws with state predicates | Seeded procedural generation gives replay variety (§15) *and* reproducibility for the balance harness. A fixed timeline would make Monte Carlo testing measure one world rather than the design. | Whether a hand-authored timeline reads better narratively. |
| 9 | How much negative impact and moral uncertainty? | None modelled in Level 1 | Negative externalities are meaningful at Leverage scale, not for a 28-year-old engineer's monthly choices. Modelling them here would be moralising, which §11.4 warns against. | §12.4, §14.3. |
| 10 | Balanced or intentionally unequal starting profiles? | N/A — one profile | | Worth deciding *before* profile two is built; unequal profiles are more honest and more replayable, but they interact badly with any leaderboard-shaped feature. |
| 11 | Can the simulation stay understandable without numeric probabilities? | Assumed yes. This is the single strongest assumption in the prototype | The qualitative-signal vocabulary and the generated causal explanation (spec §4.6) are the whole bet. If players describe outcomes as arbitrary, this assumption has failed and it is the most important thing the playtest can tell us. | Nothing — this is being tested directly. |
| 12 | Tone: serious, satirical, or neutral? | Neutral, close-observed, unsentimental | Satire would undercut the educational premise; earnestness would make failure feel like judgement. Neutral reporting lets the player supply the meaning. Copy rules are in [HIP_Content_Spec.md](HIP_Content_Spec.md) §6. | Whether neutral reads as flat over 36 turns rather than 12. |
| 13 | How to represent structural privilege and unequal access? | Present but unnamed. `personal_family_obligation` is ungated and unfair; starting network and runway are inherited, not earned | A 12-turn engineering-profile prototype cannot handle this subject with the care it needs, and a shallow treatment is worse than a deferred one. What ships is an honest structure — unequal starting capital, uncontrollable shocks — without commentary. | A real treatment, which needs multiple starting profiles to say anything at all. |
| 14 | Can players inspect alternative outcomes afterwards? | No | Counterfactual review (§14.4) requires either re-simulation or a stored decision tree. Both are buildable; neither helps answer the prototype question, and showing "what would have happened" in a prototype invites players to grade the simulation rather than play it. | §14.4. Note that seeded determinism makes it cheap to add later — replaying a campaign with one allocation changed is a supported operation by construction. |
| 15 | Educational explanation during play or only in retrospect? | Minimal during play; concentrated in the retrospective | The causal explanation on each outcome is *mechanical*, not educational — it says why this happened, not what it teaches. Lessons land in the retrospective, where the allocation breakdown does the teaching without a lecture. | How much explicit framing the shipping game needs. |

---

## Additional decisions not in §25

| Decision | Choice | Reasoning |
|---|---|---|
| Interpretation of "five action categories" vs four pipelines (§26) | Network & public work is the fifth category and has no pipeline | See [HIP_Prototype_Plan.md](HIP_Prototype_Plan.md) §3. A category whose payoff arrives entirely as better options elsewhere is the truest expression of §8.6. |
| Repetition cost charged per use or per Energy? | Per turn the category is used, regardless of amount | Explainable in one on-screen sentence, and it makes one deep investment cheaper than three shallow ones — the behaviour §23 asks for. |
| Outcome roll timing | Rolled at commit, narrated at resolution | Prevents a later event from silently retconning an outcome the player already earned, while letting the narration reference intervening events. |
| Number of concurrent hiring pipelines | 3, lapsing after 2 turns of neglect | Enough to create real triage pressure; few enough to review in under a minute. |
| Job change cost | 2-turn ramp penalty to execution and evidence velocity | Without it, accepting every offer is free, and balance invariant 9 cannot hold. |
| Lifestyle inflation | Automatic, 25% of any raise, not player-controllable | §8.7 lists it as a risk. Making it a choice would turn it into a puzzle with an obvious right answer. |
| Outcome magnitude scales with effort | Yes, exponent 1.4 | The first implementation scaled only the *probability* of a fixed payout, which made dabbling the dominant strategy by roughly 3× per Energy. A superficial attempt that happens to succeed should produce a superficial result (§10.2). Found by the balance harness, not by design review — see spec §4.2b. |
| Repetition cost on pipeline continuations | Exempt | Charging it made a single hiring process literally unaffordable at the assignment stage, which contradicts balance goal §23 ("unattractive before impossible"). Applications still accrue heat, so mass applying is still discouraged. Found during implementation, not design. |
| Cooldown on a category used last turn | None | Decaying it would exactly cancel the heat just gained for fast-cooldown categories, so repetition cost would never bite. Heat falls only once an action is left alone. Also found during implementation. |
| Surviving offers re-checked for eligibility | Yes | An offer already on the table is dropped if the player stops qualifying for it, rather than being grandfathered until expiry. "Three live applications means no fourth card" should not have an exception for cards that happened to be showing already. |
| Prototype has no score | Correct — retrospective only | A visible score would be optimised, and there is no impact model yet for it to be a score *of*. The harness score (spec §8.1) exists solely for automated balance testing and must never surface in the UI. |
