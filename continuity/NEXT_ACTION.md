# NEXT ACTION — VERIFY ASTRA STATION LEDGER, THEN ADD READ-ONLY LEDGER CARD

## Branch

`astra/anchor-ledger-v01-20260930`

## Immediate gate

Run full Brutus CI.

Must prove:
- first proof record appends;
- hash chain verifies;
- second record links to first;
- duplicate record IDs are rejected;
- unknown prototype is rejected;
- unknown card is rejected;
- wrong anchor is rejected;
- executable values are rejected;
- credential-shaped fields are rejected;
- PROOF_REF records require proof references;
- update/delete APIs do not exist;
- no network/process/World Router exists.

## After CI success

Add one prepared read-only Verso card:

`BRUTUS-CARD-ASTRA-LEDGER-STATUS-0001`

It may return only:
- anchor id;
- entry count;
- ledger head hash;
- validity.

It must not append records.

Then integrate Phase 4 only after final CI.

Preserve:
`LIVE_ROUTING = DENIED`
