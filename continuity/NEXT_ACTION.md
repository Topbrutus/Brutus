# NEXT ACTION — AUDIT REAL FOURMI IDENTITY SOURCE

Target:
find the canonical source of ANT_ID before any live continuous Horloge -> World transport.

Audit in Topbrutus/Antmux:
- current ant_birth.py implementation;
- Fourmiliere/public journal birth path;
- ANT lifecycle fields;
- role=SYNAPSE boundary;
- existing tests that prove birth identity, timing and lineage.

Questions to answer from source:
1. Which field is the authoritative ANT_ID?
2. At what exact lifecycle step does it become usable for routing?
3. What proof/tick/lineage fields must travel with it?
4. Can Brutus consume that identity read-only without modifying the Fourmiliere?
5. How is a deployment ant distinguished from a synthetic test ant?

Do not:
- invent ANT_ID;
- reuse Queen entity_id;
- create a new birth mechanism while an existing one may already be canonical.

After audit:
define BRUTUS-ANT-IDENTITY-v0.1 only from verified source fields, then test it against the existing World Router.

Rule:
SOURCE LIVE > pinned source > Brutus contract > memory > hypothesis.
