# HIP — Content Specification (Level 1 Prototype)

**Companion to:** [HIP_Prototype_Plan.md](HIP_Prototype_Plan.md), [HIP_Simulation_Spec.md](HIP_Simulation_Spec.md)

Content is JSON, validated by Zod at application start. If a file fails validation the app refuses to boot and prints the file, the field path, and the expected shape. Silent content failures are the worst possible bug class in a system tuned by non-engineers, so there is no permissive mode.

**Rule:** no game number lives in engine code. If a value could reasonably be tuned during a playtest, it belongs in a template or in `tuning.ts`.

---

## 1. Opportunity template schema

```jsonc
{
  "id": "role_staff_eng_bigtech",
  "kind": "hiring",                    // hiring | current_job | learning | project | network_public
  "category": "job_search",            // ActionCategory — drives repetition cost
  "title": "Staff Engineer — large payments company",
  "description": "A peer company is opening a staff-level role on a platform team.",

  "availability": {
    "stages": ["exploitation"],
    "professions": ["software_engineering"],
    "seniority": { "min": 0.40, "max": 0.80 },
    "requires": [                       // predicates over CampaignState; all must pass
      { "path": "player.capital.evidence", "op": ">=", "value": 35 }
    ],
    "baseWeight": 1.0,
    "recencyPenalty": 0.25
  },

  "cost": { "shape": "fixed", "base": 2 },
  // or: { "shape": "scalable", "min": 1, "max": 5 }

  "expiry": { "turns": 3 },

  "check": {
    "difficulty": 0.50,
    "match": {                          // Σ = 1.0
      "capability.technical": 0.35,
      "capability.execution": 0.20,
      "evidence": 0.30,
      "network": 0.15
    },
    "fit": {                            // Σ = 1.0
      "deep_technical": 0.7,
      "communication": 0.3
    }
  },

  "delay": { "1": 0.5, "2": 0.4, "3": 0.1 },

  "outcomes": {
    "strong":   { "headline": "…", "effects": [ … ], "followUp": "pipeline:hiring:advance:2" },
    "success":  { "headline": "…", "effects": [ … ], "followUp": "pipeline:hiring:advance:1" },
    "nearMiss": { "headline": "…", "effects": [ … ] },
    "failure":  { "headline": "…", "effects": [ … ] }
  },

  "signals": ["strong_capability_match", "crowded_field", "unclear_mission_fit"],

  "tags": ["prestige", "compensation_up"]
}
```

### Effect grammar

Effects are declarative so that content edits never require engine changes:

```jsonc
{ "op": "capital",   "target": "capability.technical", "amount": 4 }
{ "op": "capital",   "target": "evidence",  "amount": 6 }
{ "op": "finance",   "target": "monthlyComp", "mode": "multiply", "amount": 1.18 }
{ "op": "pipeline",  "target": "hiring:{{instanceId}}", "action": "advance" }
{ "op": "observeFit","axis": "deep_technical", "strength": "notable" }
{ "op": "market",    "amount": -0.03 }
{ "op": "unlock",    "template": "role_eng_manager_internal" }
{ "op": "energy",    "amount": -1, "turns": 2 }
```

Every `nearMiss` and `failure` outcome **must** contain at least one non-empty effect. This is enforced by the schema, not by discipline — design doc §10.4 is a rule the content pipeline should make impossible to violate.

---

## 2. Event template schema

```jsonc
{
  "id": "org_manager_departs",
  "type": "organizational",           // market | organizational | personal
  "narrative": {
    "headline": "Your manager is leaving.",
    "body": "The person who has been advocating for your work internally announced their departure. Their replacement starts in two months."
  },
  "trigger": {
    "minTurn": 3,
    "requires": [
      { "path": "player.role.managerQuality", "op": ">=", "value": 0.5 }
    ],
    "weight": 1.0,
    "oncePerCampaign": true
  },
  "duration": 3,
  "effects": [
    { "op": "roleField", "target": "managerQuality", "mode": "set", "amount": 0.35 },
    { "op": "pipelineModifier", "target": "employer", "field": "visibilityMultiplier", "amount": -0.15 }
  ],
  "opportunityModifiers": [
    { "template": "cj_push_for_promotion", "weightMultiplier": 0.2 }
  ]
}
```

`trigger.requires` is what makes events feel responsive rather than arbitrary (§11.4: *produce different effects depending on the player's state*). A manager departure only lands if there was a good manager to lose.

---

## 3. Opportunity manifest — 24 templates

Design doc §26 asks for 20–30. The distribution below deliberately gives every one of the five categories enough templates that a player who commits to it sees variety, while keeping job search the widest — it is the category with a real pipeline and the one the prototype question most depends on.

### Job search — 6

| id | Notes |
|---|---|
| `role_staff_eng_bigtech` | The obvious move. Comp up, prestige up, learning low. Difficulty 0.50. |
| `role_senior_eng_climate_startup` | −25% comp, high mission signal, `founding`/`operations` fit weight. Tests whether players trade money for anything in Level 1. |
| `role_tech_lead_scaleup` | Leadership stretch; `match` leans on `communication` and `leadership`, which the starting profile is weak in. Should usually fail early and teach why. |
| `role_ml_infra_ai_lab` | Difficulty 0.72, gated on `evidence ≥ 55`. Mostly unreachable at turn 1 and reachable by turn 9 if the player built evidence. The clearest legible reward for compounding. |
| `role_eng_manager_internal` | Internal transfer — sits in `job_search` for cost purposes but draws on `visibleWork`. Deliberately blurs the two pipelines. |
| `role_contract_advisory` | Short paid engagement. Small comp bump, real `reputation`, no role change. The low-commitment option that exists to be a tempting distraction. |

### Current job — 5

| id | Notes |
|---|---|
| `cj_deliver_core_roadmap` | Scalable 1–5. The reliable baseline; modest evidence, high visibility. |
| `cj_stretch_visible_project` | Fixed 4. High `visibleWork`, difficulty 0.55, real failure risk. |
| `cj_mentor_juniors` | Builds `leadership` and internal `network` slowly; almost no `evidence`. Its payoff shows up in `role_tech_lead_scaleup` and `role_eng_manager_internal`. |
| `cj_fix_the_thing_nobody_owns` | High `capability` and `evidence`, `visibilityMultiplier × 0.4`. The invisible-work trap from §8.2, stated honestly in its signals for anyone who reads them. |
| `cj_push_for_promotion` | Requires `visibleWork ≥ 60`. Fixed 3. Success is a comp and seniority step; failure costs a turn and sets a 3-turn lockout. |

### Learning — 4

| id | Notes |
|---|---|
| `learn_distributed_systems_depth` | Reinforces the player's existing strength. Cheap gains, low ceiling — deepening a strength has diminishing returns via §3.1. |
| `learn_ml_fundamentals` | Slow, expensive, and gates `role_ml_infra_ai_lab`. The clearest "invest now, paid much later" card in the prototype. |
| `learn_writing_and_comms` | Raises `communication`, which multiplies into `network_public` and the leadership roles. The least obvious high-value card; a good test of whether players find second-order effects. |
| `learn_apply_at_work` | Fixed 3. Resets the unapplied-study decay and converts study into `evidence`. Without this card the learning pipeline is a trap, and that is the point (§8.3). |

### Side project — 4

| id | Notes |
|---|---|
| `proj_open_source_tool` | Scalable 1–8. Highest `reputation` ceiling of the project cards. |
| `proj_technical_writing_series` | Costs `project` heat but pays into `reputation` — intentionally overlaps `network_public` so the two categories can be combined by a player who notices. |
| `proj_prototype_for_nonprofit` | Lower `reputation`, higher `evidence` and `network`, seeds cause knowledge for later levels. |
| `proj_launch` | Fixed 5. The gate. Only appears when a project is at `prototype`. Traction check at difficulty 0.62. |

### Network & public work — 5

| id | Notes |
|---|---|
| `net_reconnect_dormant_ties` | Cheap (1–2), best `network` per Energy, no `reputation`. |
| `net_conference_attendance` | Fixed 4, one-turn expiry, event-gated. Large one-off `network` plus an elevated inbound roll for 3 turns. |
| `net_coffee_with_operators` | Deliberately low expected value. Not every networking action should pay. |
| `pub_write_technical_post` | Fixed 3. `reputation` scaled by `capability.communication` — weak writers get weak returns, which is §8.5's *visibility without substance*. |
| `pub_speak_at_meetup` | Requires `reputation ≥ 30`. Larger returns, gated behind prior public work. |

---

## 4. Event manifest — 10 templates

| id | Type | Turn window | Effect summary |
|---|---|---|---|
| `market_hiring_freeze` | market | 3–10 | `hiringMarket −0.12` for 3 turns; suppresses new role templates |
| `market_ai_capability_jump` | market | 2–11 | Boosts `role_ml_infra_ai_lab` weight, devalues some existing evidence |
| `market_recruiter_surge` | market | 4–11 | Elevated inbound roll for 2 turns; more valuable the higher `reputation` is |
| `org_acquisition` | organizational | 4–10 | Comp +8%, `orgQuality` shifts either direction, promotion path frozen 2 turns |
| `org_promotion_freeze` | organizational | 3–9 | `cj_push_for_promotion` disabled for 3 turns |
| `org_manager_departs` | organizational | 3–10 | `managerQuality → 0.35`, visibility penalty |
| `org_project_cancelled` | organizational | 4–11 | Destroys accumulated `visibleWork` on one in-flight current-job investment |
| `personal_burnout` | personal | 5–11 | Energy −3 for 2 turns; triggered by 4+ consecutive high-allocation turns |
| `personal_family_obligation` | personal | 2–11 | Energy −2 for 2 turns; ungated, deliberately unfair |
| `personal_unexpected_expense` | personal | 2–11 | `savings −18,000`; matters only if runway is already thin |

`personal_burnout` is the only event with a behavioural trigger. It exists because a game about energy allocation that never punishes maximum allocation is teaching something false, and design doc §6.5 asks for exactly this class of modifier while warning against turning the game into personal-life management — hence one behavioural trigger, not several.

---

## 5. Qualitative signal vocabulary

Design doc §9.3 requires qualitative signals, never numbers. Signals are generated from hidden values by fixed thresholds, so the mapping is consistent across the whole game and players can learn to read it.

| Signal id | Generated when | Displayed as |
|---|---|---|
| `strong_capability_match` | `match > 0.60` | Well matched to your experience |
| `partial_capability_match` | `0.42 < match ≤ 0.60` | Partly matched to your experience |
| `capability_stretch` | `match ≤ 0.42` | A stretch from where you are |
| `thin_evidence` | `evidence < 55` and the template weights evidence ≥ 0.25 | Limited evidence for this |
| `crowded_field` | `difficulty > 0.55` | Crowded applicant pool |
| `high_uncertainty` | outcome variance in top tercile | High uncertainty |
| `strong_learning` | learning-tagged effects above threshold | Unusually strong learning potential |
| `slow_payoff` | `E[delay] > 2.2` turns | Slow to pay off |
| `unclear_mission_fit` | template flag | Mission fit unclear |
| `reversible` / `hard_to_reverse` | template flag | Easy to step back from / Hard to undo |

**Thresholds are calibrated against the distribution the game produces, not against the 0–1 range in the abstract.** The first cut put the top band at `match > 0.70`; weighted match never exceeds about 0.68 in play, so that band fired on zero of 2,635 card renders and every card showed one of the two remaining phrases. A signal on every card that only ever takes two values is close to uninformative, and this one sits at the top of the card. Re-derive these if content weights change substantially — `test/engine/signals.test.ts` fails if any band becomes unreachable or swamps the others.

### Fit confidence bands

Personal fit is never a number and never a bar. It is a phrase whose confidence widens with observations on that axis:

| Observations | Phrasing |
|---:|---|
| 0–1 | *(nothing shown)* |
| 2–3 | "Leading people may suit you." / "… may not suit you." |
| 4–6 | "Leading people seems to suit you." / "… has been consistently hard going." |
| 7+ | "Leading people clearly plays to your strengths." / "… clearly does not." |

Every reading **names its subject** — deep technical work, leading people,
research, building something of your own, explaining and persuading, making
things run. An earlier version said "this", assuming the phrase would sit on a
card about a specific path. It never did; readings only appear side by side in
the snapshot and retrospective, where two "this"es read as one contradictory
sentence. They render one per line for the same reason.

Observations accumulate only from *acting*, never from reading a card — which is the mechanical statement of §7.8: *the player learns about fit through action*.

---

## 6. Copy rules

1. No RPG language. Never "+4 Leadership XP" (§13.3). Write "You are being asked to run the weekly planning meeting."
2. Numbers appear for money, energy, and time. Never for probability, fit, or capability.
3. Every outcome states what happened before what it changed.
4. Failure copy is never scolding and never consoling. It reports.
5. Second person, past tense for outcomes, present tense for opportunities.
6. No real organisation names (§20.2). Describe by type and scale.
7. Explanations name at most three contributors. More than three is noise.
