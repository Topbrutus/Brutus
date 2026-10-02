# Fourminizer Startup Runtime v0.1

Status: candidate runtime brick.

## Purpose

This is the first Brutus component that can perform one bounded Fourminizer startup cycle from externally supplied runtime observations.

It is deliberately fail-closed.

It does not simulate ants, motion, crystals, wheels or world activity.

It does not contain a fallback data generator.

If required real readers are absent or inconsistent, the cycle stops with an error and emits nothing.

## Files

Runtime: src/fourminizer-startup-runtime.mjs

Live event contract: contracts/fourminizer-live-event.v0.schema.json

Tests: tests/fourminizer-startup-runtime.test.mjs

## Required external readers

Creation requires three reader functions:

~~~text
readObservation()
readAntBirthReceipt()
readWorldModel()
~~~

The runtime itself does not decide where these readers connect.

Production integration must connect them to actual Brutus / Antmux runtime sources.

The test suite injects deterministic test doubles only to test failure and validation behavior. Those test doubles are not production fallbacks.

## One cycle only

v0.1 allows exactly one call to runCycle().

~~~text
LIVE ANT BIRTH RECEIPT
        |
        v
QUEEN CRYSTAL VALIDATION
        |
        v
FRESH QUEEN CLOCK
        |
        v
RUNTIME WORLD SNAPSHOT
        |
        v
EXACT TICK MATCH
        |
        v
LOCAL MACHINE CONTRACT
        |
        v
RUNTIME TRACE
        |
        v
READ-ONLY LIVE EVENT
        |
        v
STOP
~~~

A second cycle on the same runtime instance is rejected.

This makes the first wake-up small enough to audit.

## Identity continuity

The runtime validates the founding Queen crystal and separately reads a live ant birth receipt.

The ant identity from that receipt must exactly match:

~~~text
FOURMINIZER-QUEEN-0001
ANT-000000000001
~~~

The local machine owner and runtime world SELF must point to the same Queen / ANT identity.

A static Queen crystal alone is not treated as proof that a live ant exists.

## Clock

Clock observations pass through the existing Queen observation ingress.

Required source:

~~~text
QUEEN_SERVER_V0_2
~~~

Required conditions:

~~~text
STATUS = FRESH
INTEGRITY_MATCH = true
~~~

The runtime never creates its own logical tick.

## World snapshot

The world reader must provide:

~~~text
SNAPSHOT_CLASS = RUNTIME
~~~

Synthetic fixture snapshots are rejected.

For v0.1 the runtime requires:

~~~text
WORLD.OBSERVED_AT_TICK == QUEEN_CLOCK.TICK
~~~

This is intentionally strict.

The first renderer must not show a world state from one tick while presenting a clock from another.

## Local Machine

LOCAL_MACHINE v0.1 is loaded and validated.

It remains:

~~~text
STATE = DORMANT
EXECUTABLE = false
BOUND = false
EXECUTED = false
~~~

The current Local World Model contract also remains:

~~~text
LOCAL_MACHINE.ID = null
LOCAL_MACHINE.STATE = UNBOUND
~~~

Startup Runtime v0.1 does not silently create the missing binding contract.

Therefore this brick does not fabricate a crystal.

That must wait for an explicit runtime binding/execution contract.

## Runtime trace

A successful cycle writes one TRACE v0.1 runtime record.

The action is:

~~~text
READ
~~~

It records the exact Queen tick and runtime world position that passed validation.

The trace is not a proof.

~~~text
PROOF_REF = null
PROOF_CLAIM = false
GATE_AUTHORITY = false
ROUTING_AUTHORIZATION = UNDECIDED
~~~

## Live event

A successful cycle emits exactly one:

~~~text
BRUTUS-LIVE-EVENT-v0.1
EVENT_TYPE = STARTUP_OBSERVED
EVENT_CLASS = RUNTIME
~~~

The event contains:

~~~text
TICK
SOURCE_ENDPOINT
CLOCK_ENTITY_ID
QUEEN_ID
ANT_ID
POSITION
QUEEN_MODE
GENERATION
CONDITION
TRACE_ID
~~~

This event is intended to become the read-only input to the future 2D Brutus universe renderer.

## No invented motion

v0.1 explicitly requires:

~~~text
MOTION = null
~~~

Reason:

At this stage Brutus has a verified real clock observation and runtime world position contract, but no admitted real movement event contract.

The renderer is therefore not allowed to create movement merely to look alive.

This is a deliberate implementation of the project rule:

~~~text
BRUTUS RUNTIME = SOURCE OF TRUTH
VISUAL UNIVERSE = READ-ONLY MIRROR
~~~

## CPU model

This runtime is event driven.

It contains no:

~~~text
Math.random
SimProvider
setInterval loop
fetch loop
process execution
World Router invocation
autonomous animation loop
~~~

Future visual interpolation belongs to the renderer, not to logical Brutus state.

## Contract pins

The runtime pins exact merged Git blob bytes for:

~~~text
FOURMINIZER_QUEEN_CRYSTAL
LOCAL_WORLD_MODEL
LOCAL_MACHINE
TRACE
CLOCK_OBSERVATION
~~~

CI recomputes the Git blob SHA for every pin.

## First production acceptance condition

A real integration is considered ready for visual binding only when one startup cycle can consume actual external sources and return:

~~~text
STATUS = STOPPED_AFTER_ONE_REAL_CYCLE
LIVE_EVENTS.length = 1
LIVE_EVENTS[0].EVENT_TYPE = STARTUP_OBSERVED
TRACE.TRACE_CLASS = RUNTIME
~~~

with no test fixture or simulated provider in the production path.

## What this does NOT yet prove

This brick does not yet prove:

- real ant movement;
- real wheel rotation;
- real Z marking;
- real distributor routing;
- real crystal fabrication;
- real recycling;
- machine binding;
- gate opening.

Those events must each receive their own real source contract before the aquarium can move them.

## Next visual/runtime seam

After this runtime is admitted, the next safe seam is:

~~~text
REAL MOTION / MECHANISM EVENT CONTRACT
        |
        v
READ-ONLY LIVE EVENT STREAM
        |
        v
GENESIS 2D RENDERER
~~~

The first renderer should remain empty or static for any entity that Brutus has not actually reported.
