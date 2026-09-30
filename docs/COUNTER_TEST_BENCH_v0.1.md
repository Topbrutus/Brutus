# Counter-Test Bench v0.1

Status: candidate.

## Purpose

The Counter-Test Bench converts qualified incoming traces into explicit plans for reproduction and contradiction.

It does **not** execute those plans.

Prototype:

`BRUTUS-PROTOTYPE-COUNTER-TEST-BENCH-0001`

Runtime:

`src/counter-test-queue.mjs`

Contract:

`contracts/counter-test-plan.v0.schema.json`

## Core path

```text
QUALIFIED TRACE
  -> COUNTER-TEST PLAN
  -> EXTERNAL / LATER EXECUTION
  -> RESULT RECORD
  -> REVIEW
  -> PROOF_REF only if earned
```

The queue cannot:
- execute code;
- invoke ZELSTEREOS;
- run factorization;
- call World Router;
- update/delete a registered plan;
- promote a result to proof automatically.

## First plan — 369 / 396

`BRUTUS-COUNTER-TEST-ZELSTEREOS-369-396-0001`

It requests:
1. independent exact arithmetic;
2. exact rational-ratio comparison;
3. fresh ZELSTEREOS reproduction;
4. exact branch/family comparison.

Important contradiction signals include:
- determinant mismatch;
- ratio mismatch;
- any exact branch equality in a run that is supposed to reproduce 0/1296 equality;
- dependence on silently changing the protocol.

## Second plan — L8

`BRUTUS-COUNTER-TEST-BRUTUS-PELL-L8-0001`

It requests:
1. source audit with all exceptional-prime/valuation assumptions stated;
2. factorization of Q_47, Q_71, Q_83;
3. independent rank verification for every factor used as a witness;
4. reproduction of the bounded scan.

The plan explicitly treats as contradiction:
- a relevant factor whose exact rank is below q^2;
- an unstated exception that breaks universal wording;
- a bounded-scan mismatch;
- a factorization witness that cannot be reproduced.

## Evidence discipline

A counter-test plan is not evidence that the source claim is true or false.

It is only a precise statement of **what would count** as confirmation or contradiction.
