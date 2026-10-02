# Live Fourmi Transport Authorization v0.1

Status: candidate.

## Purpose

Provide the explicit missing authorization layer required before any live Fourmi transport may occur.

Previous audit result:

~~~
ROUTING_AUTHORIZATION = UNDECIDED
=> LIVE ROUTING = DENIED
~~~

This contract creates a bounded authorization artifact without performing movement.

The intended sequence becomes:

~~~
LIVE ANT IDENTITY
+
FOURMI MATH MATERIAL
+
CONTROL-PLANE DECISION
        |
        v
LIVE FOURMI TRANSPORT AUTHORIZATION
        |
        v
future one-step runtime
        |
        v
ANT_MOVE
~~~

## Core boundary

The authorization artifact may say:

~~~
ROUTING_AUTHORIZATION = AUTHORIZED
~~~

but it remains:

~~~
EXECUTABLE = false
GATE_AUTHORITY = false
PROOF_REF = null
~~~

Therefore:

~~~
AUTHORIZED != MOVED
AUTHORIZED != EXECUTED
AUTHORIZED != PROVED
~~~

## Exact identity binding

The grant binds one exact normalized Antmux ant identity.

It preserves:

~~~
ANT_ID
ANT_IDENTITY_H256
~~~

The normalized identity must come from a valid:

~~~
ANTMUX-ANT-BIRTH-v1
~~~

receipt through the existing Brutus ant-identity adapter.

The identity hash covers the normalized runtime identity, including role, state, lineage and memory identity.

If the same ANT_ID later presents a different lifecycle state or identity content, the old authorization no longer matches.

## Exact material binding

The grant binds one exact:

~~~
FOURMI_MATH_MATERIAL
~~~

by:

~~~
MATERIAL_ID
MATERIAL_H256
~~~

The material must already have:

~~~
TRANSPORT_AUTHORIZATION = true
TRANSPORT_STATE = ADMITTED_NOT_MOVED
~~~

A different material or modified material hash cannot use the grant.

## Exact route scope

The authorization scope pins one directed world edge:

~~~
FROM = W:...
TO   = W:...
~~~

with:

~~~
FROM != TO
~~~

The grant cannot be reused for another route.

## Lifecycle scope

The scope records:

~~~
REQUIRED_ANT_ROLE = SYNAPSE
REQUIRED_ANT_STATE = exact current normalized state
~~~

The first authorization is therefore tied not only to ANT_ID but also to the ant's admitted lifecycle state at grant creation.

## Time window

All authorization timing uses:

~~~
CLOCK_AUTHORITY = QUEEN_SERVER_V0_2
~~~

The grant carries:

~~~
ISSUED_AT_TICK
VALID_FROM_TICK
EXPIRES_AT_TICK
~~~

Required chronology:

~~~
MATERIAL.CREATED_AT_TICK
    <= ISSUED_AT_TICK
    <= VALID_FROM_TICK
    <= EXPIRES_AT_TICK
~~~

The validity span is finite and bounded in v0.1 to:

~~~
MAX_VALIDITY_SPAN_TICKS = 65536
~~~

The contract does not assign physical time duration to Queen ticks.

## Single-use rule

Every authorization fixes:

~~~
SINGLE_USE = true
SCOPE.MAX_MOVES = 1
~~~

The authorization gate accepts an explicit consumed-state input.

If already consumed:

~~~
authorization denied
~~~

The following runtime must persist/track actual consumption before a second call can be considered.

## Control Plane approval

The grant requires:

~~~
AUTHORIZATION.POLICY =
  BRUTUS-LIVE-FOURMI-TRANSPORT-v0.1

AUTHORIZATION.DECISION = APPROVED
AUTHORIZATION.APPROVER = BRUTUS_CONTROL_PLANE
~~~

This is a bounded Brutus control-plane authorization record.

It is not an external cryptographic identity-signature system.

## Determinism

The same exact:

~~~
ANT identity
material
issued tick
validity interval
route
trace
~~~

produces the same:

~~~
AUTHORIZATION_ID
SIGNATURE_H256
~~~

No random grant identity is created.

## Authorization verdict

Before runtime movement, Brutus can call:

~~~
assertLiveMaterialTransportAuthorized(...)
~~~

The gate revalidates:

- the authorization artifact;
- the live Antmux birth identity;
- the exact Fourmi math material;
- the material carrier ANT_ID;
- the ant role/state;
- the Queen tick window;
- the exact FROM -> TO scope;
- single-use consumed state.

A valid decision returns:

~~~
BRUTUS-LIVE-FOURMI-TRANSPORT-VERDICT-v0.1

DECISION = AUTHORIZED
ROUTING_AUTHORIZATION = AUTHORIZED
SINGLE_USE = true
CONSUMED = false

EXECUTABLE = false
GATE_AUTHORITY = false
PROOF_REF = null
~~~

The verdict is permission evidence only.

It does not mutate a world model or produce ANT_MOVE.

## Why this contract is required

The existing Brutus audit found that Antmux birth state alone does not authorize live World Router transport.

A Fourmi may be a valid:

~~~
ANTMUX-ANT-BIRTH-v1
role = SYNAPSE
BECOME_SYNAPSE = DONE
~~~

while routing remains unspecified.

This contract closes that policy gap explicitly rather than mutating:

~~~
BRUTUS-ANT-IDENTITY-v0.1
~~~

in place.

The original normalized identity remains:

~~~
ROUTING_AUTHORIZATION = UNDECIDED
~~~

The separate authorization artifact is what grants the one bounded transport.

## Current live limitation

This authorization contract does not solve the remaining source-state problem by itself.

The currently observed X72 stream still does not expose:

~~~
live ANT position
material attachment state
ANT_MOVE
~~~

Therefore no production movement is claimed in this brick.

The next runtime must consume real state/position inputs and this authorization before emitting any ANT_MOVE.

## Tests

Targeted tests cover:

- exact bounded authorization creation;
- deterministic grant ID/hash;
- wrong live ant identity;
- wrong material;
- wrong route;
- not-yet-active grant;
- expired grant;
- consumed single-use grant;
- lifecycle-state change;
- denied Control Plane decision;
- authorization before material admission;
- excessive validity span;
- successful non-executable authorization verdict;
- tamper detection;
- no network/timer/random/process execution in core.

## Files

~~~
contracts/live-fourmi-transport-authorization.v0.schema.json
src/live-fourmi-transport-authorization.mjs
tests/live-fourmi-transport-authorization.test.mjs
docs/LIVE_FOURMI_TRANSPORT_AUTHORIZATION_v0.1.md
~~~

## Next brick

The next safe runtime can now be built as a one-step authoritative transport cycle:

~~~
FRESH QUEEN CLOCK
+
LIVE ANT IDENTITY
+
RUNTIME WORLD POSITION
+
FOURMI MATH MATERIAL
+
LIVE TRANSPORT AUTHORIZATION
        |
        v
ONE BOUNDED STATE TRANSITION
        |
        +--> carrier ATTACHED observation
        +--> ANT_MOVE
        +--> authorization consumed
        |
        v
MATERIAL_MOVE binding
~~~

That runtime must remain one-cycle / fail-closed and must not choose an autonomous route.

Its FROM and TO must exactly match the explicit authorization scope.

Only after a genuine MATERIAL_MOVE exists should wheel ingress be considered.
