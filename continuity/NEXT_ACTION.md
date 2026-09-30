# NEXT ACTION — VERIFY AND INTEGRATE PHASE 4

## Branch

`astra/anchor-ledger-v01-20260930`

Draft PR:
`#6`

## Immediate gate

Run full Brutus CI after ledger status card.

Must prove:
- ledger append/hash-chain tests remain green;
- prepared ledger status card is accepted;
- it returns count/head/validity;
- it returns DEFAULT_LOCKED;
- append READ mutation is rejected;
- mutable VALUES are rejected;
- adapter contains no append call;
- no network/process/World Router is introduced.

## After CI success

If main has not drifted incompatibly:
- mark PR #6 ready;
- merge with expected head SHA;
- verify post-merge main CI.

## Next architecture after integration

Stop adding capabilities to Verso by default.

The next expansion should happen as a **new prototype manifest at ASTRA STATION**, using existing cards and ledger traces first.

Only create a new card when an experiment proves a missing read capability.

Preserve:
`LIVE_ROUTING = DENIED`
