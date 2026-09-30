# CURRENT STATE — BRUTUS — 2026-09-30

## Repository

Repository: Topbrutus/Brutus
Main HEAD before intake branch:
`fe8fdb2cd17bab9b2168288d41a0b90878ca0cf5`

Working branch:
`astra/experiment-intake-bench-v01-20260930`

Visibility: public

## Phase

PHASE 5 — EXPERIMENT INTAKE AT ASTRA STATION

## Integrated on main

- Verso DEFAULT_LOCKED;
- prepared Card Registry / UNKNOWN_CARD => STOP;
- Queen read-only public path and proof;
- ANCHOR-0001 / ASTRA STATION;
- read-only station status card;
- append-only SHA-256 trace ledger;
- read-only ledger status card;
- LIVE_ROUTING = DENIED.

Phase 4 post-merge CI:
`36753282491 = SUCCESS`

## New candidate

Prototype:
`BRUTUS-PROTOTYPE-EXPERIMENT-INTAKE-0001`

Purpose:
receive external experiment reports as qualified traces without auto-execution or proof promotion.

First intake records:
- `BRUTUS-RECORD-ZELSTEREOS-369-396-0001`
- `BRUTUS-RECORD-BRUTUS-PELL-L7-L8-0001`

Evidence boundaries:
- ZELSTEREOS record = USER_REPORTED_NOT_REVERIFIED_BY_BRUTUS;
- L7/L8 record = EXTERNAL_DERIVED_RELATIONS_NOT_REVERIFIED_BY_BRUTUS.

Neither record is a Brutus proof.

## Architectural rule

New experimental information should first use:
`PROTOTYPE -> QUALIFIED TRACE -> COUNTER-TEST -> PROOF LINK`

Do not create a new Verso card merely because a new experiment exists.

## Routing boundary

LIVE_ROUTING = DENIED
