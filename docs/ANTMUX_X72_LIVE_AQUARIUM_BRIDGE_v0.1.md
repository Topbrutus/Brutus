# Antmux X72 Live Aquarium Bridge v0.1

Status: candidate real-source bridge.

## Purpose

This brick connects the Brutus Genesis aquarium to the existing public, server-authoritative Antmux X72 runtime.

It does not simulate a Queen, wheel, ant, crystal or tick.

Source path documented by Antmux:

~~~text
wss://antmux.com/laboratoire/embryon-x72/ws
~~~

Server authority:

~~~text
QUEEN_SERVER_V0_2
~~~

Nucleus authority:

~~~text
NOYAU_ENGINE_HEADLESS
~~~

Nucleus schema:

~~~text
ANTMUX-X72-NOYAU-DYNAMIC-v0.2
~~~

## Verified upstream design

The Antmux X72 source already mounts the headless nucleus on the Queen server tick.

Upstream tests state that one Queen step advances the nucleus exactly once.

The visual state exposes real server values including:

~~~text
tick_count
integrity_match
noyau_runtime.noyau.tick
noyau_runtime.noyau.phase_left
noyau_runtime.noyau.phase_right
noyau_runtime.noyau.whole_h256
~~~

The phases are produced by the server-side NoyauEngine in radians.

## First visible real movement

v0.1 converts only the two already-existing wheel phases:

~~~text
phase_left  -> M:LEFT-WHEEL
phase_right -> M:RIGHT-WHEEL
~~~

Radians are deterministically converted to degrees for the existing BRUTUS-REAL-MECHANISM-EVENT-v0.1 contract.

The conversion is presentation normalization only.

The authoritative logical tick remains the Queen tick.

## Baseline rule

The first accepted X72 frame establishes a baseline and emits zero movement events.

Only a later real frame with a changed phase can emit:

~~~text
WHEEL_PHASE
~~~

This prevents the aquarium from inventing a FROM state on first connection.

## Integrity and continuity

A frame is accepted only when:

~~~text
source == QUEEN_SERVER_V0_2
integrity_match == true
noyau_runtime.authority == NOYAU_ENGINE_HEADLESS
noyau.schema == ANTMUX-X72-NOYAU-DYNAMIC-v0.2
Queen tick == noyau tick
noyau.whole_h256 is SHA-256 hex
~~~

The bridge also locks the observed Queen entity identity.

Backward Queen time is rejected.

The same tick with a changed nucleus hash is rejected.

## Browser transport

The browser-specific network code is isolated in:

~~~text
tools/genesis-aquarium/live-antmux.mjs
~~~

The core normalizer in src/ contains no WebSocket, fetch, timers or local tick engine.

The page exposes explicit controls:

~~~text
CONNECTER RUNTIME RÉEL
DÉCONNECTER
~~~

No network connection is opened until the user presses the connect button.

On disconnect, the last visual state remains frozen.

## Real movement path

~~~text
Antmux Queen Server
  -> public /laboratoire/embryon-x72/ws
  -> raw VisualState
  -> Antmux X72 live bridge
  -> validated WHEEL_PHASE events
  -> READ_ONLY_LIVE_EVENT_STREAM
  -> Genesis 2D aquarium
  -> visual interpolation only
~~~

## Visual interpolation

The source values are authoritative.

The browser interpolates between the previous and next admitted phase for smooth display.

Phase interpolation uses the shortest visual arc, including wraparound such as 359 degrees to 1 degree.

Visual interpolation is not sent back to Brutus or Antmux.

## Explicit visual layout

The presentation-only anchor map is:

~~~text
tools/genesis-aquarium/layout-genesis-x72-v01.mjs
~~~

It includes anchors for mechanisms but creates no runtime entities.

READ_ONLY is true and ROUTING_AUTHORITY is false.

## What is deliberately NOT shown yet

v0.1 does not invent:

- Fourmi positions;
- crystal spatial positions;
- Z marking events;
- distributor routes;
- basin transfers;
- pineal phase.

Although the upstream nucleus exposes active crystal records and basin metrics, those records do not yet provide the spatial event contract required by the Brutus aquarium.

Therefore they remain invisible until a real mapping contract is admitted.

## Running it

Serve the Brutus repository root through HTTP, then open:

~~~text
/tools/genesis-aquarium/
~~~

Example developer command from the repo root:

~~~text
python -m http.server 8787
~~~

Then visit:

~~~text
http://localhost:8787/tools/genesis-aquarium/
~~~

Press:

~~~text
CONNECTER RUNTIME RÉEL
~~~

Expected behavior:

1. explicit Genesis layout loads;
2. page remains empty of fake entities;
3. WebSocket connects to the public X72 runtime;
4. first valid frame becomes baseline;
5. next valid phase change creates two real wheel events;
6. left/right wheel mechanisms appear and move.

If the public source is unavailable or rejects the browser origin, the page reports a socket error/disconnection and does not fall back to simulation.

## Files

Core source normalizer:

src/antmux-x72-live-aquarium-bridge.mjs

Browser transport:

tools/genesis-aquarium/live-antmux.mjs

Explicit layout:

tools/genesis-aquarium/layout-genesis-x72-v01.mjs

Updated renderer:

tools/genesis-aquarium/app.mjs

Updated page:

tools/genesis-aquarium/index.html

Tests:

tests/antmux-x72-live-aquarium-bridge.test.mjs

## Acceptance condition

~~~text
REAL X72 FRAME N
 -> BASELINE

REAL X72 FRAME N+1
 -> 2 VALIDATED WHEEL_PHASE EVENTS
 -> READ-ONLY STREAM
 -> 2 MATCHING VISIBLE WHEEL PHASE CHANGES
~~~

No production simulation fallback is permitted.
