# HIP — Documentation Index

**High Impact Professionals** — a mobile-first daily strategy game about career capital compounding over time.

## Source documents

| Document | What it is |
|---|---|
| [HIP_Game_PRD.md](specs/HIP_Game_PRD.md) | Product vision, core loop, time compression, resources, pipelines |
| [HIP_Game_Design_Doc.md](specs/HIP_Game_Design_Doc.md) | Full game design — 26 sections covering systems, content architecture, balance goals, and the recommended prototype |

## Prototype documents

Planning for the Level 1 prototype specified in design doc §26. Read in this order:

| Document | What it is |
|---|---|
| [HIP_Prototype_Plan.md](specs/HIP_Prototype_Plan.md) | **Start here.** Scope, stack decisions, architecture, 8 milestones (~14 engineer-days), risks, success criteria |
| [HIP_Simulation_Spec.md](specs/HIP_Simulation_Spec.md) | The mechanics as math — state model, energy and repetition costs, the outcome function, pipeline machines, 10 machine-checkable balance invariants |
| [HIP_Content_Spec.md](specs/HIP_Content_Spec.md) | JSON schemas, the 24-opportunity and 10-event manifest, qualitative signal vocabulary, copy rules |
| [HIP_UX_Spec.md](specs/HIP_UX_Spec.md) | Four-screen session flow, card anatomy, interaction rules, debug panel |
| [HIP_Decisions_And_Open_Questions.md](specs/HIP_Decisions_And_Open_Questions.md) | Positions taken on the 15 open questions in design doc §25, and what each defers |
| [HIP_Playtest_Protocol.md](specs/HIP_Playtest_Protocol.md) | How the prototype question gets answered — participants, script, instrumentation, thresholds |
| [HIP_Facilitator_Run_Sheet.md](specs/HIP_Facilitator_Run_Sheet.md) | How to actually run a session — building the playtest artifact, resetting between participants, collecting the export |

## Living documents

Written and maintained alongside the code. Where these overlap with the specs above, these win — the specs record what we intended, these record what exists.

| Document | What it is |
|---|---|
| [project-task-list.md](project-task-list.md) | Milestone status, balance-run results, deferred follow-ups. **The status source of truth.** |
| [architecture-decisions.md](architecture-decisions.md) | ADRs — stack, engine purity, determinism, content format, and their costs |
| [system-documentation.md](system-documentation.md) | Module map, engine public API, turn lifecycle, system invariants, commands |
| [../test/test-documentation.md](../test/test-documentation.md) | Test strategy and documented test intent, written before the tests |
| [../README.md](../README.md) | Project overview, setup, how to play |

## Status

See [project-task-list.md](project-task-list.md).
