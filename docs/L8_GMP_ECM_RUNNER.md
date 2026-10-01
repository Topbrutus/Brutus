# L8 Q47 — native GMP-ECM runner

Purpose: resolve the only remaining L8 counter-test check, CT-03, without
recomputing CT-01, CT-02 or CT-04.

The runner reads the exact Q_47 already recorded in Brutus and invokes a
native GMP-ECM binary in loop mode with `-one`, so it stops at the first
factor.

Example:

```bash
node tools/l8-gmp-ecm-runner.mjs --curves 100 --b1 1e6
```

Optional explicit stage-2 bound:

```bash
node tools/l8-gmp-ecm-runner.mjs --curves 100 --b1 1e6 --b2 1e9
```

Inspect the exact command without executing ECM:

```bash
node tools/l8-gmp-ecm-runner.mjs --curves 100 --b1 1e6 --print-command
```

If no factor is found in the requested bounded campaign, the runner returns
`NO_FACTOR_IN_BOUNDED_CAMPAIGN` and exits with code 2.

If a factor is found, the runner immediately checks:

- Q_47 mod r = 0;
- P_1 mod r;
- P_47 mod r;
- P_2209 mod r;
- exact rank among 1, 47 and 2209;
- whether the factor is an L8 square-rank witness.

This tool does not alter Verso, ASTRA STATION, the ledger or the proof gate.
It does not promote a factorization result to proof automatically.

GMP-ECM itself must be installed separately; this repository does not install
or bundle the binary.
