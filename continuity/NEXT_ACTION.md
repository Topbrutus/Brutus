# NEXT ACTION — RUN NATIVE GMP-ECM ON Q_47

CT-01, CT-02 and CT-04 are complete.

The only unresolved check is:

`CT-03 = INCONCLUSIVE`

Use the dedicated runner:

```bash
node tools/l8-gmp-ecm-runner.mjs --curves 100 --b1 1e6
```

The runner reads the integrated Q_47, invokes native GMP-ECM with loop mode
and `-one`, and stops at the first factor.

If a factor r is found, it immediately verifies:
- Q_47 mod r = 0;
- P_47 mod r != 0;
- P_2209 mod r = 0;
- exact rank = 2209.

Do not redo:
- CT-01 derivation;
- huge Q values;
- trial division below 1,000,000;
- the 4,853-candidate scan.

Until a real factor is found:

`OVERALL_VERDICT = INCONCLUSIVE`

`PROOF_REF = null`

`LIVE_ROUTING = DENIED`
