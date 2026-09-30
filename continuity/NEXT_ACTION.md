# NEXT ACTION — VERIFY AND INTEGRATE EXPERIMENT INTAKE

## Branch

`astra/experiment-intake-bench-v01-20260930`

## Immediate gate

Run full Brutus CI.

Must prove:
- passive intake prototype registers with no new card;
- incoming ZELSTEREOS report appends as non-proof RESULT;
- incoming Brutus-Pell L7/L8 report appends as non-proof NOTE;
- ledger chain stays valid;
- proof references remain null for unverified intake;
- source/evidence labels survive unchanged.

## After CI success

Integrate the intake bench if main remains compatible.

Then future incoming experiments can be represented by:
1. a prototype manifest when a new experimental workspace is needed;
2. one or more qualified ledger records;
3. later proof references only after independent verification.

No automatic new Verso capability.

Preserve:
`LIVE_ROUTING = DENIED`
