# NEXT ACTION — FIRST REAL INTERFACE AUDIT

Target: Horloge X72 <-> World Router.

Do not write an adapter yet.

Sequence:

1. Re-read Topbrutus/Antmux at the pinned or newer live HEAD.
2. Locate the actual Horloge/QueenCore state and tick interfaces.
3. Locate the actual World Router / Verso request and response contracts.
4. Identify tests that already prove roundtrip, continuity and portal closure.
5. Record exact paths, exported symbols, payloads and failure modes.
6. Define the smallest read-only adapter contract in Brutus.
7. Build one test with a fixed fixture.
8. Verify that Brutus never mutates the master tick.
9. Only then consider live integration.

Rule: SOURCE LIVE > registry pin > memory > hypothesis.
