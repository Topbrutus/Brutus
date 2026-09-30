# CURRENT STATE — BRUTUS — 2026-09-30

## Repository

Repository: Topbrutus/Brutus
Main baseline before L8 partial-result branch:
`904216ddf7c071ede91085fd5042439fd2187db9`

Working branch:
`results/brutus-pell-l8-partial-20260930`

Visibility: public

## Phase

PHASE 8 — L8 PARTIAL COUNTER-TEST RESULT CANDIDATE

## Incoming source

File:
`BRUTUS_COUNTER_TEST_L8_0001_exact(1).txt`

Generated UTC:
`2026-09-30T21:19:31.888836+00:00`

Runtime:
- Python 3.13.5
- SymPy 1.14.0

## Result classification

Overall:
`INCONCLUSIVE`

Check status:
- CT-01 = INCONCLUSIVE — theoretical L8 audit not supplied;
- CT-02 = PASS — exact Q values supplied, bounded trial division clearly partial;
- CT-03 = INCONCLUSIVE — no prime factor supplied, so no exact-rank witness can be checked;
- CT-04 = PASS — bounded scan reproduces 4,853 candidates and 0 witnesses.

## CT-02 exact data

q=47:
- Q digits = 828;
- gcd(P_q,Q_q)=1;
- trial division bound = 1,000,000;
- factors below bound = none.

q=71:
- Q digits = 1903;
- gcd(P_q,Q_q)=1;
- trial division bound = 1,000,000;
- factors below bound = none.

q=83:
- Q digits = 2606;
- gcd(P_q,Q_q)=1;
- trial division bound = 1,000,000;
- factors below bound = none.

Brutus CI independently recomputes:
- exact P_q;
- exact Q_q;
- Q digit counts;
- Q SHA-256;
- gcd(P_q,Q_q);
- Q congruence checks.

It does not claim independent reproduction of the external trial-division search.

## CT-04

Exact supplied scan:
- k_start = 10,000,000,000;
- k_end = 10,000,100,000;
- q47 = 1673 candidates / 0 witness;
- q71 = 1590 candidates / 0 witness;
- q83 = 1590 candidates / 0 witness;
- TOTAL = 4853 candidates / 0 witness.

Interpretation:
`NO_WITNESS_IN_SCANNED_INTERVAL`

not:
`NO_WITNESS_EXISTS`

## Evidence boundary

```text
VERDICT = INCONCLUSIVE
PROOF_REF = null
AUTO_PROOF_PROMOTION = false
```

No L8 validity claim is promoted from this partial result.

## Routing boundary

`LIVE_ROUTING = DENIED`
