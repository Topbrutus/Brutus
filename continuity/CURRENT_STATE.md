# CURRENT STATE — BRUTUS — 2026-09-30

## Repository

Repository: Topbrutus/Brutus
Branch: main
Visibility: private

## Phase

PHASE 2 — CLOCK + ANT IDENTITY BOUNDARIES

Established:
- Verso card v0.1 / DEFAULT_LOCKED guard;
- proof policy and source registry;
- BRUTUS-CLOCK-OBSERVATION-v0.1;
- X72 clock -> World Router bridge;
- pinned real-router compatibility proof;
- BRUTUS-ANT-IDENTITY-v0.1;
- source ant birth audit and source test proof.

## Proven source facts

Antmux HEAD audited:
d9b1ebd4f0184caa9f537ed64b2bf5ff0e4eba5e

Public-journal birth path:
- ant_id == submission/post id == ants.id;
- current generated format ANT-[0-9A-F]{12};
- role SYNAPSE;
- BECOME_SYNAPSE lifecycle step DONE;
- state SINGING_TO_MEET;
- birth_tick_ms comes from time.time(), therefore is wall-clock milliseconds, not Queen tick.

Source public-journal test:
9 PASS markers / exit code 0.

## Standing invariants

VERSO_DEFAULT = DEFAULT_LOCKED
CLOCK_AUTHORITY = QUEEN_SERVER_V0_2
WORLD_TICK_SOURCE = QUEEN tick_count
ANT_BIRTH_WALLCLOCK_AS_WORLD_TICK = FORBIDDEN
QUEEN_ENTITY_ID_AS_ANT_ID = FORBIDDEN
ANT_ID_MUST_BE_EXPLICIT = YES
ROUTING_AUTHORIZATION_FROM_BIRTH_RECEIPT = UNDECIDED
WORLD_ROUTE_WITHOUT_CONTRACT = CLOSED
SOURCE_MUTATION_BY_BRUTUS = NO

## Unknowns preserved

- production policy deciding which born ants may enter world routing;
- read-only ingestion boundary for existing ant receipts;
- live Queen network consumer in Brutus;
- final crystal contract;
- Chaudiere d'esprit / accumulator / dephaser;
- complete EmojiLogic opcode bank.
