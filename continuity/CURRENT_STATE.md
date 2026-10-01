# CURRENT STATE — BRUTUS — 2026-10-01

Repository: Topbrutus/Brutus
Integration lineage base: f6c3f0e588aecd2dd393d1914b354ff39f4c71f5 (PR #21)

## L8 counter-test status

Overall verdict: PASS

- CT-01 = PASS — L8 valid as stated for q odd prime and r prime divisor of Q_q.
- CT-02 = PASS — exact Q data preserved; Q_47 now has one explicit factor and remains partially factored.
- CT-03 = PASS — explicit prime factor of Q_47 independently verified with exact Pell rank 2209 = 47^2.
- CT-04 = PASS — bounded scan remains 4,853 candidates / 0 exact witnesses.

## Exact Q47 witness

q: 47
r: 424675575059690484579658261789171649
factor digits: 36
Q_47 digits: 828
Q_47 SHA-256: 59ce8bd15e4bbfbec0403b55231ee2919425739d929a32787aa3135f9891d634

Successful native campaign:
- GMP-ECM 7.0.6
- ecm -one -c 50 3e6
- runtime ~3258.22 s
- FACTOR_FOUND

Independent verification:
- Python 3.12.10
- SymPy 1.14.0
- isprime(r) = true
- Q_47 mod r = 0
- P_1 mod r = 1
- P_47 mod r = 345869461223138161 != 0
- P_2209 mod r = 0
- exact z_P(r) = 2209 = 47^2

Remaining Q_47 cofactor:
- digits: 792
- SHA-256: 978b7253d1665b4c59168fed591b9844db1faf9020b675776ef6a274ba36f570
- factorization status: PARTIAL

## Evidence boundary

All planned counter-test checks now PASS.
PASS remains a COUNTER_TEST_RESULT, not a proof artifact.

PROOF_REF = null
AUTO_PROOF_PROMOTION = false
LIVE_ROUTING = DENIED
