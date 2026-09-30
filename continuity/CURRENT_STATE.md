# CURRENT STATE — BRUTUS — 2026-09-30

## Repository

Repository: Topbrutus/Brutus
Main baseline:
`1b370770c51e1fd6b626e02cb8f289f4385e0411`

Working branch:
`astra/proof-promotion-gate-v01-20260930`

Visibility: public

## Phase

PHASE 8 — PROOF PROMOTION GATE CANDIDATE

## Integrated baseline

Phase 7 is integrated and post-merge CI is green:
- qualified experiment intake;
- immutable counter-test plans;
- Counter-Test Result Gate;
- PASS/FAIL/INCONCLUSIVE/ERROR coherence;
- RESULT cannot self-promote to proof;
- LIVE_ROUTING = DENIED.

## New candidate

Contract:
`contracts/proof-promotion.v0.schema.json`

Runtime:
`src/proof-promotion-gate.mjs`

## Promotion invariants

```text
EXISTING_RESULT_REQUIRED = YES
RESULT_VERDICT = PASS_OR_FAIL
PROOF_ARTIFACT_REQUIRED = YES
PROOF_REF_MUST_STAY_UNDER_PROOFS = YES
EXPECTED_SHA256_REQUIRED = YES
ACTUAL_SHA256_MUST_MATCH = YES
REVIEW_STATUS = APPROVED
AUTO_PROMOTION = FALSE
OUTPUT = SEPARATE_PROOF_REF_RECORD
LEDGER_APPEND_INSIDE_GATE = NO
NETWORK = NONE
PROCESS_EXECUTION = NONE
WORLD_ROUTER = NONE
```

## Routing boundary

`LIVE_ROUTING = DENIED`
