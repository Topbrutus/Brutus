# CURRENT STATE — BRUTUS — 2026-09-30

## Repository

Repository: Topbrutus/Brutus
Branch: main
Visibility: private

## Phase

PHASE 2 — CLOCK + ANT IDENTITY + PINNED WORLD COMPATIBILITY

Established:
- Verso card v0.1 / DEFAULT_LOCKED guard;
- proof policy and source registry;
- BRUTUS-CLOCK-OBSERVATION-v0.1;
- BRUTUS-ANT-IDENTITY-v0.1;
- pinned X72 clock -> World Router compatibility;
- pinned ANT identity + Queen clock -> World Router compatibility;
- source ant birth test proof;
- continuous invariant test workflow.

## Verified local/integration results

Brutus 2b157325130e10cffd049c0b998c0d2c2fc665f8:
- npm test = 19 PASS / 0 FAIL.

Antmux source d9b1ebd4f0184caa9f537ed64b2bf5ff0e4eba5e:
- WORLD-ROUNDTRIP-0001 source tests = 4 PASS / 0 FAIL.
- public journal source test = 9 PASS markers / exit code 0.

Pinned compatibility:
- ANT_ID from ANTMUX-ANT-BIRTH-v1.
- TICK from QUEEN_SERVER_V0_2 observation.
- CARBON -> CRYPTO accepted.
- TIME/CLOCK without portal contract closed as NO_PORTAL_CONTRACT.
- birth wall-clock milliseconds never used as World Router tick.

Proof:
proofs/BRUTUS-PROOF-ANT-CLOCK-WORLD-PINNED-0001.json

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

- production routing policy deciding which born ants may route;
- read-only ingestion boundary for existing ant receipts;
- live Queen observation consumer in Brutus;
- final crystal contract;
- Chaudiere d'esprit / accumulator / dephaser;
- complete EmojiLogic opcode bank.
