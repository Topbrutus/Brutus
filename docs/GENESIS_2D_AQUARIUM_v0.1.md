# Genesis 2D Aquarium v0.1

Status: candidate visual shell.

## Purpose

This is the first real Brutus aquarium shell.

It is intentionally empty until two things are supplied:

1. an explicit Genesis visual layout;
2. validated deltas from READ_ONLY_LIVE_EVENT_STREAM v0.1.

Core invariant:

~~~text
BRUTUS RUNTIME = SOURCE OF TRUTH
READ_ONLY_LIVE_EVENT_STREAM = TRANSPORT
GENESIS 2D AQUARIUM = VISUAL MIRROR ONLY
~~~

## Files

Core state engine:

src/genesis-2d-aquarium.mjs

Visual layout contract:

contracts/genesis-visual-layout.v0.schema.json

Browser shell:

tools/genesis-aquarium/index.html
tools/genesis-aquarium/app.mjs

Tests:

tests/genesis-2d-aquarium.test.mjs

## Empty means empty

With no Brutus events:

~~~text
ENTITY_COUNT = 0
MECHANISM_COUNT = 0
~~~

The canvas displays no fake Fourmis, no fake crystals and no fake mechanisms.

With no visual layout:

- logical world references may still be mirrored;
- X/Y remain null;
- PLACED remains false;
- the canvas does not invent coordinates.

## Visual layout

The layout is a visual-only mapping from already-existing logical references to normalized 2D coordinates.

Coordinates are in:

~~~text
0 <= X <= 1
0 <= Y <= 1
~~~

The layout contains:

~~~text
WORLD_POSITIONS
MECHANISM_ANCHORS
READ_ONLY = true
ROUTING_AUTHORITY = false
~~~

A visual coordinate never becomes a Brutus logical coordinate.

The layout cannot authorize routing.

## Accepted stream delta

The aquarium accepts only:

~~~text
BRUTUS-READ-ONLY-LIVE-EVENT-DELTA-v0.1
~~~

It expects strict cursor continuity.

If the renderer is at offset 100, the next delta must begin with:

~~~text
CURSOR_IN = 100
~~~

Missing offsets, backward time or state-continuity conflicts cause:

~~~text
RESYNC_REQUIRED = true
~~~

The aquarium then refuses further deltas until a future authoritative resync path is implemented.

## Transactional delta application

A delta is treated as one visual-state transaction.

If an event inside the delta conflicts with the mirrored state:

- entities are rolled back to the state before the delta;
- mechanisms are rolled back to the state before the delta;
- LAST_OFFSET and LAST_TICK remain on the last admitted state;
- RESYNC_REQUIRED becomes true.

This prevents a half-applied visual world.

## Events represented

Startup presence:

~~~text
STARTUP_OBSERVED
~~~

Real mechanism events:

~~~text
ANT_MOVE
CRYSTAL_MOVE
WHEEL_PHASE
PINEAL_PHASE
Z_MARK
DISTRIBUTOR_ROUTE
BASIN_TRANSFER
~~~

## Movement

The logical mirror changes only when a real event changes it.

The browser shell may visually interpolate between the old and new admitted state.

The current visual interpolation duration is fixed at 650 ms.

This duration is presentation-only.

It is never written back to Brutus and never becomes logical time.

The animation loop uses requestAnimationFrame only while at least one admitted visual transition is active.

When Brutus is idle, there is no continuous animation loop.

## Browser input seam

The shell exposes:

~~~text
window.BrutusGenesisAquarium.loadLayout(layout)
window.BrutusGenesisAquarium.consumeDelta(delta)
window.BrutusGenesisAquarium.snapshot()
~~~

It also accepts same-page CustomEvents:

~~~text
brutus:genesis-layout
brutus:genesis-delta
~~~

and emits:

~~~text
brutus:genesis-state
~~~

There is no fetch, WebSocket or polling source in v0.1.

The production runtime adapter must be a separate explicit brick.

## Running the shell locally

Serve the repository root with any static HTTP server, then open:

~~~text
/tools/genesis-aquarium/
~~~

For example, from the repository root a developer may use:

~~~text
python -m http.server 8787
~~~

and open the local tools/genesis-aquarium path in the browser.

The page will remain in WAITING FOR LAYOUT or WAITING FOR BRUTUS until real inputs are supplied.

## Rendering

The shell is deliberately monochrome.

Current representations:

- ANT: small ant-like glyph;
- CRYSTAL: diamond;
- PART / generic object: square;
- WHEEL: ring + phase spoke;
- PINEAL: smaller ring + center + phase spoke;
- distributor / basin / Z marker: compact mechanism glyph.

These are visual encodings only.

They do not change object type or Brutus state.

## CPU boundary

The production aquarium core contains no:

~~~text
Math.random
SimProvider
setInterval
setTimeout
fetch
WebSocket
World Router mutation
~~~

The browser shell uses requestAnimationFrame only for active interpolation.

## What v0.1 does not yet do

It does not yet:

- connect directly to a deployed Brutus runtime source;
- create an authoritative resync snapshot;
- define the final Genesis geometry;
- define nine corridors or bubbles;
- implement crystal affinity;
- distribute dust;
- implement Big Bang expansion;
- create or mutate Brutus objects.

Those remain later bricks.

## Acceptance condition

The first real end-to-end aquarium test is:

~~~text
REAL BRUTUS EVENT
 -> VALIDATED EVENT
 -> READ_ONLY LIVE STREAM
 -> GENESIS DELTA
 -> ONE MATCHING VISIBLE CHANGE
~~~

with no simulated provider anywhere in the production path.
