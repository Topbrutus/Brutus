# Brutus–Pell L8 — exact Q47 rank witness — 2026-10-01

## Target

q = 47

Q_47 is the integrated 828-digit quotient with SHA-256:

`59ce8bd15e4bbfbec0403b55231ee2919425739d929a32787aa3135f9891d634`

## Successful factor campaign

Engine: GMP-ECM 7.0.6

Command shape:

```text
ecm -one -c 50 3e6
```

Requested curves: 50  
B1: 3e6  
B2: not explicitly supplied  
Runtime: approximately 3258.22 seconds

Observed factor:

```text
424675575059690484579658261789171649
```

The factor has 36 decimal digits.

## Independent verification

The ECM runner verifies divisibility and Pell residues but does not itself prove primality. A separate Windows Python 3.12.10 / SymPy 1.14.0 check returned:

```text
isprime = True
```

Independent exact modular checks:

```text
Q_47 mod r   = 0
P_1 mod r    = 1
P_47 mod r   = 345869461223138161
P_2209 mod r = 0
```

Since 2209 = 47^2 and its positive divisors are exactly 1, 47 and 2209, these residues give:

```text
z_P(r) = 2209 = 47^2
```

Therefore the factor is an exact-rank L8 witness for q=47.

## Partial factorization boundary

Q_47 factorization is still PARTIAL.

The remaining cofactor has 792 digits and SHA-256:

`978b7253d1665b4c59168fed591b9844db1faf9020b675776ef6a274ba36f570`

Exact reconstruction Q_47 = r × cofactor was verified.

## Counter-test status

CT-01 = PASS  
CT-02 = PASS  
CT-03 = PASS  
CT-04 = PASS

OVERALL VERDICT = PASS

This is a counter-test result, not an automatically promoted proof artifact.

PROOF_REF = null  
AUTO_PROOF_PROMOTION = false  
LIVE_ROUTING = DENIED
