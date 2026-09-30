# NEXT ACTION — DEFINE THE FIRST SAFE LIVE INPUT, NOT LIVE ROUTING

Because routing authorization is absent, do not open live world transport yet.

Next safest step:
design a read-only Brutus ingestion boundary for Queen observations first.

Requirements:
- consume only authoritative Queen read interfaces;
- no QueenCore creation;
- no local tick;
- no mutation HTTP methods;
- identity continuity enforcement;
- FRESH / STALE semantics;
- integrity_match required before downstream use;
- bounded retry/backoff;
- no automatic World Router invocation.

In parallel, leave ANT live routing closed until an explicit authorization contract exists.

Before implementation:
audit whether Antmux's existing X72ObservationAdapter can be reused directly or wrapped without duplication.

Rule:
reuse proven source before inventing a second observer.
