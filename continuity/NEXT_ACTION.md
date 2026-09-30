# NEXT ACTION — VERIFY COUNTER-TEST BENCH, THEN RETURN RESULTS AS LEDGER RECORDS

## Branch

`astra/counter-test-bench-v01-20260930`

## Immediate gate

Run full Brutus CI.

Must prove:
- Counter-Test Bench prototype registers without a Verso card;
- the two initial plans bind to existing source records;
- missing source records are rejected;
- AUTO_EXECUTE=true is rejected;
- automatic proof promotion is rejected;
- data-only and credential guards hold;
- plans are immutable;
- no update/delete/execute API exists;
- no network/process/World Router is introduced.

## After integration

Execution remains outside the queue.

When a counter-test is actually run, append a new `RESULT` record to ASTRA STATION with:
- source plan ID;
- exact protocol/version;
- observed outputs;
- PASS / FAIL / INCONCLUSIVE as a test result only;
- PROOF_REF = null unless a real proof artifact is produced.

## Important

Do not modify Verso merely to run a counter-test.

Do not turn PASS into theorem.

Preserve:
`LIVE_ROUTING = DENIED`
