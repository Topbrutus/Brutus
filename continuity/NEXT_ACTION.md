# NEXT ACTION — WAIT FOR REAL COUNTER-TEST OUTPUT

## Current rule

Do not add another Brutus capability just because one can be imagined.

The next useful event is a **real external counter-test result**.

Existing ready plans:

1. `BRUTUS-COUNTER-TEST-ZELSTEREOS-369-396-0001`
2. `BRUTUS-COUNTER-TEST-BRUTUS-PELL-L8-0001`

## When a real result arrives

1. preserve the exact execution/protocol reference;
2. fill every planned CHECK_ID;
3. report PASS / FAIL / INCONCLUSIVE / ERROR honestly;
4. qualify through Counter-Test Result Gate;
5. append the resulting RESULT to ASTRA STATION ledger;
6. keep PROOF_REF null;
7. only if a real proof artifact exists, hash it and pass it through Proof Promotion Gate;
8. append the separate PROOF_REF record after explicit review.

## No result yet

If no real counter-test output is available:

`WAIT / DO NOT INVENT DATA`

Do not create synthetic experimental results outside unit-test fixtures.

## New Verso capability

Create a new prepared card only if a real experiment demonstrates a missing read capability.

Otherwise:

`NO CARD -> STOP -> DESIGN REVIEW`

not:

`NO CARD -> EDIT ENGINE`

## Routing boundary

Preserve:

`LIVE_ROUTING = DENIED`
