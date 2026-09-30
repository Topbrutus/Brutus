# CURRENT STATE — BRUTUS — 2026-09-30

## Repository

Repository: Topbrutus/Brutus
Main HEAD at latest synchronization:
`bf7b74722b8ee1f450089a697adf04056761d7f9`

Working branch:
`astra/queen-observation-ingress-v01-20260930`

Draft PR:
`#2 — Queen observation ingress v0.1 — read-only fail-closed boundary`

Visibility: public

## Phase

PHASE 2 — PUBLIC QUEEN READ PROVEN / PREPARED CARD REGISTRY CANDIDATE

## Proven live read

Durable proof:
`proofs/BRUTUS-PROOF-QUEEN-PUBLIC-READ-0001.json`

GitHub Actions run:
`36750712934 = SUCCESS`

Observed through the real public read-only Queen path:
- entity_id = `QUEEN-X72-0072`
- tick = `146857067`
- generation = `20396`
- queen_mode = `BURST`
- status = `FRESH`
- integrity_match = `true`
- Verso final state = `DEFAULT_LOCKED`

The temporary proof workflow was removed after recording the proof.

## Prepared card hardening

Candidate Card Registry:
`registry/verso-cards.v0.json`

Runtime registry:
`src/verso-card-registry.mjs`

Guard now requires:
- known CARD_ID;
- exact prepared static contract;
- mutable VALUES only from that card's registry policy.

Rules:

```text
UNKNOWN_CARD => STOP
KNOWN_ID + ALTERED_STATIC_CONTRACT => STOP
RUNTIME_MAY_NARROW_MUTABLE_VALUES => YES
RUNTIME_MAY_EXPAND_MUTABLE_VALUES => NO
```

Registered cards:
- BRUTUS-CARD-0001
- BRUTUS-CARD-QUEEN-CLOCK-0001

## Routing authorization

ROUTING_AUTHORIZATION = UNDECIDED
LIVE_ROUTING = DENIED
WORLD_ROUTER_IN_PUBLIC_READ_PROOF = NOT_INVOKED

## Standing invariants

VERSO_DEFAULT = DEFAULT_LOCKED
CARD_REQUIRED = YES
PREPARED_CARD_REQUIRED = YES
UNKNOWN_CARD = STOP
ARBITRARY_CARD_CODE = NO
SOURCE_MUTATION_BY_CARD = NO
CLOCK_AUTHORITY = QUEEN_SERVER_V0_2
WORLD_TICK_SOURCE = QUEEN tick_count
LIVE_ROUTE_WITH_UNDECIDED_AUTH = DENIED
SOURCE_MUTATION_BY_BRUTUS = NO
