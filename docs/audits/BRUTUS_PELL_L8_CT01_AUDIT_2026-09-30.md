# Brutus–Pell L8 — CT-01 mathematical audit

Date: 2026-09-30

Claim: for the Pell sequence P_0=0, P_1=1, P_(n+2)=2P_(n+1)+P_n, if q is an odd prime and r is a prime divisor of Q_q=P_(q^2)/P_q, then z_P(r)=q^2.

Standard facts used:
- gcd(P_m,P_n)=P_gcd(m,n).
- r divides P_n iff z_P(r) divides n.
- for odd prime r, z_P(r) divides r-(2/r).

Quotient congruence:
Q_q is congruent to (-1)^((q-1)/2) q modulo P_q.

Why gcd(P_q,Q_q)=1:
If q divided P_q, then z_P(q) would divide q. But z_P(q) also divides q-(2/q), which is q-1 or q+1. This would force z_P(q)=1, impossible because P_1=1. Hence q does not divide P_q. The quotient congruence then gives gcd(P_q,Q_q)=gcd(P_q,q)=1.

Exact rank:
If prime r divides Q_q, then r divides P_(q^2), hence z_P(r) divides q^2. Since gcd(P_q,Q_q)=1, r does not divide P_q, so z_P(r) does not divide q. The only positive divisors of q^2 are 1,q,q^2, and z_P(r) is not 1. Therefore z_P(r)=q^2.

Domain boundary:
- q=2 is outside the theorem: Q_2=6 and z_P(2)=2, not 4.
- q=9 is composite: 53 divides Q_9 but z_P(53)=27, not 81.

Classification:
CT-01 = PASS
L8_STATUS = VALID_AS_STATED

Reference checked for the standard Pell facts:
Bernadette Faye and Florian Luca, Pell Numbers Whose Euler Function Is a Pell Number, Publications de l'Institut Mathematique 101(115), 2017, Lemma 2.3 and the order-of-appearance discussion immediately following it.

This audit does not supply a factor of Q_47, Q_71 or Q_83, so CT-03 remains INCONCLUSIVE.
