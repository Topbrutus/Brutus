# NEXT ACTION — ESCALATE CT-03 WITHOUT REPEATING THE SAME CAMPAIGN

Completed and do not repeat by default:
- CT-01 derivation;
- exact Q values;
- trial division below 1,000,000;
- bounded scan 4,853 / 0;
- native GMP-ECM Q_47 campaign: 100 curves, B1=1e6, -one.

Only unresolved check:
`CT-03 = INCONCLUSIVE`

Preferred next sequence:
1. Check whether an explicit factor of the exact Q_47 is already publicly known; verify any returned factor locally against the recorded Q_47.
2. If no usable known factor exists, choose a new bounded native GMP-ECM budget with parameters different from 100 curves / B1=1e6.
3. Stop immediately at the first candidate factor r.
4. Verify r primality, Q_47 mod r = 0, P_47 mod r != 0, P_2209 mod r = 0, and exact z_P(r)=2209.

Do not infer failure of L8 from a bounded no-factor campaign.

Until an explicit factor is obtained:
OVERALL_VERDICT = INCONCLUSIVE
PROOF_REF = null
LIVE_ROUTING = DENIED
