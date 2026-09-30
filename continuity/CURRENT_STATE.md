# CURRENT STATE — BRUTUS — 2026-09-30

Repository: Topbrutus/Brutus
Main baseline before consolidated L8 branch: 1d0fafc30d80c210d83fa232009170b1485ce9b0
Working branch: results/brutus-pell-l8-consolidated-20260930

## L8 consolidated status

Overall verdict: INCONCLUSIVE

- CT-01 = PASS — L8 valid as stated for q odd prime and r prime divisor of Q_q.
- CT-02 = PASS — exact Q data / partial factorization preserved.
- CT-03 = INCONCLUSIVE — bounded Pollard p-1 / ECM on Q_47 found no factor.
- CT-04 = PASS — 4,853 candidates / 0 exact witnesses preserved.

Audit: docs/audits/BRUTUS_PELL_L8_CT01_AUDIT_2026-09-30.md

Out-of-domain boundaries:
- q=2, r=2 gives rank 2 rather than 4.
- q=9, 53 divides Q_9 but has rank 27 rather than 81.

Evidence boundary:
PROOF_REF = null
AUTO_PROOF_PROMOTION = false

LIVE_ROUTING = DENIED
