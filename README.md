# High Impact Professionals — Level 1 Prototype

A mobile-first strategy game about how career capital compounds. The player makes one decision per turn:

> Where should I invest my limited career energy during this period?

They do not answer interview questions, negotiate, or play mini-games. They allocate a fixed Energy budget across career investments, and the simulation resolves the consequences — often several turns later, always probabilistically.

This repository contains the **Level 1 prototype**: 12 monthly turns, age 28–29, one starting profile. It exists to answer one question:

> Does allocating scarce Energy across delayed, uncertain career investments create enough tension to support a daily-return game?

---

## Setup

```bash
npm install
npm run dev
```

Open the printed URL. A phone viewport (375×812) is the design target; desktop works but is not the intended surface.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm test` | Full test suite (Vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Typecheck and production build |
| `npm run harness` | Headless Monte Carlo balance run — prints per-policy medians and one pass/fail line per balance invariant |

## Playing

A campaign is 12 turns. Each turn:

1. **Review** — what resolved from earlier decisions, and why.
2. **Allocate** — spend up to 10 Energy across the offers on the table.
3. **Commit** — confirm, see a vague preview of what is now in flight.

Repeating the same kind of action makes it temporarily more expensive. Outcomes arrive one to three turns after you commit to them. Nothing shows you a probability.

By default all 12 turns are playable in one sitting (~20 minutes). The real one-turn-per-day gate is available behind a flag for retention testing.

### Debug panel

In dev builds, triple-tap the turn counter. Seed control, state inspector, reveal-hidden-values toggle, forced events. It is compiled out of the playtest build — playtesters seeing true probabilities would invalidate the session.

---

## Documentation

All project documentation lives in [`_meta/`](_meta/). Start with [`_meta/README.md`](_meta/README.md) for the index.

The short version:

- **What we are building and why** — [`_meta/specs/HIP_Prototype_Plan.md`](_meta/specs/HIP_Prototype_Plan.md)
- **The mechanics as math** — [`_meta/specs/HIP_Simulation_Spec.md`](_meta/specs/HIP_Simulation_Spec.md)
- **How the code is organised** — [`_meta/system-documentation.md`](_meta/system-documentation.md)
- **Why it is built this way** — [`_meta/architecture-decisions.md`](_meta/architecture-decisions.md)
- **What is done and what is next** — [`_meta/project-task-list.md`](_meta/project-task-list.md)
- **What the tests prove** — [`test/test-documentation.md`](test/test-documentation.md)

---

## A note on what this is not

The game does not predict anyone's career and does not give career advice. It is a strategy game whose subject happens to be career decisions, built to develop intuition for sequential investment under uncertainty. Outcomes are simulated from a deliberately simplified model, and the simulation is not calibrated against real labour-market data.
