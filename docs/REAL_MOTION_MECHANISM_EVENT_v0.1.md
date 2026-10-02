# Real Motion / Mechanism Event v0.1

Status: candidate.

## Purpose

This contract is the first direct input seam for the future Brutus Genesis aquarium.

It does not generate movement.

It validates movement or mechanism changes already observed by Brutus runtime sources.

Core rule:

~~~text
BRUTUS RUNTIME = SOURCE OF TRUTH
AQUARIUM = READ-ONLY MIRROR
~~~

## Files

Validator: src/real-mechanism-event.mjs

Schema: contracts/real-mechanism-event.v0.schema.json

Tests: tests/real-mechanism-event.test.mjs

## Event families

v0.1 admits seven visual mechanism families:

~~~text
ANT_MOVE
CRYSTAL_MOVE
WHEEL_PHASE
PINEAL_PHASE
Z_MARK
DISTRIBUTOR_ROUTE
BASIN_TRANSFER
~~~

These correspond to the first movements TopBrutus wants to see in the real aquarium.

## Source requirement

Every event carries a SOURCE block:

~~~text
OBSERVATION_ID
SOURCE_SCHEMA
SOURCE_ENDPOINT
OBSERVED_AT_UTC
INTEGRITY_MATCH
~~~

Required:

~~~text
INTEGRITY_MATCH = true
~~~

The validator does not connect to a network or poll any endpoint.

A separate runtime adapter must supply the observation.

Therefore the production validator cannot invent an event when no source exists.

## Queen clock

Every event requires:

~~~text
CLOCK_AUTHORITY = QUEEN_SERVER_V0_2
TICK = non-negative safe integer
~~~

No local animation tick becomes Brutus truth.

A renderer may later interpolate visually between two admitted states, but logical state remains tied to the authoritative Brutus event tick.

## Ant movement

~~~text
EVENT_TYPE = ANT_MOVE
SUBJECT.TYPE = ANT
SUBJECT.ID = ANT-...
PAYLOAD.FROM = W:...
PAYLOAD.TO = W:...
~~~

FROM and TO must differ.

The validator does not calculate a path between them.

## Crystal movement

Same rule as ants:

~~~text
EVENT_TYPE = CRYSTAL_MOVE
SUBJECT.TYPE = CRYSTAL
SUBJECT.ID = C:...
~~~

The crystal moves visually only because Brutus reported a changed position.

## Wheel phase

~~~text
EVENT_TYPE = WHEEL_PHASE
SUBJECT.TYPE = WHEEL
SUBJECT.ID = M:...
PAYLOAD.FROM_DEG
PAYLOAD.TO_DEG
~~~

Both phases must satisfy 0 <= degrees < 360 and the phase must actually change.

The renderer may smooth the visible rotation between those two real phases.

## Pineal phase

PINEAL_PHASE follows the same bounded degree rule.

This lets the visual center show the pineal mechanism moving without requiring a heavy physical simulation.

## Z marking

~~~text
EVENT_TYPE = Z_MARK
SUBJECT.TYPE = Z_MARKER
SUBJECT.ID = Z:...
PAYLOAD.OBJECT_REF = ...
PAYLOAD.FROM_STATE = UNMARKED
PAYLOAD.TO_STATE = Z_MARKED
~~~

v0.1 only admits the explicit transition from unmarked to Z-marked.

## Distributor routing

~~~text
EVENT_TYPE = DISTRIBUTOR_ROUTE
SUBJECT.TYPE = DISTRIBUTOR
SUBJECT.ID = M:...
PAYLOAD.OBJECT_REF
PAYLOAD.FROM
PAYLOAD.TO
~~~

The distributor event reports an actual observed route transition.

It does not authorize World Router.

## Basin transfer

~~~text
EVENT_TYPE = BASIN_TRANSFER
SUBJECT.TYPE = BASIN
SUBJECT.ID = M:...
PAYLOAD.OBJECT_REF
PAYLOAD.FROM
PAYLOAD.TO = W:RETURN-BASIN
~~~

The return basin destination is explicit and fixed in v0.1.

## Trace requirement

Every real mechanism event requires a TRACE_ID.

~~~text
EVENT -> TRACE
~~~

A visual object should therefore always be inspectable back to the event that moved or changed it.

## Authority boundary

Every event requires:

~~~text
EXECUTABLE = false
PROOF_REF = null
PROOF_CLAIM = false
GATE_AUTHORITY = false
ROUTING_AUTHORIZATION = UNDECIDED
~~~

The aquarium cannot use a visual event to execute code, create proof, open gates, authorize World Router, or mutate Brutus state.

## CPU model

This module contains no Math.random, SimProvider, setInterval, setTimeout, fetch, process execution, World Router invocation, or movement generator.

It validates one supplied event and returns an immutable clone.

Future rendering can be smooth without changing the logical event rate.

## First aquarium architecture

~~~text
REAL BRUTUS OBSERVATION
        |
        v
REAL_MECHANISM_EVENT v0.1
        |
        v
READ-ONLY EVENT STREAM
        |
        v
GENESIS 2D RENDERER
~~~

The renderer must never add missing movements.

If the stream contains no movement event, the displayed object remains still.

## Next brick

After admission of this contract:

~~~text
READ_ONLY_LIVE_EVENT_STREAM v0.1
~~~

Its responsibility should be limited to accepting already validated events, ordering them by authoritative tick, rejecting backward time, preserving immutable history within a bounded buffer, and exposing deltas to the Genesis renderer.

It must not create, predict or simulate events.
