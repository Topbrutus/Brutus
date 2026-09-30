# CURRENT STATE — BRUTUS — 2026-09-30

## Repository

Repository: Topbrutus/Brutus
Main HEAD before ledger branch:
`83b4f33d6db245f3ba0ad7199f4a258b791904bd`

Working branch:
`astra/anchor-ledger-v01-20260930`

Draft PR:
`#6 — Add append-only ASTRA STATION trace ledger v0.1`

Visibility: public

## Phase

PHASE 4 — ASTRA STATION LEDGER + READ-ONLY STATUS CARD CANDIDATE

## Integrated on main

- Verso DEFAULT_LOCKED;
- prepared Card Registry / UNKNOWN_CARD => STOP;
- Queen read-only path with public runtime proof;
- ANCHOR-0001 / ASTRA STATION;
- prototype manifests;
- station status card;
- LIVE_ROUTING = DENIED.

## New ledger candidate

Contract:
`contracts/anchor-record.v0.schema.json`

Runtime:
`src/anchor-ledger.mjs`

First durable example:
`examples/records/BRUTUS-RECORD-QUEEN-PUBLIC-READ-0001.json`

Prepared read-only card:
`BRUTUS-CARD-ASTRA-LEDGER-STATUS-0001`

Adapter:
`src/adapters/verso-astra-ledger-status.mjs`

## Ledger invariants

```text
MODE = APPEND_ONLY
UPDATE = ABSENT
DELETE = ABSENT
KNOWN_PROTOTYPE_REQUIRED = YES
KNOWN_CARD_REQUIRED_IF_PRESENT = YES
DATA_ONLY = YES
CREDENTIAL_STORAGE = DENIED
HASH_CHAIN = SHA256
```

Status card may return only:
- anchor_id;
- mode;
- entry_count;
- head_h256;
- valid.

It cannot append.

## Routing boundary

LIVE_ROUTING = DENIED
WORLD_ROUTER = NOT_INVOKED
