# ASTRA CHECKPOINT — LIVE TRANSPORT PRODUCTION VERIFIED

Date: 2026-10-05
Owner/workstream: Astra — Brutus transport / Antmux Queen source-actuator integration.
Status: source/actuator production seam verified. Do not restart this work from scratch.

## 1. Recovery rule

Use live source > this checkpoint > hypothesis.

Never read/open/index/modify agent.md or AGENTS.md.

No secrets belong in this file.

## 2. Current repository heads verified during continuation

Brutus:

~~~text
Topbrutus/Brutus
main = e560bac08fc36fa1cab6db29590324188b5d86b3
~~~

Antmux:

~~~text
Topbrutus/Antmux
main = 73370aa79cff9fe71c0d607d9b47679e5a24a479
~~~

Antmux live transport source/actuator and Brutus production adapter are already merged into their respective main histories. Do not recreate them.

## 3. Brutus transport implementation verified locally on current main

Dedicated clone:

~~~text
D:\Brutus-Aquarium-Live
~~~

Targeted tests re-run on Brutus main e560bac...:

~~~text
43 tests
43 pass
0 fail
~~~

Covered together:

~~~text
tests/antmux-live-transport-adapter.test.mjs
tests/one-step-live-transport-runtime.test.mjs
tests/fourmi-math-material-move.test.mjs
~~~

Verified chain in code remains:

~~~text
ANTMUX private transport source
-> Brutus production HTTP adapter
-> same-tick Queen + transport state
-> one-step bounded runtime
-> ANT_MOVE
-> MATERIAL_MOVE
-> authorization consumption
~~~

Critical boundaries remain:

~~~text
SOURCE_PASS != BRUTUS_PROOF
ANT_MOVED != MATERIAL_MOVED
ACTION_ACKNOWLEDGED != MOVEMENT_VERIFIED
UNKNOWN ACTION OUTCOME != SAFE TO RETRY
MOVED != MATH_PROOF
MATERIAL_MOVE != LEFT_WHEEL_INGRESS
PROOF_REF = null
WHEEL_INGRESS_AUTHORIZATION = false
~~~

## 4. Production reverse-proxy path verified

Important correction:

~~~text
https://antmux.com/api/live-transport/...
~~~

is NOT the Queen API path. It falls through to the public HTML site.

The real deployed Queen reverse-proxy prefix is:

~~~text
https://antmux.com/laboratoire/embryon-x72/api/live-transport/...
~~~

Unauthenticated probes to:

~~~text
GET /laboratoire/embryon-x72/api/live-transport/ant/{ant_id}
GET /laboratoire/embryon-x72/api/live-transport/state/{ant_id}/{material_id}
~~~

returned:

~~~text
HTTP 401
Content-Type: application/json
{"detail":"live transport authorization required"}
~~~

Therefore the private transport endpoints are deployed and the authentication boundary is active.

No token was read or printed during this verification.

## 5. Historical audit failure explained

Historical audit workflow branch:

~~~text
astra/prod-live-transport-audit-v01-20261002
~~~

Old run:

~~~text
GitHub Actions run 37088708169
Audit X72 Live Transport Production
conclusion = failure
~~~

Exact failure:

~~~text
PERSISTED_ANT=NONE
~~~

This was not a transport runtime defect.

The old audit only searched:

~~~text
public-journal.db -> ants
~~~

but the private persistent system carrier created later lives in:

~~~text
live-transport.db -> carrier_ants
~~~

## 6. Audit workflow corrected and fresh production audit PASS

Audit branch was corrected read-only to search:

~~~text
public-journal.db -> ants
OR
live-transport.db -> carrier_ants
~~~

No ant creation, move or state mutation was added to the audit.

Corrected audit commit:

~~~text
ed94dce1b47e4c62aa080051bac5f481a7a86448
fix: audit persisted transport carrier fallback
~~~

Fresh GitHub Actions run:

~~~text
37270205976
Audit X72 Live Transport Production #4
conclusion = SUCCESS
~~~

Verified production markers:

~~~text
PROD_LIVE_TRANSPORT_TOKEN_FILE=PASS
PROD_LIVE_TRANSPORT_TOKEN_MODE=600
PROD_PERSISTED_ANT=PASS
PERSISTED_ANT_SOURCE=carrier_ants
ANT_ID=ANT-9F7FC681CD80
ANT_ROLE=SYNAPSE
ANT_STATE=SINGING_TO_MEET
PRIVATE_ANT_RECEIPT_MATCH=PASS
QUEEN_TICK=240712120
PROD_LIVE_TRANSPORT_READ_ONLY_AUDIT=PASS
~~~

The token value itself was never exposed.

## 7. First production server-authoritative bounded move already PASS

Operational branch:

~~~text
astra/prod-system-ant-bootstrap-run-20261002
HEAD = 9dd787a8b357cd39eb1b5f87cb03cf9446752ad2
~~~

Workflow:

~~~text
Execute First Production Brutus Move
GitHub Actions run 37091819893
conclusion = SUCCESS
~~~

Verified output:

~~~text
GRANT_SIGNATURE=PASS
GRANT_ACTIVE=PASS
PRE_POSITION=W:START
PRE_STATE_VERSION=1
PRE_TICK=196689720
COMMAND_ID=LTC-T196689720-76FFB3576D7D994C1023
EXECUTED_AT_TICK=196689732
POST_POSITION=W:GENESIS-A
POST_STATE_VERSION=2
POST_TICK=196689734
LAST_MOVE_TICK=196689732
LAST_COMMAND_ID=LTC-T196689720-76FFB3576D7D994C1023
LAST_AUTHORIZATION_ID=LTA-T196670817-B0A6DFDF2524D10F8F34
CONSUMPTION_ROW_COUNT=1
FIRST_PRODUCTION_BRUTUS_MOVE=PASS
~~~

This establishes a real persisted software state transition on the production Queen transport store with exact single-use authorization consumption.

Do not describe this as physical movement.

## 8. Precision about what is and is not proven

CONFIRMED:

~~~text
production transport endpoints deployed
private auth boundary active
persistent private system ant exists
private ant receipt matches persisted receipt
Queen health/integrity passes
production server state moved W:START -> W:GENESIS-A
state_version 1 -> 2
single authorization consumption row = 1
Brutus adapter/runtime/move-binder tests = 43/43 PASS on current main
~~~

NOT CLAIMED BY THIS CHECKPOINT:

~~~text
physical movement
mathematical proof
PROOF_REF creation
left-wheel ingress
fresh production execution of the full Brutus HTTP adapter + one-step runtime that emits a BRUTUS MATERIAL_MOVE receipt on the VPS
~~~

The successful production move workflow exercised the production Queen transport store directly under the exact bounded grant. It did not independently re-run the full Brutus HTTP adapter/runtime in production during this continuation.

Local cross-repo production-code E2E had already verified ANT_MOVE + MATERIAL_MOVE generation before deployment, as recorded in the older developer checkpoint.

## 9. Current operational audit branch state

The corrected audit commit is on:

~~~text
astra/prod-live-transport-audit-v01-20261002
HEAD = ed94dce1b47e4c62aa080051bac5f481a7a86448
~~~

Its fresh production audit is green.

Do not confuse this ops/audit branch with Antmux main implementation state.

## 10. Exact next action

DO NOT rebuild the source/actuator.
DO NOT repeat the first W:START -> W:GENESIS-A server move.
DO NOT retry the consumed authorization.
DO NOT open left-wheel ingress yet if requiring a fresh production Brutus MATERIAL_MOVE receipt.

The next surgical transport action is:

~~~text
run one fresh bounded production cycle THROUGH the merged Brutus HTTP adapter + one-step runtime
~~~

using:

~~~text
current persisted carrier ANT-9F7FC681CD80
current server position W:GENESIS-A
one fresh admitted math material or an exact material whose full Brutus artifact is available
one NEW single-use transport authorization
one NEW exact edge, e.g. W:GENESIS-A -> an explicitly authorized destination
production private transport endpoint
Queen same-tick before/after state
~~~

PASS requires Brutus itself to emit and validate all of:

~~~text
ATTACHED carrier observation
ANT_MOVE
MATERIAL_MOVE with MATERIAL_MOVEMENT_VERIFIED=true
authorization consumption receipt
PROOF_REF=null
WHEEL_INGRESS_AUTHORIZATION=false
~~~

Only after that fresh production Brutus MATERIAL_MOVE receipt exists should the next architectural brick become:

~~~text
EXPLICIT LEFT-WHEEL INGRESS AUTHORIZATION
~~~

## 11. Restore sentence

"The Antmux Queen live transport source/actuator is merged, deployed and privately authenticated. Brutus main contains the production adapter and one-step runtime and passes 43/43 targeted transport tests. A production server-authoritative move already succeeded from W:START to W:GENESIS-A with single-use authorization consumption, and a fresh read-only VPS audit is green at run 37270205976. Do not repeat that move or its consumed grant. The next exact step is one fresh production cycle through the merged Brutus HTTP adapter/runtime so Brutus itself emits the production ATTACHED/ANT_MOVE/MATERIAL_MOVE/consumption chain; left-wheel ingress remains closed until then."

END CHECKPOINT
