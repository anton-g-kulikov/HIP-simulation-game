# HIP — Level 1 Simulation Specification

**Scope:** Level 1 (Exploitation), 12 monthly turns, age 28–29.
**Companion to:** [HIP_Prototype_Plan.md](HIP_Prototype_Plan.md)

All numbers here are **starting values**. They are chosen to be plausible and to satisfy the qualitative behaviour the design doc asks for; none of them are believed to be correct. Every one of them lives in content JSON or a single `tuning.ts` constants file, and M6 exists to change them.

---

## 1. State model

```ts
type CampaignState = {
  seed: number
  turn: number                  // 1..12
  ageMonths: number             // 336 (28y) + (turn-1)
  stage: 'exploitation'
  rngCursor: number             // PRNG position; makes state fully serialisable

  player: PlayerState
  market: MarketState
  activeEvents: ActiveEvent[]
  pipelines: Pipeline[]
  openOpportunities: OpportunityInstance[]
  pending: PendingEffect[]      // scheduled resolutions
  history: TurnRecord[]         // full causal log, drives retrospective
}

type PlayerState = {
  profileId: string
  role: { title: string; org: string; orgQuality: number; managerQuality: number }
  seniority: number             // 0..1, 0.55 at start for the L1 profile

  capital: {
    capability: { technical: number; execution: number; communication: number; leadership: number }
    evidence: number
    reputation: number
    network: number
    influence: number           // tracked, not surfaced in L1
    causeKnowledge: number      // tracked, not surfaced in L1
  }                             // all 0..100

  finance: {
    monthlyComp: number         // currency units/month
    monthlyBurn: number
    savings: number
    // runwayMonths is derived: savings / monthlyBurn
  }

  hiddenFit: Record<FitAxis, number>       // 0..1, never shown as a number
  fitObservations: Record<FitAxis, Obs[]>  // drives the confidence band

  heat: Record<ActionCategory, number>     // repetition pressure, float ≥ 0
  energyModifier: number                   // additive, from events; usually 0
}

type FitAxis =
  | 'deep_technical' | 'leadership' | 'research'
  | 'founding' | 'communication' | 'operations'

type ActionCategory =
  | 'current_job' | 'job_search' | 'learning' | 'project' | 'network_public'
```

`influence` and `causeKnowledge` are in the model but effectively static in Level 1. They are present so the state shape does not need to change when Levels 2–3 are built.

### Starting profile — Senior software engineer, large tech company

| Field | Value |
|---|---|
| Age | 28y 0m |
| Seniority | 0.55 |
| Capability | technical 62, execution 55, communication 38, leadership 30 |
| Evidence | 45 |
| Reputation | 18 |
| Network | 32 |
| Monthly comp | 14,000 |
| Monthly burn | 7,500 |
| Savings | 60,000 (8.0 months runway) |
| Org quality | 0.65 · Manager quality | 0.55 |

Hidden fit is rolled per campaign: `fit_a ~ clamp(Normal(0.5, 0.18), 0.10, 0.90)` for each axis, **except** `deep_technical`, drawn from `Normal(0.62, 0.15)` so the starting profile is coherent with the player's stated history. The player is never told any of these.

---

## 2. Energy

### 2.1 Budget

10 Energy per turn, flat (design doc §6.1). Effective budget is `10 + energyModifier`, where the modifier comes only from events and is normally 0, bounded to `[-4, +2]`.

Unused energy is **lost**, with one softener: if the player ends a turn with ≥3 unused Energy, all `heat` decays at 1.5× that turn. Rationale and alternatives considered are in [HIP_Decisions_And_Open_Questions.md](HIP_Decisions_And_Open_Questions.md) Q2. This makes deliberate rest legible as a strategy without making it strictly optimal.

### 2.2 Action shapes

Two kinds, and the distinction is load-bearing for the UI:

- **Fixed-cost** — a discrete step. Take it or don't. `apply to role` (2), `early interview` (3), `advanced interview` (4), `take-home assignment` (6), `publish an artifact` (3), `launch project` (5), `apply learning at work` (3).
- **Scalable** — the player picks 1..max. `current job` (1–5), `learning` (1–5), `side project` (1–8), `network engagement` (1–4).

Scalable actions are where the effort curve (§4.2) is actually felt; fixed-cost actions are where prioritisation bites.

### 2.3 Repetition cost

Each action declares a `category`. Cost is:

```
cost = ceil( baseCost × multiplier(floor(heat[category])) )

heat tier  | 0    1    2    3+
multiplier | 1.0  1.5  2.0  3.0
```

`heat[c]` increases by **1.0 in any turn the category is used at all**, regardless of how much Energy went into it.

**Pipeline continuations are exempt from repetition cost.** Repetition charges
starting things, not following through on one. Charging it on continuations made
a single hiring process unaffordable — the assignment stage costs 6 Energy, which
at two points of heat is 12 against a budget of 10 — and §23 requires repeated
actions to become *unattractive* before they become *impossible*. Mass applying
still accrues heat, because each application is a new action, which is the
behaviour §6.3 actually targets. Charging by use-count rather than by energy spent keeps the rule explainable in one sentence on screen, and it means a single deep investment is cheaper than three shallow ones — which is the behaviour §23 asks for.

Heat is capped at 3.5.

### 2.4 Cooldown

At the start of each turn, before costs are shown, for every category **not used in the previous turn**:

```
heat[c] = max(0, heat[c] - decayRate[c] × restBonus)
restBonus = 1.5 if previous turn left ≥3 Energy unused, else 1.0
```

A category used last turn does not cool. This exclusion is load-bearing rather
than cosmetic: `current_job` gains 1.0 heat per use and cools 1.0 per turn, so
cooling it the turn after use would exactly cancel the charge and repetition
cost would never bite at all. Heat falls only once the player leaves an action
alone, which is what §6.3's "until it cools down" means.

| Category | decayRate | Full recovery from tier 3 |
|---|---:|---|
| `current_job` | 1.0 | 3 turns |
| `job_search` | 1.0 | 3 turns |
| `network_public` | 0.5 | 6 turns |
| `learning` | 0.5 | 6 turns |
| `project` | 0.34 | ~9 turns |

`project` cools slowest because a side project is the action most vulnerable to being ground out every single turn; `job_search` cools fastest because mass-applying is meant to be *unattractive* rather than *unavailable* (§6.3), and the applications sub-action is cheap enough that the multiplier does the work.

---

## 3. Career capital dynamics

### 3.1 Growth with diminishing returns

```
applyGain(current, gain) = current + gain × (1 - current/100)^0.7
```

At 20 a gain of 5 yields +4.28; at 80 the same gain yields +1.62. Compounding stays real but late-game grinding of one stat flattens.

### 3.2 Decay

Applied at turn start, before opportunity generation:

| Dimension | Decay/turn | Condition |
|---|---:|---|
| Reputation | −0.6 | always |
| Network | −0.4 | always |
| Capability (all) | −0.1 | always |
| Evidence | 0 | evidence is a record of what happened; it does not rot |

Decay is small relative to a good investment (+3 to +8) but it makes "publish once and coast" fail over 12 turns, which is the §8.5 risk of *visibility without substance* expressed mechanically.

### 3.3 Finance

`runwayMonths = savings / monthlyBurn`. Each turn: `savings += monthlyComp - monthlyBurn`.

Lifestyle inflation (§8.7 risk): whenever `monthlyComp` increases, `monthlyBurn` increases by 25% of the raise automatically, with no player control. It is stated plainly in the outcome text when it happens. In Level 1 finance is a constraint and a signal, not a score.

---

## 4. Outcome resolution

The single function every check goes through.

### 4.1 Score

```
match  = Σ_d w_d · (state_d / 100)          // template supplies w_d over capability
                                            // subskills, evidence, reputation, network; Σw = 1
fit    = Σ_a f_a · hiddenFit[a]             // template supplies f_a; Σf = 1
eff    = effortCurve(energy)                // §4.2
moment = clamp(pipelineInvestedEnergy / 12, 0, 1)   // cumulative prior investment, §10.1(3)

score  = 0.40·match + 0.20·fit + 0.30·eff + 0.10·moment
```

### 4.2 Effort curve

```
effortCurve(e) = (1 - e^(-e/3)) / (1 - e^(-10/3))
```

| Energy | 1 | 2 | 3 | 5 | 8 | 10 |
|---|---:|---:|---:|---:|---:|---:|
| effortCurve | 0.294 | 0.505 | 0.656 | 0.841 | 0.965 | 1.000 |

This is the design doc's §10.2 ladder — superficial / credible / strong / near-maximum / marginal — as a continuous function. The gap from 8→10 is 4 percentage points of effectiveness for 25% of the turn's budget, which is what makes overinvestment a real mistake rather than a rhetorical one.

### 4.2b Outcome magnitude

Effort scales the *size* of the result, not only the chance of getting one:

```
magnitude = (effortCurve(energy) / effortCurve(maxEnergy)) ^ 1.4      // scalable actions
magnitude = 1                                                          // fixed-cost actions
```

**This was missing from the first implementation and the balance harness caught
it.** With a fixed payout per action, effort moved only the probability, so ten
one-Energy attempts returned about three times the value per Energy of two
five-Energy ones — the model made overinvestment costly but underinvestment
nearly free, and dabbling was the dominant strategy. A superficial attempt that
happens to succeed should produce a superficial result (design doc §10.2).

The exponent controls how harshly. At 1.0 dabbling still wins; at 2.0 a
one-Energy attempt becomes worth less than doing nothing at all, which
overstates the case. 1.4 leaves a minimum-effort action worth something while
making a credible one clearly better.

### 4.3 Probability

```
z = 6 · (score - difficulty)                 // difficulty ∈ [0,1], on the template
p = clamp( sigmoid(z) + marketMod + eventMod, 0.03, 0.95 )
```

The floor and ceiling matter: nothing is ever certain and nothing is ever hopeless, which is what keeps the player reading outcomes as information rather than as arithmetic they already did.

Worked example — the starting profile attempting a moderately hard role (`difficulty 0.55`, `match 0.50`, `fit 0.50`, no momentum):

| Energy spent | eff | score | p |
|---:|---:|---:|---:|
| 1 | 0.294 | 0.388 | 0.275 |
| 3 | 0.656 | 0.497 | 0.421 |
| 5 | 0.841 | 0.552 | 0.504 |
| 8 | 0.965 | 0.589 | 0.559 |
| 10 | 1.000 | 0.600 | 0.574 |

Effort moves the needle by 30 points across the full range and shows sharp diminishing returns after 5 — the intended shape. State and fit move it comparably, so a well-built profile outperforms a well-rested one over time without either dominating (§10.3).

### 4.4 Result bands

One roll `r ~ U(0,1)`, four bands — this is how §10.4 partial outcomes are produced structurally rather than being hand-written per template:

| Condition | Band | Meaning |
|---|---|---|
| `r < 0.35p` | **Strong success** | Primary outcome plus a bonus effect |
| `r < p` | **Success** | Primary outcome |
| `r < p + 0.30(1-p)` | **Near miss** | Advanced but did not land; full partial outcomes awarded |
| otherwise | **Failure** | Reduced partial outcomes only |

A near miss is common by construction (30% of the failure mass), which is what makes rejection feel like progress rather than noise — "you reached the final round" is the most instructive outcome the hiring pipeline can produce.

### 4.5 Delay

Each template supplies a delay distribution over turns, e.g. `{"1": 0.6, "2": 0.3, "3": 0.1}`. On commit, the effect is pushed to `pending` with `resolveOnTurn = turn + draw(delay)`. The roll and its band are computed **at commit time**, not at resolution time, so a mid-flight event cannot retroactively change an outcome the player already earned — but the *narrative framing* is generated at resolution so it can reference what has happened since.

### 4.6 Explanation payload

Every resolution emits, alongside its state deltas:

```ts
type Explanation = {
  band: ResultBand
  headline: string                       // from template, band-specific
  contributors: { label: string; direction: 'helped'|'hurt'; weight: 'minor'|'notable'|'decisive' }[]
  luck: 'ran against you' | 'as expected' | 'ran your way'   // from |r - p|
}
```

Contributors are derived by ranking each score term's deviation from 0.5 — so the explanation is generated from the same numbers that produced the result and cannot drift from it. Weights are bucketed and the underlying values are never printed (§10.5: explain, don't expose the model).

---

## 5. Pipelines

### 5.1 Hiring (§8.1)

```
discovered → applied → screen → early_interview → advanced_interview
          → assignment → offer → {accepted | declined}
                    ↘ rejected (from any stage)
```

Each stage is a resolution check. Stage difficulty rises: 0.35 / 0.45 / 0.55 / 0.60 / 0.50. A referral (drawn against `network`) is rolled at `applied` and, on success, skips `screen` outright and adds +0.08 to `p` at the next stage — the mechanical expression of §8.1's "network access" variable.

Up to **3** hiring pipelines may be active at once. Each unattended for 2 consecutive turns lapses, with a message. Rejections always yield one of: a weak network contact (+network), market information (reveals a signal on a future opportunity), or interview capability (+communication) — never nothing (§8.1 failure behaviour).

Accepting an offer sets a new role, changes comp, resets `orgQuality`/`managerQuality`, and applies a **−15% execution and −20% evidence-*velocity* penalty for 2 turns** representing ramp-up. This is the cost that makes job-hopping non-free.

### 5.2 Current employer (§8.2)

Not a linear chain; a visibility accumulator.

```
visibleWork += resolutionOutput × visibilityMultiplier
visibilityMultiplier = 0.5 + 0.5·managerQuality        // invisible work risk
```

At `visibleWork ≥ 100` a recognition event fires: raise, scope expansion, or promotion, chosen by `orgQuality` and seniority. `visibleWork` decays 5%/turn. Two of the ten events (`promotion_freeze`, `manager_departs`) attack this pipeline specifically, which is the §8.2 risk list made playable.

### 5.3 Learning (§8.3)

```
study → practice → applied → competency → specialisation
```

The design rule — *learning without application has sharply diminishing value* — is enforced numerically: capability gains from `study` are multiplied by `0.35^(consecutiveUnappliedStudyTurns)` beyond the first. The `apply learning at work` action (fixed 3 Energy) resets that counter and converts accumulated study into both capability and **evidence**. Study alone never produces evidence.

### 5.4 Project (§8.4)

```
idea → prototype → launch → traction → {evidence | dormant}
```

Progress accrues from scalable investment; `launch` is a fixed-cost gate. Traction is a single check at `difficulty 0.62` — most projects should not take off. Failure still yields capability and a smaller evidence gain (a shipped thing that nobody used is still a shipped thing), which is §10.4 applied to the pipeline players are most likely to over-invest in.

### 5.5 Network & public work

No stages. Investment produces:
- immediate: small `network` or `reputation` gains
- delayed (2–4 turns): an inbound opportunity roll, `p = 0.10 + 0.45·(reputation/100) + 0.25·(network/100)`

Inbound opportunities arrive at a **1 Energy** acceptance cost and skip the `applied` and `screen` stages. That is the nonlinear return §8.6 asks for: nothing much happens for several turns, and then a whole pipeline opens for a tenth of the usual cost.

---

## 6. Opportunity generation

Per turn, after events:

1. **Filter** all templates by `stageAvailability`, profession tags, seniority range, and prerequisite predicates over state.
2. **Weight** each by `baseWeight × stateAffinity × marketModifier × recencyPenalty`, where `recencyPenalty = 0.25` if the same template appeared in the last 3 turns.
3. **Draw** without replacement to a target of **4–7** cards, always including at least one action from a category the player has not used in the last 3 turns (an anti-tunnel-vision guarantee).
4. **Set expiry**: most cards last 2–3 turns; roughly 20% are single-turn (§9.4 — expiry forces prioritisation but is deliberately not the norm).

Active pipeline continuations are **not** drawn — they always appear, above the new cards. They are commitments, not offers.

Quality distribution (§9.5): 70% of drawn cards are ordinary, 15% unusually strong, 10% unusually risky, 5% deceptively attractive — the last being cards whose visible signals are good and whose hidden `difficulty` or `fit` weighting is poor. The prototype needs a small number of these for the game to teach anything about judgement under incomplete information, and they must never be more than a small number.

---

## 7. Events and market

**Market** is one scalar, `hiringMarket ∈ [-0.15, +0.15]`, added directly to `p` for hiring checks. It follows `m ← clamp(0.85m + Normal(0, 0.04))` per turn, plus event shocks. Its state is shown qualitatively only ("hiring has cooled noticeably").

**Events**: at most one per turn; none in turn 1; a minimum 2-turn gap. Each has trigger predicates over state, so a layoff is more likely at a low-quality org and caregiving is not gated on anything. Selection is a weighted draw over eligible events. Effects can modify energy, capital, market, pipelines, or open/close specific opportunity templates.

---

## 8. Balance invariants

These are the machine-checkable subset of design doc §23, asserted by the M6 harness over **1,000 seeds per policy**. An invariant that cannot be satisfied by tuning is a design finding to be written up — not a threshold to be lowered.

### 8.1 The harness score

An internal composite, **never shown in game**, used only to rank policies against each other. Every term is a **gain over the starting profile**, not an absolute level:

```
harnessScore = 0.30·Δevidence + 0.20·ΔmeanCapability + 0.15·Δreputation
             + 0.15·Δnetwork + 0.10·min(ΔrunwayMonths, 4)·4
             + 0.10·compGrowthPct
```

The first version scored absolute capital. That was a measurement error rather
than a balance problem: roughly three-quarters of every score was the starting
profile sitting still, which squeezed the measured spread to about 5% of the
median and made every strategy look alike. It was measuring the profile, not the
play. Deltas put a do-nothing campaign near zero, which is the honest baseline.

The runway term is capped at four months because past a small buffer more runway
buys little extra freedom (design doc §8.7), and uncapped it let pure passivity
accrue score simply by not spending.

This is a proxy for "career capital gained during Level 1", not for impact. It is a hypothesis about what a good Level 1 looks like and must be sanity-checked against playtesters (Plan §6, risk 4).

**Known limitation.** The score has no impact term, because the prototype has no
impact model. A strategy that trades a quarter of its pay for mission-driven work
is therefore scored as a straightforward loss. That is a property of the proxy,
not a claim the game makes, and it is why invariant 5 measures "bottom two"
rather than "strictly last".

### 8.2 Policies

`AllIn(c)` for each of the 5 categories · `Diversified` (rotate categories, respect heat) · `Greedy` (always the best visible signal) · `Random` · `Idle` (spend nothing).

### 8.3 Assertions

| # | Invariant | Threshold |
|---|---|---|
| 1 | No single **action category** dominates | Best `AllIn` median ≤25% above the second-best `AllIn` median |
| 2 | Diversification pays | `Diversified` median ≥ median of every `AllIn` policy |
| 3 | Effort beats dabbling | `Deep` (5 Energy per action) exceeds `Shallow` (1 Energy per action) by ≥15% of the field spread |
| 4 | Overinvestment is real | An always-maximum-Energy policy underperforms a 5-Energy policy |
| 5 | Doing nothing loses | `Idle` median below every contender, and in the bottom two on >95% of seeds |
| 6 | Randomness doesn't erase strategy | `Diversified` beats `Random` in >70% of paired seeds |
| 7 | Networking is slow but real | `AllIn(network_public)` is not bottom-two at turn 12 |
| 8 | Learning needs application | Study-then-apply builds ≥25% more capability than study-only |
| 9 | Job-hopping isn't free | A policy accepting every offer does not exceed the `Diversified` median |
| 10 | Variance without chaos | Each contender's interquartile range is 10–60% of the whole field's spread |

Four of these were **restated during M6**, in every case because the original
wording measured the wrong thing, not because the threshold was inconvenient:

- **1** originally compared every policy, including `Diversified`. That made it
  contradict invariants 2 and 6 outright: those require thoughtful play to win,
  so invariant 1 could only pass if skill did not pay. Design doc §3.4's claim is
  that no single *path* is mechanically superior, not that strategy should not
  matter — hence the scope to single-category strategies.
- **3, 8 and 10** originally divided by a quantity that approaches zero
  (a weak policy's own median). One run reported a spread of 1963% and an effort
  edge of 3034%, which measured the denominator rather than the game. They now
  measure against the field spread, or directly on capability gained.

Invariant 10 is the subtle one: too tight and the game is deterministic, too wide and strategy is noise. It is the numerical form of "randomness is required but should not dominate" (§10.3).

Two results sit close to their thresholds and should be watched after any content
change: invariant 6 (70.3% against a 70% floor) and invariant 1 (7.4% against a
25% ceiling, healthy, but the two leading categories are near-tied).

---

## 9. Determinism

One `mulberry32` instance seeded per campaign, with `rngCursor` persisted in state. Every consumer draws from the same stream in a fixed order, so `(seed, profileId, allocationLog)` fully reproduces a campaign — which is what makes bug reports, replay, and the Monte Carlo harness possible at all. No engine module may call `Math.random()`; this is enforced by lint rule.
