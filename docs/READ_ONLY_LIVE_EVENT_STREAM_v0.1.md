# Read-Only Live Event Stream v0.1

Status: candidate.

## Purpose

This stream is the transport seam between validated Brutus runtime events and the future Genesis 2D aquarium.

It is not a simulation engine.

It never creates events, ticks, positions, phases, routes or animation targets.

Core rule:

~~~text
BRUTUS RUNTIME = SOURCE OF TRUTH
EVENT STREAM = ORDERED READ-ONLY TRANSPORT
AQUARIUM = READ-ONLY MIRROR
~~~

## Supported inputs

v0.1 accepts only:

~~~text
BRUTUS-LIVE-EVENT-v0.1
BRUTUS-REAL-MECHANISM-EVENT-v0.1
~~~

Every input is revalidated by its owning validator before entering the stream.

Unsupported or invalid events never enter the buffer.

## Queen time ordering

Each admitted event must contain an authoritative non-negative TICK.

The stream enforces:

~~~text
next TICK >= previous TICK
~~~

Backward logical time is rejected.

Several events may share the same Queen tick.

The stream gives each accepted transport entry an OFFSET:

~~~text
OFFSET = 1, 2, 3, ...
~~~

OFFSET is transport order only.

It is not a logical clock and must never replace:

~~~text
CLOCK_AUTHORITY = QUEEN_SERVER_V0_2
~~~

## Bounded memory

Default capacity:

~~~text
256 events
~~~

Maximum v0.1 capacity:

~~~text
4096 events
~~~

When capacity is exceeded, only the oldest transport entry is evicted.

The underlying Brutus runtime truth is not deleted by this transport buffer.

## Cursor / delta reads

A renderer reads events with a transport cursor.

Example:

~~~text
renderer cursor = 12
stream has offsets 13, 14, 15
readAfter(12)
 -> returns 13,14,15
 -> cursor out = 15
~~~

This lets the aquarium process only new deltas.

## Gap detection

If the renderer falls so far behind that its required history has already been evicted, the stream refuses to fabricate continuity.

Example:

~~~text
buffer available = offsets 100..200
renderer cursor   = 42

result:
STREAM_CURSOR_GAP
resync_required = true
~~~

The renderer must then resynchronize from an authoritative Brutus state source.

It must not guess missing movement.

## Duplicate handling

Duplicate EVENT_ID values at the current Queen tick are rejected.

Per-tick work is bounded by stream capacity.

This prevents an unbounded event storm at a single tick in v0.1.

## Immutability

Accepted entries, snapshots and deltas are deeply frozen clones.

The renderer cannot mutate the event stored by the stream.

## Snapshot

snapshot() returns transport metadata:

~~~text
CAPACITY
SIZE
FIRST_OFFSET
LAST_OFFSET
LAST_TICK
DROPPED_COUNT
EVENTS
READ_ONLY = true
CREATES_EVENTS = false
LOGICAL_CLOCK_AUTHORITY = QUEEN_SERVER_V0_2
~~~

## No autonomous work

The stream contains no:

~~~text
Math.random
SimProvider
setInterval
setTimeout
fetch
WebSocket
process execution
~~~

It performs work only when the caller appends or reads an event.

That keeps the stream extremely light when Brutus is idle.

## Aquarium seam

The architecture after this brick becomes:

~~~text
REAL BRUTUS SOURCE
       |
       v
STARTUP / REAL MECHANISM VALIDATORS
       |
       v
READ_ONLY_LIVE_EVENT_STREAM
       |
       v
GENESIS 2D AQUARIUM
~~~

The aquarium may visually interpolate between admitted states for smooth display.

Visual interpolation is never written back as Brutus truth.

## Files

Source:

src/read-only-live-event-stream.mjs

Contract:

contracts/read-only-live-event-stream.v0.schema.json

Tests:

tests/read-only-live-event-stream.test.mjs

## Next brick

After admission, the next safe brick is the first GENESIS 2D renderer shell.

It should:

- consume only this stream;
- begin empty when the stream is empty;
- render only known entities/mechanisms;
- keep motion visual-only between real source states;
- never create Brutus state;
- expose a hard resync state when the event stream reports a gap.

The first acceptance test should be one real event entering the stream and producing one matching visible change.
