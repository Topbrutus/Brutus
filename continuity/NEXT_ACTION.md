# NEXT ACTION — COMPLETE ONLY THE MISSING L8 CHECKS

## Current partial result

Durable raw result candidate:
`examples/results/BRUTUS-COUNTER-RESULT-BRUTUS-PELL-L8-PARTIAL-0001.json`

Durable qualified RESULT candidate:
`examples/records/BRUTUS-RECORD-COUNTER-BRUTUS-PELL-L8-PARTIAL-0001.json`

Current status:
`INCONCLUSIVE`

## Missing CT-01

Need the mathematical audit:

- L8_STATUS;
- assumptions;
- exceptions;
- derivation;
- explicit answer whether an admissible prime factor of Q_q can have rank below q^2.

Do not repeat the large Q calculations.

## Missing CT-03

Need at least one actual prime factor r of some Q_q, or an explicit statement that no factor was obtained beyond the current trial-division bound.

If a factor is found:
- identify q;
- identify r;
- verify r divides Q_q;
- compute P_q mod r;
- compute P_(q^2) mod r;
- compute exact z_P(r) independently;
- report WITNESS true/false.

## CT-04

Already reproduced:
`4853 candidates / 0 witnesses`

Do not spend time rerunning it unless the protocol changes.

## Evidence rule

Do not convert the partial result to PASS until CT-01 and CT-03 are actually resolved.

Preserve:
`LIVE_ROUTING = DENIED`
