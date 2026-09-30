# CURRENT STATE — BRUTUS — 2026-09-30

## Repository

Repository: Topbrutus/Brutus
Main HEAD before ledger branch:
`83b4f33d6db245f3ba0ad7199f4a258b791904bd`

Working branch:
`astra/anchor-ledger-v01-20260930`

Visibility: public

## Phase

PHASE 4 — ASTRA STATION APPEND-ONLY TRACE LEDGER CANDIDATE

## Integrated on main

- Verso DEFAULT_LOCKED;
- prepared Card Registry / UNKNOWN_CARD => STOP;
- Queen read-only path with public runtime proof;
- ANCHOR-0001 / ASTRA STATION;
- data-only prototype manifests;
- Queen Clock Observation Bench;
- BRUTUS-CARD-ASTRA-STATION-STATUS-0001;
- LIVE_ROUTING = DENIED.

ASTRA STATION post-merge CI:
`36752682867 = SUCCESS`

## New candidate

Contract:
`contracts/anchor-record.v0.schema.json`

Runtime:
`src/anchor-ledger.mjs`

Example record:
`examples/records/BRUTUS-RECORD-QUEEN-PUBLIC-READ-0001.json`

Documentation:
`docs/ASTRA_STATION_LEDGER_v0.1.md`

## Ledger invariants

```text
MODE = APPEND_ONLY
ANCHOR_ID = ANCHOR-0001
KNOWN_PROTOTYPE_REQUIRED = YES
KNOWN_CARD_REQUIRED_IF_PRESENT = YES
DATA_ONLY = YES
CREDENTIAL_STORAGE = DENIED
UPDATE = ABSENT
DELETE = ABSENT
NETWORK = NONE
PROCESS_EXECUTION = NONE
WORLD_ROUTER = NONE
```

Each entry forms a SHA-256 chain:
`PREVIOUS_H256 -> ENTRY_H256`.

## Routing boundary

LIVE_ROUTING = DENIED
