# CURRENT STATE — BRUTUS — 2026-09-30

## Repository

Repository: Topbrutus/Brutus
Main HEAD at latest synchronization:
`bf7b74722b8ee1f450089a697adf04056761d7f9`

Working branch:
`astra/queen-observation-ingress-v01-20260930`

Draft PR:
`#2 — Queen observation ingress v0.1 — read-only fail-closed boundary`

Visibility: public

## Phase

PHASE 2 — REAL X72 READ-ONLY PROVIDER CANDIDATE / LIVE ROUTING FAIL-CLOSED

Established on main:
- Verso DEFAULT_LOCKED card guard;
- proof policy and pinned source registry;
- BRUTUS-CLOCK-OBSERVATION-v0.1;
- BRUTUS-ANT-IDENTITY-v0.1;
- pinned Queen-timed World Router compatibility;
- pinned ANT identity + Queen tick compatibility;
- ant birth source proof;
- fail-closed live routing gate;
- Brutus CI workflow;
- authentic public README / AI interview entry.

Candidate on current branch:
- reuse audit of Antmux X72ObservationAdapter;
- BRUTUS-QUEEN-INGRESS-v0.1;
- strict Queen identity continuity;
- FRESH / STALE / UNKNOWN preservation;
- integrity_match=true required for downstream use;
- bounded retry/backoff;
- BRUTUS-CARD-QUEEN-CLOCK-0001;
- Verso Queen clock adapter;
- X72AdapterProcessProvider;
- Python bridge importing the existing Antmux adapter;
- state-only provider path;
- no shell execution;
- no automatic World Router invocation.

## Source pin

Antmux adapter source audited:
`bed68dbf0b8061b92ef15a9a9c5ae96d6cfc2e6b`

Source:
`deploy/x72-shared-queen/observation_adapter/adapter.py`

The runtime bridge imports that source from an existing Antmux checkout. It does not vendor/copy the adapter.

## Candidate runtime path

```text
Queen Server
  -> Antmux X72ObservationAdapter.read_state()
  -> ObservationEnvelope
  -> Brutus X72AdapterProcessProvider
  -> QueenObservationIngress
  -> BRUTUS-CARD-QUEEN-CLOCK-0001
  -> Verso result/proof
  -> DEFAULT_LOCKED
  -> ANCHOR-0001
```

## Routing authorization

ROUTING_AUTHORIZATION = UNDECIDED
LIVE_ROUTING = DENIED

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
QUEEN_INGRESS_WORLD_ROUTER_CALL = NONE
QUEEN_CLOCK_CARD_MUTABLE_VALUES = NONE
X72_PROVIDER_SHELL = FALSE
X72_PROVIDER_MODE = STATE_ONLY

## Proof boundary

PR #2 CI before provider:
- run `36746850947` = SUCCESS at `4501a6cc3d190054782fcf18b6301b647b676d0f`.

Provider integration is candidate until its branch CI is observed successful.
