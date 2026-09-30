# CURRENT STATE — BRUTUS — 2026-09-30

## Repository

Repository: Topbrutus/Brutus
Main HEAD source at branch creation:
`d5267622b544d07b14e8cf12e7420402fe458772`

Working branch:
`astra/queen-observation-ingress-v01-20260930`

Draft PR:
`#2 — Queen observation ingress v0.1 — read-only fail-closed boundary`

Visibility: private

## Phase

PHASE 2 — VERSO QUEEN CLOCK CARD CANDIDATE / LIVE ROUTING FAIL-CLOSED

Established on main:
- Verso DEFAULT_LOCKED card guard;
- proof policy and pinned source registry;
- BRUTUS-CLOCK-OBSERVATION-v0.1;
- BRUTUS-ANT-IDENTITY-v0.1;
- pinned Queen-timed World Router compatibility;
- pinned ANT identity + Queen tick compatibility;
- ant birth source proof;
- fail-closed live routing gate;
- Brutus CI workflow.

Candidate on current branch:
- reuse audit of Antmux X72ObservationAdapter;
- BRUTUS-QUEEN-INGRESS-v0.1;
- strict Queen identity continuity;
- FRESH / STALE / UNKNOWN preservation;
- integrity_match=true required for downstream use;
- bounded retry/backoff;
- no Queen mutation transport;
- no automatic World Router invocation;
- BRUTUS-CARD-QUEEN-CLOCK-0001;
- Verso Queen clock adapter;
- read-only card path returns to DEFAULT_LOCKED.

## Source audit

Antmux source audited:
`bed68dbf0b8061b92ef15a9a9c5ae96d6cfc2e6b`

Source adapter:
`deploy/x72-shared-queen/observation_adapter/adapter.py`

Decision:
reuse the proven source observer; do not build a second Queen network observer inside Brutus.

## Card path

```text
ANCHOR-0001 / ASTRA_STATION
  -> BRUTUS-CARD-QUEEN-CLOCK-0001
  -> Verso Guard
  -> QueenObservationIngress
  -> verified Queen clock result
  -> DEFAULT_LOCKED
  -> ANCHOR-0001
```

The path contains no World Router call.

## Routing authorization

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
QUEEN_INGRESS_NETWORK_TRANSPORT = NONE
QUEEN_INGRESS_WORLD_ROUTER_CALL = NONE
QUEEN_CLOCK_CARD_MUTABLE_VALUES = NONE

## Test proof

Ingress targeted local test before first commit:
`9 PASS / 0 FAIL`

PR #2 first-head CI:
run `36746408085` = SUCCESS at `c400244213349d8ae2091e6cbddd72370afc0513`.

Ingress + Verso Queen card targeted local tests before second commit:
`14 PASS / 0 FAIL`.

Full CI for the new branch head remains to be observed after this commit.
