# NEXT ACTION — PINNED BRIDGE INTEGRATION PROOF

Goal:
prove that a Brutus world transport request produced from a validated clock observation is accepted by the real Antmux world-router.mjs at the pinned source SHA.

Constraints:
- do not modify Antmux;
- do not copy the router into Brutus permanently;
- fetch the pinned source only in an isolated verification harness;
- use an explicit test ANT_ID;
- preserve Queen entity_id only as provenance, never as ANT_ID;
- use the Queen tick as the transport tick;
- require proofRef;
- verify accepted=true and invariant preservation;
- verify NO_PORTAL_CONTRACT remains closed.

After that proof, choose the real ANT_ID source before any live continuous integration.

Rule:
SOURCE LIVE > pinned source > Brutus adapter > memory > hypothesis.
