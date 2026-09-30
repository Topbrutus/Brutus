# NEXT ACTION — VERIFY PHASE 8 TRUST HARDENING

## Branch

`hardening/phase8-trust-boundaries-20260930`

## Required CI proof

Must prove:
- normal reviewed promotion still passes;
- forged direct-ledger RESULT is rejected;
- RESULT from wrong prototype is rejected;
- missing proof is rejected;
- SHA mismatch is rejected;
- lexical path traversal is rejected;
- proof symlink is rejected;
- symlinked proofs/ root is rejected;
- prototype manifests reject token-shaped fields;
- ledger records reject token-shaped fields;
- no new execution/network/World Router path appears.

## After success

Merge as hardening only.

Then return to:

`WAIT FOR REAL COUNTER-TEST OUTPUT`

Do not invent experimental data.

Preserve:
`LIVE_ROUTING = DENIED`
