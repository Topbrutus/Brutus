# CURRENT STATE — BRUTUS — 2026-09-30

## Repository

Repository: Topbrutus/Brutus
Main HEAD before ANCHOR-0001 branch:
`825cf9457f1e12866ba4e7bb2e7d69989ab50558`

Working branch:
`astra/anchor-0001-station-v01-20260930`

Visibility: public

## Phase

PHASE 3 — ANCHOR-0001 / ASTRA STATION CANDIDATE

## Integrated baseline on main

- Verso DEFAULT_LOCKED Guard;
- prepared Card Registry;
- UNKNOWN_CARD => STOP;
- QueenObservationIngress v0.1;
- BRUTUS-CARD-QUEEN-CLOCK-0001;
- real X72ObservationAdapter provider binding;
- public Queen live-read proof;
- LIVE_ROUTING = DENIED;
- authentic public README.

Integrated Queen proof:
`proofs/BRUTUS-PROOF-QUEEN-PUBLIC-READ-0001.json`

Main post-merge Brutus CI:
`36751838172 = SUCCESS`

## New candidate

Fixed anchor registry:
`registry/anchors.v0.json`

Prototype manifest contract:
`contracts/prototype-manifest.v0.schema.json`

Astra Station runtime:
`src/anchor-station.mjs`

First prototype:
`examples/prototypes/BRUTUS-PROTOTYPE-QUEEN-CLOCK-BENCH-0001.json`

## Anchor invariants

```text
ANCHOR_ID = ANCHOR-0001
NAME = ASTRA STATION
STATUS = ESTABLISHED
RETURN_POINT = YES

VERSO_CORE_MUTATION = NO
WORLD_ROUTER_INVOCATION = NO
ROUTE_CREATION = NO
SOURCE_CODE_EXECUTION = NO
CREDENTIAL_STORAGE = NO
```

Prototype manifests:
- data-only;
- known fields only;
- remain at ANCHOR-0001;
- may reference only prepared CARD_ID values;
- duplicate IDs are rejected.

## Persistence boundary

Session registrations are in-memory only.

Durable manifests are repository data files.

No mutable database is introduced yet.

## Routing boundary

LIVE_ROUTING = DENIED
