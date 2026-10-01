# CURRENT STATE — BRUTUS — 2026-10-01

Repository: Topbrutus/Brutus
Integration lineage base: bef288f6921a6e058f9115582e1f22fc8cba334f (PR #20, native GMP-ECM runner)

## L8 status after native GMP-ECM campaign

Overall verdict: INCONCLUSIVE

- CT-01 = PASS — L8 valid as stated for q odd prime and r prime divisor of Q_q.
- CT-02 = PASS — exact Q_47 / Q_71 / Q_83 data preserved; factorization remains partial.
- CT-03 = INCONCLUSIVE — no explicit factor yet.
- CT-04 = PASS — bounded scan remains 4,853 candidates / 0 exact witnesses.

## New CT-03 evidence

Native engine: GMP-ECM 7.0.6
Target: Q_47
Q digits: 828
Q SHA-256: 59ce8bd15e4bbfbec0403b55231ee2919425739d929a32787aa3135f9891d634
Command shape: ecm -one -c 100 1e6
Curves: 100
B1: 1e6
B2: default / not explicitly supplied
Runtime: ~2694.97 s
Result: NO_FACTOR_IN_BOUNDED_CAMPAIGN

Earlier bounded attempts are preserved in the result history, including Pollard p-1 and SymPy ECM.

## Evidence boundary

NO_FACTOR_IN_BOUNDED_CAMPAIGN is not a non-factorization proof.
No exact-rank witness was measured because no prime factor was obtained.

OVERALL_VERDICT = INCONCLUSIVE
PROOF_REF = null
AUTO_PROOF_PROMOTION = false
LIVE_ROUTING = DENIED
