# CURRENT STATE — BRUTUS — 2026-09-30

## Repository

Repository: Topbrutus/Brutus
Branch: main
Visibility: private

## Phase

PHASE 1 — FIRST INTERFACE CONTRACT

Bootstrap already established:
- source registry;
- architecture and proof policy;
- Verso card v0.1;
- data-only/read-only Verso guard;
- guaranteed DEFAULT_LOCKED reset;
- automated tests.

First source audit completed:
- interface: Horloge X72 <-> World Router;
- Antmux HEAD audited: d9b1ebd4f0184caa9f537ed64b2bf5ff0e4eba5e;
- WORLD-ROUNDTRIP-0001 rerun directly: 4/4 PASS;
- Queen read boundary identified through X72ObservationAdapter;
- World transport boundary identified through transportEnvelope;
- identity mismatch identified: Queen entity_id is not Fourmi antId;
- intermediate BRUTUS-CLOCK-OBSERVATION-v0.1 introduced;
- bridge requires explicit antId and never creates one automatically.

## Standing invariants

VERSO_DEFAULT = DEFAULT_LOCKED
CLOCK_AUTHORITY = QUEEN_SERVER_V0_2
LOCAL_TICK_CREATION = NO
QUEEN_ENTITY_ID_AS_ANT_ID = FORBIDDEN
WORLD_TRANSPORT_REQUIRES_FRESH_CLOCK = YES
WORLD_TRANSPORT_REQUIRES_QUEEN_INTEGRITY = YES
ARBITRARY_CODE_IN_CARD = NO
SOURCE_MUTATION_BY_BRUTUS = NO

## Unknowns preserved

- source of the first real ANT_ID used by Brutus;
- live network connection from Brutus to Queen observation stream;
- production invocation boundary for Antmux transportEnvelope;
- final universal crystal contract;
- resource governor / Chaudiere d'esprit;
- accumulator and movement dephaser;
- complete EmojiLogic opcode bank;
- chakra crystallization levels;
- unified microphone/voice path.
