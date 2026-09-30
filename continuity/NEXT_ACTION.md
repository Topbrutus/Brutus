# NEXT ACTION — VERIFY RESULT GATE, THEN WAIT FOR REAL COUNTER-TEST OUTPUT

## Branch

`astra/counter-test-result-gate-v01-20260930`

## Immediate gate

Run full Brutus CI.

Must prove:
- PASS requires every check PASS;
- FAIL requires an explicit FAIL;
- INCONCLUSIVE cannot hide FAIL/ERROR;
- every planned check must be reported exactly once;
- unknown plans are rejected;
- PROOF_REF cannot enter through this gate;
- automatic proof promotion is rejected;
- data-only / credential guards hold;
- gate does not append itself;
- no network/process/World Router is introduced.

## After integration

The infrastructure is ready for actual result return.

When a real counter-test finishes:
1. construct one result object from the exact plan;
2. qualify it through Counter-Test Result Gate;
3. append the qualified RESULT to ASTRA STATION ledger;
4. keep PROOF_REF null;
5. review/reproduce before any proof step.

Preserve:
`LIVE_ROUTING = DENIED`
