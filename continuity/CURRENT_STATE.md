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

PHASE 2 — PUBLIC QUEEN READ PROVEN / CARD REGISTRY HARDENING NEXT

Candidate chain on the branch:

```text
Queen Server
  -> Antmux X72ObservationAdapter.read_state()
  -> ObservationEnvelope
  -> Brutus X72AdapterProcessProvider
  -> QueenObservationIngress
  -> BRUTUS-CARD-QUEEN-CLOCK-0001
  -> Verso result/proof
  -> DEFAULT_LOCKED
  -> ANCHOR-0001
```

## Runtime proof — PROVEN

GitHub Actions run:
`36750712934`

Proof head:
`a88a91cb09396639d469ae6825839d7915f35f7a`

Antmux adapter source:
`bed68dbf0b8061b92ef15a9a9c5ae96d6cfc2e6b`

Observed public Queen:
- entity_id = `QUEEN-X72-0072`
- tick = `146857067`
- generation = `20396`
- queen_mode = `BURST`
- status = `FRESH`
- condition = `OK`
- integrity_match = `true`
- final Verso state = `DEFAULT_LOCKED`

Durable proof:
`proofs/BRUTUS-PROOF-QUEEN-PUBLIC-READ-0001.json`

Boundary:
the public observation endpoint does not expose the server runtime commit, so that commit is not claimed.

## Routing authorization

ROUTING_AUTHORIZATION = UNDECIDED
LIVE_ROUTING = DENIED
WORLD_ROUTER_IN_PUBLIC_READ_PROOF = NOT_INVOKED

## Newly identified guard gap

The current Verso Guard validates card shape and mutable keys, but a syntactically valid unknown `CARD_ID` is not yet rejected solely because it is unknown.

This is inconsistent with the intended invariant:

`UNKNOWN_CARD => STOP`

Next hardening must add a prepared Card Registry and bind each known CARD_ID to its allowed static fields and mutable values.

## Standing invariants

VERSO_DEFAULT = DEFAULT_LOCKED
CARD_REQUIRED = YES
UNKNOWN_CARD = STOP
CLOCK_AUTHORITY = QUEEN_SERVER_V0_2
WORLD_TICK_SOURCE = QUEEN tick_count
QUEEN_ENTITY_ID_AS_ANT_ID = FORBIDDEN
LIVE_ROUTE_WITH_UNDECIDED_AUTH = DENIED
SOURCE_MUTATION_BY_BRUTUS = NO
X72_PROVIDER_SHELL = FALSE
X72_PROVIDER_MODE = STATE_ONLY
