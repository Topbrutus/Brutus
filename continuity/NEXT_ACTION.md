# NEXT ACTION — VERIFY PREPARED CARD REGISTRY

## Candidate branch

`astra/queen-observation-ingress-v01-20260930`

Draft PR:
`#2`

## Immediate gate

Run full Brutus CI after Card Registry hardening.

Must prove:
- BRUTUS-CARD-0001 still passes;
- BRUTUS-CARD-QUEEN-CLOCK-0001 still passes;
- unknown CARD_ID is rejected;
- known ID with changed TARGET is rejected;
- known ID with changed READ is rejected;
- runtime cannot expand mutable VALUES;
- adapter errors still reset DEFAULT_LOCKED;
- Queen read path remains read-only;
- LIVE_ROUTING remains DENIED.

## After CI

Keep PR #2 draft for review/integration decision.

Do not merge automatically merely because CI is green.

Next architectural expansion after integration:
- add new cards only by explicit registry entry + tests;
- keep Verso Core unchanged for ordinary navigation;
- let ANCHOR-0001 become the prototype workspace around the locked center.
