# CURRENT STATE — BRUTUS — 2026-09-30

## Repository

Repository: Topbrutus/Brutus
Branch: main
Visibility: private

## Phase

PHASE 2 — VERIFIED COMPATIBILITY / LIVE ROUTING FAIL-CLOSED

Established:
- Verso DEFAULT_LOCKED card guard;
- proof policy and pinned source registry;
- BRUTUS-CLOCK-OBSERVATION-v0.1;
- BRUTUS-ANT-IDENTITY-v0.1;
- pinned Queen-timed World Router compatibility;
- pinned ANT identity + Queen tick compatibility;
- ant birth source proof;
- fail-closed live routing gate;
- Brutus CI workflow committed.

## Routing authorization audit

At Antmux d9b1ebd4f0184caa9f537ed64b2bf5ff0e4eba5e:
- public_journal.py exposes no GET endpoint for existing ant receipts;
- no source rule was found linking SINGING_TO_MEET / ANT_READY_TO_SING to World Router authorization;
- World Router validates route contract and envelope fields, not ant lifecycle eligibility.

Therefore:
ROUTING_AUTHORIZATION = UNDECIDED
LIVE_ROUTING = DENIED

Compatibility tests remain allowed and isolated.

## Standing invariants

VERSO_DEFAULT = DEFAULT_LOCKED
CLOCK_AUTHORITY = QUEEN_SERVER_V0_2
WORLD_TICK_SOURCE = QUEEN tick_count
ANT_BIRTH_WALLCLOCK_AS_WORLD_TICK = FORBIDDEN
QUEEN_ENTITY_ID_AS_ANT_ID = FORBIDDEN
ANT_ID_MUST_BE_EXPLICIT = YES
LIVE_ROUTE_WITH_UNDECIDED_AUTH = DENIED
WORLD_ROUTE_WITHOUT_PORTAL_CONTRACT = CLOSED
SOURCE_MUTATION_BY_BRUTUS = NO

## CI proof boundary

Workflow file is present on main:
.github/workflows/brutus-ci.yml

Its GitHub Actions push-run status has not yet been independently confirmed by the available connector.
Do not report CI PASS until a run result is observed directly.
