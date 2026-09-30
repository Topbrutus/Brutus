# CURRENT STATE — BRUTUS — 2026-09-30

## Repository

Repository: Topbrutus/Brutus
Branch: main
Visibility: private

## Phase

PHASE 1 — FIRST INTERFACE PROVEN AT PINNED SOURCE

Established:
- source registry;
- architecture and proof policy;
- Verso card v0.1;
- data-only/read-only Verso guard;
- guaranteed DEFAULT_LOCKED reset;
- automated tests.

Horloge X72 <-> World Router:
- Antmux HEAD audited: d9b1ebd4f0184caa9f537ed64b2bf5ff0e4eba5e;
- source WORLD-ROUNDTRIP-0001 rerun: 4/4 PASS;
- Queen read boundary identified through X72ObservationAdapter;
- World transport boundary identified through transportEnvelope;
- Queen entity_id is explicitly forbidden as Fourmi antId;
- BRUTUS-CLOCK-OBSERVATION-v0.1 implemented;
- bridge tests at Brutus 17ccd9d: 13/13 PASS;
- pinned Brutus -> real Antmux transportEnvelope harness: PASS;
- negative control without portal contract: CLOSED / NO_PORTAL_CONTRACT.

Machine proof:
proofs/BRUTUS-PROOF-X72-WORLD-PINNED-0001.json

## Standing invariants

VERSO_DEFAULT = DEFAULT_LOCKED
CLOCK_AUTHORITY = QUEEN_SERVER_V0_2
LOCAL_TICK_CREATION = NO
QUEEN_ENTITY_ID_AS_ANT_ID = FORBIDDEN
WORLD_TRANSPORT_REQUIRES_FRESH_CLOCK = YES
WORLD_TRANSPORT_REQUIRES_QUEEN_INTEGRITY = YES
WORLD_ROUTE_WITHOUT_CONTRACT = CLOSED
ARBITRARY_CODE_IN_CARD = NO
SOURCE_MUTATION_BY_BRUTUS = NO

## Primary unknown

The first real production ANT_ID source has not been selected.

Brutus must not synthesize it silently.
