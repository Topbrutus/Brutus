# Counter-Test Result Gate v0.1

Status: candidate.

## Purpose

Receive the output of a counter-test that was executed elsewhere and qualify it as a Brutus `RESULT` record.

The gate does not run the experiment.

The gate does not append to the ledger.

The gate does not create a proof.

## Required result shape

A result names:
- the exact counter-test PLAN_ID;
- execution reference;
- protocol version;
- one status for every planned CHECK_ID;
- observed data for every check;
- global verdict;
- summary.

Allowed verdicts:
- PASS
- FAIL
- INCONCLUSIVE
- ERROR

## Coherence rules

### PASS

Every planned check must be PASS.

### FAIL

At least one check must be FAIL.

A FAIL verdict cannot hide an ERROR check.

### INCONCLUSIVE

At least one check must be INCONCLUSIVE.

It cannot hide FAIL or ERROR.

### ERROR

At least one check must be ERROR.

## Proof boundary

At this gate:

```text
PROOF_REF = null
AUTO_PROOF_PROMOTION = false
```

Always.

A qualified counter-test result becomes a ledger `RESULT`.

If a formal proof artifact is later produced and reviewed, it must enter as a separate proof-reference step.

## Why

This prevents:

```text
TEST PASSED -> THEOREM
```

The permitted path is:

```text
TEST RESULT
  -> LEDGER RESULT
  -> REVIEW / REPRODUCTION
  -> PROOF ARTIFACT IF ANY
  -> SEPARATE PROOF_REF
```
