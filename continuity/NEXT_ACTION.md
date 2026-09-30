# NEXT ACTION — VERIFY PROOF PROMOTION GATE

## Branch

`astra/proof-promotion-gate-v01-20260930`

## Immediate gate

Run full Brutus CI.

Must prove:
- existing RESULT is required;
- proof file must exist;
- proof path cannot escape proofs/;
- exact SHA-256 match is required;
- explicit APPROVED review is required;
- AUTO_PROMOTION=true is rejected;
- INCONCLUSIVE / ERROR results cannot be promoted directly;
- promotion creates a separate PROOF_REF record;
- gate does not append itself;
- no network/process/World Router is introduced.

## After integration

The epistemic path becomes:

```text
INTAKE TRACE
  -> COUNTER-TEST PLAN
  -> EXTERNAL EXECUTION
  -> QUALIFIED RESULT
  -> LEDGER RESULT
  -> REVIEWED PROOF ARTIFACT
  -> PROOF PROMOTION GATE
  -> SEPARATE PROOF_REF
```

No result should be promoted without a concrete artifact and exact hash.

Preserve:
`LIVE_ROUTING = DENIED`
