# X72 Observation Provider — Brutus v0.1

Date: 2026-09-30

## Purpose

Bind Brutus to the **existing** Antmux `X72ObservationAdapter` without copying its Queen observation logic.

The provider is deliberately narrow:

```text
Queen Server
  -> X72ObservationAdapter              [Antmux source]
  -> one ObservationEnvelope / state
  -> X72AdapterProcessProvider          [Brutus]
  -> QueenObservationIngress
  -> BRUTUS-CARD-QUEEN-CLOCK-0001
  -> result / proof
  -> DEFAULT_LOCKED
```

## Reuse boundary

Brutus does not implement Queen HTTP/WebSocket observation again.

The bridge adds the Antmux checkout's:

`deploy/x72-shared-queen`

directory to Python import resolution and imports:

`X72ObservationAdapter`

directly from the source checkout.

Only:

`read_state()`

is called in v0.1.

## Process boundary

Node uses `execFile`, not a shell.

Arguments are passed as a fixed argv vector:

```text
python3
tools/x72_observation_bridge.py
--antmux-root <existing Antmux checkout>
--base-url <Queen read endpoint>
--mode state
```

The base URL may use HTTP or HTTPS and may not contain embedded credentials.

Default process timeout:

`5000 ms`

Maximum configurable timeout:

`30000 ms`

Stdout is bounded and must decode as one JSON object.

## Fail-closed rules

The provider does not convert malformed output into a fake clock.

Process failure:
`X72_PROVIDER_UNAVAILABLE`

Malformed bridge output:
`X72_PROVIDER_REJECTED`

The downstream QueenObservationIngress still enforces:

- Queen identity continuity;
- FRESH / STALE / UNKNOWN semantics;
- integrity_match=true for usable input;
- bounded retry/backoff.

## Explicitly absent

This provider contains no:

- copied Queen observer implementation;
- shell execution;
- credentials in URL;
- World Router invocation;
- ANT routing authorization;
- Queen mutation path;
- local tick generation.

## Runtime prerequisite

A compatible Antmux checkout must be available on the machine running Brutus.

The Antmux source remains authoritative for `X72ObservationAdapter`.

This is an integration boundary, not a vendored copy.
