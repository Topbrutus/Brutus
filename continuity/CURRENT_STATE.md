# CURRENT STATE — BRUTUS — 2026-09-30

## Repository

Repository: Topbrutus/Brutus
Branch: main
Visibility: public

Main HEAD at Phase 8 integration:
`2a2765492a9bbe07a32c9a3a8b587ff6538af44a`

Post-merge Brutus CI:
`36765211570 = SUCCESS`

## Phase

PHASE 8 — EPISTEMIC PIPELINE INTEGRATED

## Integrated chain

### 1. Intake

External experiment material enters at:

`BRUTUS-PROTOTYPE-EXPERIMENT-INTAKE-0001`

It is stored as a qualified ledger trace with explicit evidence boundary.

Incoming material is not silently promoted to proof.

### 2. Counter-Test Bench

Prototype:

`BRUTUS-PROTOTYPE-COUNTER-TEST-BENCH-0001`

Plans are immutable, data-only and bound to existing source records.

Initial plans:
- `BRUTUS-COUNTER-TEST-ZELSTEREOS-369-396-0001`
- `BRUTUS-COUNTER-TEST-BRUTUS-PELL-L8-0001`

The queue cannot execute, update, delete or route.

### 3. Counter-Test Result Gate

Externally executed counter-tests return through:

`src/counter-test-result-gate.mjs`

Rules:
- known PLAN_ID required;
- every planned CHECK_ID must be reported exactly once;
- PASS / FAIL / INCONCLUSIVE / ERROR must match check statuses;
- PROOF_REF remains null;
- automatic proof promotion is forbidden.

Qualified outputs become separate ledger RESULT records.

### 4. Proof Promotion Gate

Reviewed proof linkage uses:

`src/proof-promotion-gate.mjs`

Promotion requires:
- existing RESULT record;
- PASS or FAIL verdict;
- existing local artifact under `proofs/`;
- exact SHA-256 match;
- explicit `REVIEW_STATUS = APPROVED`;
- `AUTO_PROMOTION = false`.

The output is a separate PROOF_REF record.

The gate verifies artifact/linkage traceability. It does not determine scientific or mathematical truth by itself.

## Verso / Station boundary

- Verso remains DEFAULT_LOCKED;
- prepared cards only;
- UNKNOWN_CARD => STOP;
- ANCHOR-0001 / ASTRA STATION remains the fixed return point;
- no new Verso card was needed for Phases 5-8.

## Routing boundary

`LIVE_ROUTING = DENIED`

No Phase 8 component authorizes or invokes live ANT routing.
