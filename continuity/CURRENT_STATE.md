# CURRENT STATE — BRUTUS — 2026-09-30

## Repository

Repository: Topbrutus/Brutus
Branch: main
Visibility: public

Main HEAD at Phase 5 integration:
`250a41da9b72f1e9d856663d16e78ecf54decbd4`

Post-merge Brutus CI:
`36753723566 = SUCCESS`

## Phase

PHASE 5 — EXPERIMENT INTAKE INTEGRATED

## Integrated architecture

### Verso
- DEFAULT_LOCKED by default;
- prepared Card Registry;
- UNKNOWN_CARD => STOP;
- known card with altered static contract => STOP;
- runtime may narrow mutable values but cannot expand them.

### Queen read path
- existing Antmux X72ObservationAdapter is reused;
- QueenObservationIngress validates FRESH / STALE / UNKNOWN;
- integrity_match=true required for usable clock data;
- public read path was proven end-to-end;
- durable proof:
  `proofs/BRUTUS-PROOF-QUEEN-PUBLIC-READ-0001.json`.

### ANCHOR-0001 / ASTRA STATION
- fixed return point;
- prototype manifests are data-only;
- no network/process execution in station runtime;
- no Verso Core mutation;
- no World Router invocation.

Prepared station read card:
`BRUTUS-CARD-ASTRA-STATION-STATUS-0001`

### Append-only trace ledger
- SHA-256 chained entries;
- no update/delete API;
- known prototype required;
- known CARD_ID required when present;
- credential-shaped fields rejected;
- no execution/network/World Router.

Prepared ledger read card:
`BRUTUS-CARD-ASTRA-LEDGER-STATUS-0001`

### Experiment Intake Bench
Prototype:
`BRUTUS-PROTOTYPE-EXPERIMENT-INTAKE-0001`

Purpose:
receive external experiment reports as qualified traces without auto-execution, proof promotion or Verso expansion.

Initial intake records:
- `BRUTUS-RECORD-ZELSTEREOS-369-396-0001`
- `BRUTUS-RECORD-BRUTUS-PELL-L7-L8-0001`

Evidence boundary:
- ZELSTEREOS record = `USER_REPORTED_NOT_REVERIFIED_BY_BRUTUS`;
- L7/L8 record = `EXTERNAL_DERIVED_RELATIONS_NOT_REVERIFIED_BY_BRUTUS`.

Neither is promoted to a Brutus proof by intake alone.

## Core working rule

```text
NEW EXPERIMENT
  -> PROTOTYPE / EXISTING WORKSPACE
  -> QUALIFIED TRACE
  -> COUNTER-TEST
  -> PROOF LINK IF EARNED
  -> NEW CARD ONLY IF A REAL READ CAPABILITY IS MISSING
```

## Routing boundary

`LIVE_ROUTING = DENIED`

No current Phase 5 component authorizes live ANT routing.
