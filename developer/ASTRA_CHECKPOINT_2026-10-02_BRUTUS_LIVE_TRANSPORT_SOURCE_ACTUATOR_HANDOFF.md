# ASTRA CHECKPOINT — BRUTUS LIVE TRANSPORT / SOURCE-ACTUATOR HANDOFF

Date: 2026-10-02
Owner/workstream: Astra — Brutus architecture, contracts, provenance, integration, continuity, runtime safety.
Status: continuity checkpoint. No claim of production movement yet.

## 1. Recovery rule

Use this file as the handoff point for the Brutus transport workstream.

Live source > checkpoint > hypothesis.

Never read/open/index/modify agent.md or AGENTS.md.

Brutus implementation changes must continue through a separate branch / PR / CI. Do not write directly to main.

## 2. Brutus current repository state at checkpoint

Repository:

~~~text
Topbrutus/Brutus
~~~

Current live main observed at checkpoint:

~~~text
737c92163ac9b3b0e673f9396a0bd8f74e038ed3
docs: refresh Astra continuity checkpoint
~~~

The last transport runtime merge completed by this Astra before the current source/actuator work was:

~~~text
PR #48 — One-Step Live Transport Runtime v0.1
merge commit:
a6e05bf20fed1bd866d61359b99afdac6cc3cad6

Brutus CI #116 = SUCCESS
~~~

Main has advanced since that merge to 737c9216..., so always branch new Brutus work from the verified live main, not from a6e05bf....

Dedicated local Brutus clone previously aligned after PR #48:

~~~text
D:\Brutus-Aquarium-Live
~~~

Re-verify its HEAD before any new write.

## 3. Merged Brutus chain now available

The following layers are already merged and should be reused rather than duplicated.

### PR #43 — Math Input Bus + Brotoculateur Adapter v0.1

Core chain:

~~~text
BROTOCULATEUR
    |
    v
BRUTUS-MATH-INPUT-PACKET-v0.1
~~~

Read-only local source:

~~~text
GET http://127.0.0.1:8778/api/status
~~~

Important invariant:

~~~text
SOURCE_PASS != BRUTUS_PROOF
~~~

### PR #44 — Math Crystal Candidate v0.1

~~~text
MATH_INPUT_PACKET
    |
    +-- exact ITEM_ID
    |
    v
MATH_CRYSTAL_CANDIDATE
~~~

Important state:

~~~text
BRUTUS_TRUTH_STATUS = UNVERIFIED_BY_BRUTUS
PROOF_REF = null
TRANSPORT_AUTHORIZATION = false
~~~

### PR #45 — Fourmi Math Material Admission v0.1

~~~text
MATH_CRYSTAL_CANDIDATE
    |
    v
CONTROL-PLANE ADMISSION
    |
    v
FOURMI_MATH_MATERIAL
~~~

Important state:

~~~text
TRANSPORT_AUTHORIZATION = true
TRANSPORT_STATE = ADMITTED_NOT_MOVED
MOVEMENT_PERFORMED = false
WHEEL_INGRESS_AUTHORIZATION = false
PROOF_REF = null
~~~

### PR #46 — Fourmi Math Material Move Binding v0.1

Required evidence:

~~~text
FOURMI MATH MATERIAL
+ live ANT identity
+ ATTACHED material-to-ant observation
+ real ANT_MOVE
    |
    v
MATERIAL_MOVE
~~~

Critical invariant:

~~~text
ANT_MOVED != MATERIAL_MOVED
~~~

No MATERIAL_MOVE without an exact ATTACHED observation for the same ANT_ID + MATERIAL_ID/H256 before the ANT_MOVE.

### PR #47 — Live Fourmi Transport Authorization v0.1

This closes the old live-routing policy gap.

A grant is bound to exactly:

~~~text
one ANT identity
one MATERIAL_ID / MATERIAL_H256
one FROM -> TO edge
one Queen tick window
MAX_MOVES = 1
SINGLE_USE = true
~~~

Grant state:

~~~text
ROUTING_AUTHORIZATION = AUTHORIZED
EXECUTABLE = false
GATE_AUTHORITY = false
PROOF_REF = null
~~~

Critical invariants:

~~~text
AUTHORIZED != MOVED
AUTHORIZED != EXECUTED
AUTHORIZED != PROVED
~~~

### PR #48 — One-Step Live Transport Runtime v0.1

Merged runtime sequence:

~~~text
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

Critical at-most-once invariant:

~~~text
UNKNOWN ACTION OUTCOME != SAFE TO RETRY
~~~

The runtime instance becomes spent before performAuthorizedMove(command) is called.

An adapter ACK is never accepted as movement proof:

~~~text
ACTION_ACKNOWLEDGED != MOVEMENT_VERIFIED
~~~

Only a later Queen-aligned source observation at the exact authorized TO can create ANT_MOVE / MATERIAL_MOVE.

Wheel ingress remains closed:

~~~text
MATERIAL_MOVE != LEFT_WHEEL_INGRESS
WHEEL_INGRESS_AUTHORIZATION = false
~~~

## 4. Current active work — Antmux production source/actuator

Repository:

~~~text
Topbrutus/Antmux
~~~

Verified Antmux main used as branch base:

~~~text
417c869a684bf41a1abca0ef2f7848308743f51f
~~~

Active branch:

~~~text
astra/live-fourmi-transport-source-v01-20261002
~~~

Verified branch HEAD at checkpoint:

~~~text
bb225f19f8e7448d03ba426fab8b8828c7a8b721
docs: correct live transport endpoint count
~~~

This branch is NOT merged at checkpoint.

Verified branch files relevant to this work:

~~~text
deploy/x72-shared-queen/app/live_transport.py
  blob: 33e321510fa5ba0382a5853a3fd3662845526d6f

deploy/x72-shared-queen/app/server.py
  blob: 56152c175c7bbba8297ba155ff6699fc73a40929

deploy/x72-shared-queen/tests/test_live_transport.py
  blob: 5644a5d8a760ad67fe31552487cea0d662db7979

deploy/x72-shared-queen/LIVE_FOURMI_TRANSPORT_v0.1.md
  blob: 9c7a1c71dff91dee6af8845344d7da442bff9ef6
~~~

## 5. Antmux source/actuator architecture already written

The historical Antmux World Router was inspected and was not sufficient by itself for this requirement.

The Queen server currently exposes its existing /api/health, /api/state, held-input/fault control and WebSocket paths, but no pre-existing Fourmi transport seam existed.

A new private Queen-server transport seam was therefore added on the active Antmux branch.

Module:

~~~text
deploy/x72-shared-queen/app/live_transport.py
~~~

Mounted from:

~~~text
deploy/x72-shared-queen/app/server.py
~~~

The Queen server is intended to become the software authority for this bounded Fourmi transport state.

### Private endpoints

The transport module defines:

~~~text
POST /api/live-transport/attach
GET  /api/live-transport/state/{ant_id}/{material_id}
POST /api/live-transport/move
~~~

These are private/token-protected endpoints.

### Authentication

A separate transport token is used.

Supported configuration:

~~~text
ANTMUX_LIVE_TRANSPORT_TOKEN
~~~

or:

~~~text
ANTMUX_LIVE_TRANSPORT_TOKEN_FILE
~~~

default token file under ANTMUX_X72_DATA_DIR:

~~~text
live-transport-token
~~~

Do not reuse or expose the public-journal token.

Do not put any token in Git.

### Persistence

Separate SQLite state:

~~~text
$ANTMUX_X72_DATA_DIR/live-transport.db
~~~

Tables are intended to preserve:

~~~text
transport_state
move_commands
~~~

### Transport state

One material state pins:

~~~text
MATERIAL_ID
MATERIAL_H256
ANT_ID
POSITION
BINDING_STATE = ATTACHED
attached_tick
updated_tick
last_move_tick
last_command_id
last_authorization_id
state_version
~~~

The state endpoint returns Queen tick + source identity + material binding + state hash.

### Attach semantics

POST /attach binds an exact material to an exact ANT_ID at an exact W: position.

Exact same re-attach is idempotent.

A conflicting existing state is rejected.

Attach does not prove mathematics and does not create a Brutus proof.

### Move semantics

POST /move accepts the exact bounded command produced by Brutus One-Step Live Transport Runtime.

Expected command fields include:

~~~text
COMMAND_ID
AUTHORIZATION_ID
AUTHORIZATION_H256
ANT_ID
MATERIAL_ID
MATERIAL_H256
REQUESTED_AT_TICK
CLOCK_AUTHORITY = QUEEN_SERVER_V0_2
FROM
TO
MAX_MOVES = 1
SINGLE_USE = true
PROOF_REF = null
EXECUTABLE = false
GATE_AUTHORITY = false
ROUTING_AUTHORIZATION = AUTHORIZED
~~~

The server checks the exact current runtime FROM state.

The transition is atomic under SQLite BEGIN IMMEDIATE.

The server records command and authorization consumption.

Replay of the same COMMAND_ID or AUTHORIZATION_ID is rejected.

The ACK shape is deliberately minimal:

~~~text
STATUS = ACCEPTED
COMMAND_ID
AUTHORIZATION_ID
ANT_ID
MATERIAL_ID
FROM
TO
~~~

Brutus must continue to treat this ACK as acceptance only.

Invariant:

~~~text
SERVER ACK != MOVEMENT VERIFIED
~~~

Movement verification still comes from Brutus reading the later state at TO under a later Queen tick.

## 6. Queen integration

The new transport router is mounted directly into the existing X72 shared Queen server.

The router receives a Queen tick callback equivalent to:

~~~text
lambda: queen.tick
~~~

This avoids inventing a second clock.

Important:

~~~text
TRANSPORT TICK AUTHORITY = QUEEN_SERVER_V0_2
~~~

No local transport counter may replace Queen time.

## 7. Current test state — IMPORTANT RECOVERY POINT

A dedicated local Antmux clone was prepared:

~~~text
D:\Antmux-Transport-Live
~~~

The intended test command is:

~~~text
$env:PYTHONPATH="D:\Antmux-Transport-Live\deploy\x72-shared-queen"
python D:\Antmux-Transport-Live\deploy\x72-shared-queen\tests\test_live_transport.py
~~~

The test process was launched immediately before this checkpoint request.

Its final result was NOT captured in this conversation before checkpointing.

Therefore current truth is:

~~~text
ANTMUX LIVE TRANSPORT CODE = WRITTEN
ANTMUX LIVE TRANSPORT TEST FILE = WRITTEN
TEST COMMAND = LAUNCHED PRE-CHECKPOINT
FINAL TEST RESULT = NOT YET VERIFIED HERE
ANTMUX PR = NOT YET OPENED BY THIS CHECKPOINT
PRODUCTION DEPLOY = NOT CLAIMED
PRODUCTION MOVE = NOT CLAIMED
~~~

On restore, FIRST recover/re-run this test and record the result.

Do not infer PASS from the existence of the test.

## 8. Test coverage intended on Antmux branch

The test file covers at minimum:

- persistent attach;
- exact idempotent re-attach;
- atomic one-step move;
- private Bearer requirement;
- state readback;
- canonical state_h256;
- exact ACK shape;
- changed runtime position after move;
- last command / authorization tracking;
- state_version increment;
- replay rejection;
- wrong FROM rejection;
- unsafe EXECUTABLE=true rejection.

Expected success markers in the test script:

~~~text
LIVE_TRANSPORT_STORE=PASS
LIVE_TRANSPORT_AUTH=PASS
LIVE_TRANSPORT_STATE_HASH=PASS
LIVE_TRANSPORT_SINGLE_USE=PASS
LIVE_TRANSPORT_FAIL_CLOSED=PASS
~~~

Again: re-run and verify before asserting these markers were produced.

## 9. Next exact actions after restore

### Step A — verify Antmux branch

~~~text
cd D:\Antmux-Transport-Live
git fetch origin
git checkout astra/live-fourmi-transport-source-v01-20261002
git reset --hard origin/astra/live-fourmi-transport-source-v01-20261002
~~~

Then run the test command from section 7.

If it fails, fix on the same Antmux branch and re-run.

### Step B — Antmux PR / CI

Only after local tests are green:

~~~text
open draft PR:
astra/live-fourmi-transport-source-v01-20261002
    ->
Antmux main
~~~

Let Antmux CI run on the exact branch HEAD.

Do not merge until explicit user "go" at merge lock.

### Step C — Brutus production adapter

After the Antmux API contract is stable, create a NEW Brutus branch from the then-current verified Brutus main.

Do not modify PR #48 code in place.

Build a source/actuator adapter that provides the interfaces expected by:

~~~text
createOneStepLiveTransportRuntime(...)
~~~

Required interfaces:

~~~text
readObservation()
readAntBirthReceipt()
readTransportState()
performAuthorizedMove(command)
~~~

Expected mapping:

~~~text
Queen source:
existing X72 /api/state or authoritative Queen observation

Transport state:
GET /api/live-transport/state/{ANT_ID}/{MATERIAL_ID}

Action:
POST /api/live-transport/move

Attachment bootstrap:
POST /api/live-transport/attach
~~~

The adapter must keep the Bearer token outside repository data.

### Step D — first production cycle

Only after both sides are deployed and wired:

1. obtain real Fourmi birth identity;
2. attach exact admitted material at a known initial W: position;
3. read Queen + transport pre-state;
4. create exact single-use grant;
5. call one-step runtime once;
6. server applies exact FROM -> TO;
7. read later Queen + later state;
8. Brutus creates ANT_MOVE;
9. Brutus creates MATERIAL_MOVE;
10. Brutus creates authorization consumption receipt.

Only then may we say:

~~~text
PRODUCTION ANT_MOVE = OBSERVED
PRODUCTION MATERIAL_MOVE = VERIFIED
~~~

## 10. Non-negotiable invariants

Keep all of these:

~~~text
SOURCE_PASS != BRUTUS_PROOF

CANDIDATE != PROOF
CRYSTAL != PROOF
PROOF_REF != PROOF_CREATION

ANT_MOVED != MATERIAL_MOVED
AUTHORIZED != MOVED
ACTION_ACKNOWLEDGED != MOVEMENT_VERIFIED
UNKNOWN ACTION OUTCOME != SAFE TO RETRY

MOVED != MATH_PROOF
MOVED != WHEEL_AUTHORIZED

LIVE_ANT_ROUTING_WITH_UNDECIDED_AUTH = DENIED
WORLD_ROUTE_WITHOUT_CONTRACT = CLOSED
VERSO_DEFAULT = DEFAULT_LOCKED

no local tick invention
Queen server is clock authority
~~~

## 11. Wheel/body boundary

Do NOT skip directly to the left wheel yet.

The safe order remains:

~~~text
REAL MATERIAL_MOVE
        |
        v
EXPLICIT LEFT-WHEEL INGRESS AUTHORIZATION
        |
        v
LEFT WHEEL INPUT
        |
        v
CENTRAL INTERFERENCE / RESONANCE
        |
        v
RIGHT WHEEL OUTPUT
        |
        v
RECRYSTALLIZATION CANDIDATE
~~~

Even after wheel processing:

~~~text
WHEEL_PROCESSED != PROVED
RECRYSTALLIZED != PROVED
~~~

## 12. Brotoculateur input continuity

Local source previously verified:

~~~text
http://127.0.0.1:8778/api/status
~~~

Observed earlier in this workstream:

~~~text
34 canonical formulas
26 source-authenticated formulas
live trace/proof counters growing
~~~

The exact counters are runtime observations and must be re-read if needed.

The bus remains read-only.

## 13. Restore sentence

On restoration, summarize the state as:

"Brutus main already contains the full math-input-to-one-step-transport orchestration through PR #48. The active unfinished work is the Antmux Queen-server production source/actuator on branch astra/live-fourmi-transport-source-v01-20261002 at head bb225f19..., whose local test result must be re-verified before opening/merging its PR. No production movement has yet been claimed."

## 14. Checkpoint conclusion

This checkpoint intentionally records both what is complete and what is NOT complete.

Complete:

~~~text
Brutus contracts/runtime through one-step orchestration
bounded single-use authorization
fail-closed material move binding
at-most-once external action semantics
Antmux source/actuator code drafted
Antmux persistent transport state drafted
Antmux private move endpoint drafted
Antmux tests drafted
~~~

Not yet verified here:

~~~text
final Antmux local test result
Antmux PR CI
Antmux merge
VPS deployment of transport endpoints
Brutus production HTTP adapter
first real production ANT_MOVE
first real production MATERIAL_MOVE
left-wheel ingress
~~~

END CHECKPOINT
