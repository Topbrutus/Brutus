# CURRENT STATE — BRUTUS — 2026-09-30

## Repository

Repository: Topbrutus/Brutus
Main HEAD before ANCHOR-0001 branch:
`825cf9457f1e12866ba4e7bb2e7d69989ab50558`

Working branch:
`astra/anchor-0001-station-v01-20260930`

Draft PR:
`#5 — Establish ANCHOR-0001 / ASTRA STATION v0.1`

Visibility: public

## Phase

PHASE 3 — ASTRA STATION + READ-ONLY STATUS CARD CANDIDATE

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

## ANCHOR-0001 candidate

Fixed anchor:
`ANCHOR-0001 / ASTRA STATION`

Files:
- `registry/anchors.v0.json`
- `contracts/prototype-manifest.v0.schema.json`
- `src/anchor-station.mjs`
- `docs/ASTRA_STATION_v0.1.md`

First prototype:
`BRUTUS-PROTOTYPE-QUEEN-CLOCK-BENCH-0001`

First station card:
`BRUTUS-CARD-ASTRA-STATION-STATUS-0001`

Purpose:
read only:
- anchor identity;
- station status;
- fixed return point;
- prototype count;
- prototype list/status.

## Safety invariants

```text
ANCHOR_ID = ANCHOR-0001
RETURN_POINT = YES
VERSO_CORE_MUTATION = NO
WORLD_ROUTER_INVOCATION = NO

STATION_STATUS_CARD_WRITE = NO
STATION_STATUS_CARD_CODE_CHANGE = NO
STATION_STATUS_CARD_CREATE_ROUTE = NO
STATION_STATUS_CARD_MUTABLE_VALUES = NONE
```

Prototype manifests remain data-only and may reference only prepared Verso cards.

## Routing boundary

LIVE_ROUTING = DENIED
