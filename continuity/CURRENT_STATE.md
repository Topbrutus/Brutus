# CURRENT STATE — BRUTUS — 2026-09-30

## Repository

Repository: Topbrutus/Brutus
Main baseline:
`2f49980a4a8d7d55aed07967efbd10ab024312b2`

Working branch:
`hardening/phase8-trust-boundaries-20260930`

Visibility: public

## Phase

PHASE 8 HARDENING — TRUST BOUNDARIES CANDIDATE

Integrated Phase 8 remains unchanged functionally:
- intake;
- counter-test plans;
- qualified results;
- reviewed proof promotion;
- Verso DEFAULT_LOCKED;
- LIVE_ROUTING = DENIED.

## Hardening targets

### Proof source provenance

Proof Promotion Gate now requires a source RESULT that structurally matches Counter-Test Result Gate output:
- Counter-Test Bench prototype;
- evidence_level = COUNTER_TEST_RESULT;
- auto_proof_promotion = false;
- result_id / plan_id / protocol_version / summary;
- non-empty check_results;
- SOURCE_REF bound to COUNTER_TEST:<plan_id>:...

A bare ledger RESULT with only verdict=PASS/FAIL is rejected.

### Proof path confinement

Promotion now:
- rejects a symlinked proofs/ root;
- rejects proof artifact symlinks;
- resolves real paths;
- requires the real artifact path to remain inside the real proofs/ root;
- still requires exact SHA-256 match.

### Credential boundary

ASTRA STATION prototype manifests and ledger records now reject token-shaped variants including:
- api_token;
- access_token;
- refresh_token;
- bearer_token;
- client_secret.

## Capability boundary

No new capability is added.

No new Verso card is added.

`LIVE_ROUTING = DENIED`
