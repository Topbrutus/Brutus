# CURRENT STATE — BRUTUS — 2026-09-30

## Repository

Repository: Topbrutus/Brutus
Main baseline:
`0054ed5dc82a5e4d7032c3d95c5f28a1f5d2d841`

Working branch:
`astra/counter-test-bench-v01-20260930`

Visibility: public

## Phase

PHASE 6 — COUNTER-TEST BENCH CANDIDATE

## Integrated baseline

Phase 5 is integrated:
- Verso DEFAULT_LOCKED;
- prepared cards only;
- Queen read path;
- ANCHOR-0001 / ASTRA STATION;
- append-only ledger;
- Experiment Intake Bench;
- LIVE_ROUTING = DENIED.

## New candidate

Prototype:
`BRUTUS-PROTOTYPE-COUNTER-TEST-BENCH-0001`

Contract:
`contracts/counter-test-plan.v0.schema.json`

Runtime:
`src/counter-test-queue.mjs`

Initial plans:
- `BRUTUS-COUNTER-TEST-ZELSTEREOS-369-396-0001`
- `BRUTUS-COUNTER-TEST-BRUTUS-PELL-L8-0001`

## Counter-test invariants

```text
MODE = PLAN_ONLY
AUTO_EXECUTE = FALSE
AUTO_PROOF_PROMOTION = FALSE
SOURCE_RECORD_REQUIRED = YES
PLAN_UPDATE = ABSENT
PLAN_DELETE = ABSENT
NETWORK = NONE
PROCESS_EXECUTION = NONE
WORLD_ROUTER = NONE
```

Plans are immutable data.

They state both:
- confirmation criteria;
- contradiction criteria.

## Routing boundary

`LIVE_ROUTING = DENIED`
