# ASTRA NEXT ACTION — 2026-10-02

Repository:
`Topbrutus/Brutus`

Checkpoint base before continuity commit:
`a6e05bf20fed1bd866d61359b99afdac6cc3cad6`

## Immediate rule

Do not change the Brutus core merely because ZEL produces a new formula.

First observe the new source item, preserve its source status/provenance, and route it through the existing Math Input Bus boundary.

## If ZEL emits a new formula

1. Read the Brotoculateur source in read-only mode.
2. Confirm whether:
   - `formula_id` changed;
   - relation changed;
   - provenance hash changed;
   - registered formula count increased;
   - canonical/authenticated counts changed.
3. Preserve:
   - exact expression;
   - source status;
   - source test count;
   - replay status;
   - provenance hash;
   - source run id.
4. Never map:
   `SOURCE_PASS -> BRUTUS_PROOF`.
5. Keep:
   `PROOF_REF = null`
   until Brutus independently creates a proof.
6. If the formula is not item-scoped through `/api/status`, prefer a bounded read-only source export rather than inventing missing evidence.

## Next Math Input Bus hardening

Add or consume a read-only full formula export so Brutus can receive all formula items individually.

Required per-item shape:

```text
expression
formula hash
source status
support count / refs
counter-test count / refs
replay status
bindings
provenance
```

Do not redesign the generic packet unless the existing `ITEMS` contract is proven insufficient.

## Live Fourmi transport next step

PR #48 is runtime-ready but not production-proven.

Before any real movement:

1. identify a real source/actuator adapter;
2. verify a Queen-before observation;
3. verify exact ANT identity;
4. verify exact material identity;
5. verify `ATTACHED`;
6. verify current position;
7. verify a valid single-use grant;
8. perform at most one external move attempt;
9. mark the runtime spent before the external action;
10. observe a strictly later Queen tick;
11. confirm exact destination and attachment afterward;
12. only then create ANT_MOVE / MATERIAL_MOVE evidence;
13. consume the grant.

Never retry automatically after an unknown action outcome.

## Resume checklist

At the start of the next Astra session:

1. `git fetch origin`
2. confirm `main == origin/main`
3. confirm working tree state
4. read:
   - `continuity/CURRENT_STATE.md`
   - `continuity/NEXT_ACTION.md`
5. inspect any new PR merged after #48
6. inspect live Brotoculateur status before making claims
7. inspect ZEL latest `formula_id`, relation and provenance hash
8. keep all evidence/proof boundaries fail-closed

## Stop conditions

Do not:
- invent missing item-scoped proof refs;
- attach global last-proof data to a formula without exact item provenance;
- make Math Input Packets executable;
- auto-promote SOURCE_AUTHENTICATED to BRUTUS_PROOF;
- invent Queen time;
- claim a production Fourmi move without observed before/after state;
- retry a movement whose external outcome is unknown;
- publish or route new math material automatically.
