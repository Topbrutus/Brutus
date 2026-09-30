# CURRENT STATE — BRUTUS — 2026-09-30

## Repository

Repository: Topbrutus/Brutus
Branch: main
Visibility: public

Main HEAD after Phase 8 hardening:
`c75a8b14186c4f804b8e151e7c5798d43fc935cf`

Post-merge Brutus CI:
`36766397574 = SUCCESS`

## Phase

PHASE 8 — EPISTEMIC PIPELINE INTEGRATED + TRUST BOUNDARIES HARDENED

## Integrated chain

```text
INTAKE
  -> QUALIFIED TRACE
  -> COUNTER-TEST PLAN
  -> EXTERNAL EXECUTION
  -> QUALIFIED RESULT
  -> LEDGER RESULT
  -> REVIEWED PROOF ARTIFACT
  -> PROOF PROMOTION GATE
  -> SEPARATE PROOF_REF
```

## Trust-boundary hardening

### Qualified RESULT provenance

Proof Promotion Gate now rejects a bare or forged ledger RESULT unless it structurally matches Counter-Test Result Gate output:
- Counter-Test Bench prototype;
- evidence_level = COUNTER_TEST_RESULT;
- auto_proof_promotion = false;
- result_id / plan_id / protocol_version / summary present;
- non-empty check_results;
- SOURCE_REF bound to the plan.

### Proof artifact confinement

Proof promotion now:
- rejects a symlinked `proofs/` root;
- rejects proof artifact symlinks;
- resolves real paths;
- requires the real artifact path to remain inside the real `proofs/` root;
- requires exact SHA-256 match.

### Credential boundary

ASTRA STATION manifests and ledger records reject credential-shaped keys including:
- api_token;
- access_token;
- refresh_token;
- bearer_token;
- client_secret;
- private_key;
- authorization;
- cookie.

## Verso boundary

- DEFAULT_LOCKED;
- prepared cards only;
- UNKNOWN_CARD => STOP;
- no new Verso capability was added by hardening.

## Routing boundary

`LIVE_ROUTING = DENIED`
