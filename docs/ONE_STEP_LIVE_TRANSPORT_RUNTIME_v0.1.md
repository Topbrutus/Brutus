# One-Step Live Transport Runtime v0.1

Status: candidate.

## Purpose

Orchestrate at most one explicitly authorized Fourmi material transport action and admit movement only after source-observed state confirms the transition.

The runtime chain is:

~~~
FRESH QUEEN CLOCK (before)
+
LIVE ANT IDENTITY
+
LIVE TRANSPORT STATE (before)
+
FOURMI MATH MATERIAL
+
LIVE TRANSPORT AUTHORIZATION
        |
        v
EXACT AUTHORIZATION VERDICT
        |
        v
ONE EXTERNAL ACTION ATTEMPT
        |
        v
FRESH QUEEN CLOCK (after)
+
LIVE TRANSPORT STATE (after)
        |
        v
ANT_MOVE
        |
        v
MATERIAL_MOVE
        |
        v
AUTHORIZATION CONSUMPTION
~~~

## What "live" means here

The production runtime accepts injected reader/action interfaces.

It contains no built-in network source, simulator, route chooser or fallback data generator.

Required interfaces:

~~~
readObservation()
readAntBirthReceipt()
readTransportState()
performAuthorizedMove(command)
~~~

Tests use deterministic injected doubles only to counter-test runtime logic. Those test doubles are not production movement evidence.

A production move is valid only when those interfaces are connected to actual source state/action adapters.

## Pre-state contract

The runtime requires:

~~~
BRUTUS-LIVE-FOURMI-TRANSPORT-STATE-v0.1
~~~

The state pins:

~~~
Queen TICK
source identity/integrity
ANT_ID
POSITION
MATERIAL_ID
MATERIAL_H256
BINDING_STATE = ATTACHED
~~~

The pre-state tick must exactly equal the fresh Queen clock tick.

The pre-state ANT and material must exactly match the live identity and admitted material.

The pre-state position must exactly equal authorization.SCOPE.FROM.

## Authorization gate

Before any side effect, the runtime calls the already merged live transport authorization gate.

It checks:

~~~
exact ANT identity
exact material ID/hash
exact ant role/state
exact FROM -> TO
active Queen tick window
single-use not consumed
~~~

Only DECISION = AUTHORIZED may cross the side-effect boundary.

## External command

The runtime builds one exact command containing:

~~~
COMMAND_ID
AUTHORIZATION_ID / H256
ANT_ID
MATERIAL_ID / H256
REQUESTED_AT_TICK
FROM
TO
MAX_MOVES = 1
SINGLE_USE = true
ROUTING_AUTHORIZATION = AUTHORIZED
~~~

The command itself is data:

~~~
EXECUTABLE = false
PROOF_REF = null
GATE_AUTHORITY = false
~~~

The injected performAuthorizedMove adapter is the only side-effect seam.

The adapter receives no choice of route. FROM and TO are already fixed by the authorization.

## Critical at-most-once boundary

Immediately before calling performAuthorizedMove(command), the runtime instance becomes permanently spent.

This happens before waiting for the external result.

Reason: an external system may perform the move and then lose the connection before Brutus receives the acknowledgment. Retrying automatically could execute the movement twice.

Therefore:

~~~
ACTION ATTEMPTED
=> RUNTIME INSTANCE SPENT
~~~

even if:

~~~
adapter throws
acknowledgment is lost
acknowledgment is malformed
post-state validation fails
~~~

A new runtime state observation must resolve the situation.

Invariant:

~~~
UNKNOWN ACTION OUTCOME != SAFE TO RETRY
~~~

## Action acknowledgment

The external adapter must acknowledge the exact command:

~~~
STATUS = ACCEPTED
COMMAND_ID
AUTHORIZATION_ID
ANT_ID
MATERIAL_ID
FROM
TO
~~~

This acknowledgment is not accepted as proof of movement.

Invariant:

~~~
ACTION_ACKNOWLEDGED != MOVEMENT_VERIFIED
~~~

## Post-state verification

After the action acknowledgment, Brutus obtains a second fresh Queen observation.

Required:

~~~
POST_QUEEN_TICK > PRE_QUEEN_TICK
~~~

Then it reads a second live transport state.

Required:

~~~
POST_STATE.TICK == POST_QUEEN_TICK
same source schema
same source endpoint
same ANT_ID
same MATERIAL_ID/H256
BINDING_STATE = ATTACHED
POSITION == authorization.SCOPE.TO
~~~

Without all of those conditions, no ANT_MOVE or MATERIAL_MOVE is emitted.

## ANT_MOVE derivation

Only after a valid before/after transition does the runtime create:

~~~
BRUTUS-REAL-MECHANISM-EVENT-v0.1
EVENT_TYPE = ANT_MOVE
~~~

with exact pre-state FROM, post-state TO, post-state Queen tick and post-state source identity.

The event passes the already merged real mechanism validator.

## Carrier observation and MATERIAL_MOVE

The validated pre-state creates:

~~~
BRUTUS-MATH-MATERIAL-CARRIER-OBSERVATION-v0.1
BINDING_STATE = ATTACHED
~~~

The existing material move binder then receives:

~~~
validated admitted material
live ant birth receipt
validated ATTACHED carrier observation
validated ANT_MOVE
~~~

and produces:

~~~
BRUTUS-FOURMI-MATH-MATERIAL-MOVE-v0.1
MATERIAL_MOVEMENT_VERIFIED = true
~~~

The parent material and crystal remain immutable.

## Grant consumption

After a successful MATERIAL_MOVE, the runtime creates:

~~~
BRUTUS-LIVE-FOURMI-TRANSPORT-CONSUMPTION-v0.1
~~~

It pins:

~~~
AUTHORIZATION_ID / H256
COMMAND_ID
ANT_MOVE_EVENT_ID / H256
MATERIAL_MOVE_ID / H256
CONSUMED_AT_TICK
SINGLE_USE = true
CONSUMED = true
ROUTING_AUTHORIZATION = CONSUMED
~~~

The production coordinator must persist or otherwise enforce consumption across runtime process restarts.

v0.1 guarantees at-most-one action attempt inside one runtime instance; persistent global replay prevention remains an integration responsibility.

## Proof boundary

Successful movement remains operational evidence only.

~~~
MATERIAL_MOVE.PROOF_REF = null
MATERIAL_MOVE.PROOF_CREATED = false
MATERIAL_MOVE.PROOF_CLAIM = false
BRUTUS_TRUTH_STATUS = UNVERIFIED_BY_BRUTUS
~~~

Therefore:

~~~
MOVED != MATH_PROOF
ACTION_ACKNOWLEDGED != MATH_PROOF
AUTHORIZATION_CONSUMED != MATH_PROOF
~~~

## Wheel boundary

Even after the full successful runtime cycle:

~~~
WHEEL_INGRESS_AUTHORIZATION = false
MACHINE_EXECUTION_AUTHORIZATION = false
~~~

Invariant:

~~~
MATERIAL_MOVE != LEFT_WHEEL_INGRESS
~~~

## CPU / autonomy boundary

The core runtime file contains no fetch, WebSocket, XMLHttpRequest, timer loop, Math.random, child_process or autonomous route chooser.

It performs at most one external action callback per runtime instance.

The command route comes only from the previously signed authorization.

## Current production-source status

At implementation time, the observed X72 WebSocket still did not expose:

~~~
live ANT position
material attachment state
ANT_MOVE
~~~

Therefore this PR does not claim a production MATERIAL_MOVE.

Current distinction:

~~~
RUNTIME ORCHESTRATION CONTRACT = READY
PRODUCTION SOURCE/ACTUATOR ADAPTER = NOT YET CONNECTED
PRODUCTION ANT_MOVE = NOT CLAIMED
~~~

## Tests

Targeted local tests cover successful full one-step chain, exact bounded command, one-action behavior, adapter error after possible submit, forged acknowledgment, clock/state mismatches, expired grant, wrong positions, source continuity break, detached material rejection, signature tampering, grant consumption integrity, proof/wheel boundaries and no built-in autonomous execution machinery.

Result:

~~~
16 tests
16 pass
0 fail
~~~

## Files

~~~
contracts/live-fourmi-transport-state.v0.schema.json
contracts/live-fourmi-transport-consumption.v0.schema.json
src/one-step-live-transport-runtime.mjs
tests/one-step-live-transport-runtime.test.mjs
docs/ONE_STEP_LIVE_TRANSPORT_RUNTIME_v0.1.md
~~~

## Next seam

The remaining step before the first production movement is now concrete:

~~~
SOURCE/ACTUATOR ADAPTER
~~~

It must supply:

~~~
real Queen observation
real ANT birth identity
real before/after ANT + material position state
one exact authorized move operation
~~~

Once connected, this runtime can produce the first genuine:

~~~
ANT_MOVE
+
MATERIAL_MOVE
+
AUTHORIZATION CONSUMPTION
~~~

Only after that production evidence exists should Brutus open a separate left-wheel ingress authorization.
