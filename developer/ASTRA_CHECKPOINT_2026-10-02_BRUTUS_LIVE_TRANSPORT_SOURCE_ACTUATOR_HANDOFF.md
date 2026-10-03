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


## 15. POST-RESTORE FINALIZATION — VERIFIED STATE

This section was appended after restoring the session and supersedes any older checkpoint statement that says the live-transport test result, PR state, or Brutus production adapter were still unknown.

### Antmux source/actuator — verified

Repository:

~~~text
Topbrutus/Antmux
~~~

PR:

~~~text
#226 — Add live Fourmi transport source/actuator v0.1
branch: astra/live-fourmi-transport-source-v01-20261002
HEAD: bb225f19f8e7448d03ba426fab8b8828c7a8b721
base: 417c869a684bf41a1abca0ef2f7848308743f51f
mergeable: true
draft: true
~~~

Targeted local test was re-run from:

~~~text
D:\Antmux-Transport-Live
~~~

Verified output:

~~~text
LIVE_TRANSPORT_STORE=PASS
LIVE_TRANSPORT_AUTH=PASS
LIVE_TRANSPORT_REAL_ANT_IDENTITY=PASS
LIVE_TRANSPORT_STATE_HASH=PASS
LIVE_TRANSPORT_SINGLE_USE=PASS
LIVE_TRANSPORT_FAIL_CLOSED=PASS
~~~

The final Antmux contract includes the private authenticated endpoints:

~~~text
GET  /api/live-transport/ant/{ant_id}
POST /api/live-transport/attach
GET  /api/live-transport/state/{ant_id}/{material_id}
POST /api/live-transport/move
~~~

The ant endpoint returns the real persisted:

~~~text
ANTMUX-ANT-BIRTH-v1
~~~

receipt from the public-journal ant registry.

The combined transport-state response carries the authoritative Queen sub-snapshot and the exact transport state in one same-tick response.

### Antmux CI — exact status

On HEAD:

~~~text
bb225f19f8e7448d03ba426fab8b8828c7a8b721
~~~

verified GitHub Actions:

~~~text
CI X72 Integration Validation #120 = SUCCESS
X72 Resonance Structure Validation #45 = SUCCESS
Validate ZELSTEREOS WebSocket Order #64 = FAILURE
~~~

The ZELSTEREOS workflow failure was independently reproduced on the exact PR base commit:

~~~text
417c869a684bf41a1abca0ef2f7848308743f51f
~~~

using a detached worktree.

The same two GAMEZEL tests fail on the base:

~~~text
GAMEZEL quick play exposes exactly the four canonical seats = FAIL
GAMEZEL public draw WebSocket event is handled separately from numeric state = FAIL
~~~

Therefore the red ZEL check is PRE-EXISTING and is not introduced by PR #226.

PR #226 now contains a written CI note documenting this baseline reproduction.

Do not modify ZELSTEREOS merely to make the transport PR green; ZEL remains a separate workstream.

### Brutus production adapter — complete

Repository:

~~~text
Topbrutus/Brutus
~~~

PR:

~~~text
#49 — Add Antmux live transport production adapter v0.1
branch: astra/antmux-live-transport-adapter-v01-20261002
HEAD: c58fdc2c4f080fbf1b2b509806fbb04e4b3c7e48
base: 737c92163ac9b3b0e673f9396a0bd8f74e038ed3
draft: false
mergeable: true
~~~

Brutus CI:

~~~text
Brutus CI #120 = SUCCESS
~~~

Targeted local test re-run on exact branch HEAD:

~~~text
10 tests
10 pass
0 fail
~~~

Verified test names include:

~~~text
adapter rejects insecure non-loopback HTTP
adapter exposes no transport token
private ant receipt is validated and returned
attach establishes exact server-authoritative pre-state
same combined HTTP state supplies exact same Queen and transport tick
bindings reject transport-state read without preceding combined observation
server state hash tampering is rejected
full adapter + runtime chain produces observed material move and consumption
move POST sends only bounded server contract fields
production adapter is network-specific but contains no timers random or process execution
~~~

### Cross-repo E2E already achieved locally

The production code from the Antmux transport branch and Brutus adapter branch was executed together locally.

Observed chain:

~~~text
Brotoculateur live
-> Math Input Packet
-> Math Crystal
-> Fourmi Math Material
-> real persisted ANTMUX ant identity
-> Antmux attach
-> same-tick Queen + transport pre-state
-> bounded live transport authorization
-> exact move POST
-> same-tick Queen + transport post-state
-> ANT_MOVE
-> MATERIAL_MOVE
-> authorization CONSUMED
~~~

Observed source formula:

~~~text
z_P(21^k)=4*21^(k-1)
SOURCE_PASS
~~~

Observed persisted Fourmi:

~~~text
ANT-03395F386A2A
role = SYNAPSE
state = SINGING_TO_MEET
~~~

Observed runtime transition:

~~~text
attach tick = 16874
pre tick = 16878
post tick = 16886
W:START -> W:GENESIS-A
MATERIAL_MOVEMENT_VERIFIED = true
authorization = CONSUMED
PROOF_REF = null
WHEEL_INGRESS_AUTHORIZATION = false
~~~

Observed artifacts:

~~~text
MATH-CRYSTAL-56485D72EE5C6F36061980EE
MAT-MATH-5F3B11507EBE85D95851723E
RME-T16886-ANT-MOVE-D27C8122D1A61557
MMOVE-T16886-6CC8B2A8C05A1BE388A3
~~~

Important scope statement:

~~~text
LOCAL CROSS-REPO PRODUCTION-CODE E2E = VERIFIED
VPS DEPLOYMENT = NOT YET CLAIMED
PHYSICAL MOVEMENT = NOT CLAIMED
~~~

### Same-tick adapter design

PR #49 maps one Antmux combined state response into both:

~~~text
ObservationEnvelope Queen
BRUTUS-LIVE-FOURMI-TRANSPORT-STATE-v0.1
~~~

from the same source tick.

This eliminates the network race that would occur if Queen and transport state were fetched independently at 240 Hz.

The Queen bridge explicitly accepts:

~~~text
/api/live-transport/state
~~~

as an authoritative Queen observation endpoint.

The adapter also verifies:

~~~text
state_h256
Queen integrity/reference hash
transport tick == Queen tick
ANT_ID
MATERIAL_ID/H256
BINDING_STATE = ATTACHED
position
state_version
~~~

### Security boundary

The transport token:

~~~text
must remain outside Git
must remain inside adapter/server secret configuration
must never appear in checkpoint artifacts
~~~

Remote HTTP is rejected.

HTTPS is required except for loopback test/development.

Redirects are rejected.

The token is retained inside adapter closure state and is not exposed as an adapter property.

### Current merge locks

Brutus PR #49 is ready for review and technically green.

Antmux PR #226 is functionally verified and mergeable, but retains one red ZELSTEREOS workflow caused by a pre-existing GAMEZEL failure on its base.

Do not claim all Antmux CI green.

Do not merge either PR without a fresh explicit user go at the merge lock and re-verification of exact HEAD/base state.

### Developer checkpoint PR

This checkpoint itself is stored in:

~~~text
Topbrutus/Brutus
developer/ASTRA_CHECKPOINT_2026-10-02_BRUTUS_LIVE_TRANSPORT_SOURCE_ACTUATOR_HANDOFF.md
~~~

Checkpoint PR:

~~~text
#50 — Checkpoint Astra — live transport source/actuator handoff
branch: astra/checkpoint-developer-20261002-live-transport
~~~

This checkpoint PR is documentation-only and intentionally separate from functional PR #49.

### Updated restore sentence

On restoration, use:

"Brutus main already contains the math-input-through-one-step runtime chain. Antmux PR #226 now implements and locally verifies the persistent private live transport source/actuator, including real persisted ANTMUX ant birth identity, attach/state/move and same-tick Queen state. Brutus PR #49 implements the production adapter and passes 10/10 targeted tests plus Brutus CI. A local cross-repo E2E has already produced ANT_MOVE, MATERIAL_MOVE and consumed authorization from real production code. VPS deployment is not yet claimed. Antmux #226 has an unrelated pre-existing red GAMEZEL/ZEL workflow reproduced on its base commit."

END POST-RESTORE UPDATE


## 16. POST-MERGE LOCK RELEASE — VERIFIED

Date: 2026-10-02

This section supersedes the older merge-lock statements above.

Verified merges completed under explicit user approval:

~~~text
Antmux PR #226
merge commit: 8feab6a7fed6de59269a5cb3d172ecfad6005d1a
main HEAD verified at merge: 8feab6a7fed6de59269a5cb3d172ecfad6005d1a

Brutus PR #49
merge commit: 945e36d90586b04bd9fba63a9fcf7a323bcbb4d2
main HEAD verified at merge: 945e36d90586b04bd9fba63a9fcf7a323bcbb4d2
~~~

The transport source/actuator and Brutus production adapter are therefore merged into their respective main branches.

Scope remains exact:

~~~text
LOCAL CROSS-REPO PRODUCTION-CODE E2E = VERIFIED
VPS DEPLOYMENT = NOT YET CLAIMED
PHYSICAL MOVEMENT = NOT CLAIMED
PROOF_REF = null
WHEEL_INGRESS_AUTHORIZATION = false
~~~

The pre-existing ZELSTEREOS/GAMEZEL failure documented above remains a separate workstream and was not caused by Antmux PR #226.

### Current restore sentence

"Antmux live Fourmi transport source/actuator PR #226 and Brutus production adapter PR #49 are merged to main. Their local production-code cross-repo E2E already produced a verified software ANT_MOVE, MATERIAL_MOVE and consumed authorization. VPS deployment is not yet claimed, no physical movement is claimed, PROOF_REF remains null, and left-wheel ingress remains closed. The next transport step is production deployment/wiring followed by a fresh server-authoritative verification before any wheel-ingress work."

END POST-MERGE UPDATE
