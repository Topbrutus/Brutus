# Antmux Live Transport Production Adapter v0.1

Status: candidate.

## Purpose

Connect the merged Brutus one-step live transport runtime to the private Antmux Queen transport API defined by Antmux PR #226.

The adapter is intentionally outside the Brutus pure core.

It owns the network boundary only.

## Production API

Expected Antmux endpoints under the configured Queen base URL:

- GET /api/live-transport/ant/{ant_id}
- POST /api/live-transport/attach
- GET /api/live-transport/state/{ant_id}/{material_id}
- POST /api/live-transport/move

The adapter requires a dedicated transport Bearer token.

The token is captured in a private closure and is not exposed on the returned adapter object.

## URL security

Production URLs must use HTTPS.

Loopback HTTP is allowed only for localhost / 127.0.0.1 testing.

Embedded URL credentials, query strings and fragments are rejected.

Redirects are rejected.

## Real Ant identity

readAntBirthReceipt() reads the private persisted ANTMUX-ANT-BIRTH-v1 receipt.

The adapter verifies:

- schema
- exact ANT_ID
- role = SYNAPSE

The one-step runtime then applies the existing full Brutus ant identity normalization.

## Initial attachment

attachMaterial() explicitly establishes the server-authoritative starting state.

The request pins:

- ANT_ID
- MATERIAL_ID
- MATERIAL_H256
- POSITION
- TRACE_ID

The Antmux server itself refuses nonexistent ant identities and conflicting attachments.

Attachment is not movement.

## Same-tick Queen + transport observation

The Antmux transport state response embeds the Queen snapshot from the same server instant.

The adapter verifies the complete server state_h256 before trusting any field.

It then produces two Brutus views from one HTTP response:

1. a Queen ObservationEnvelope;
2. a BRUTUS-LIVE-FOURMI-TRANSPORT-STATE-v0.1.

Both carry the exact same Queen tick and observed_at_utc.

Runtime bindings cache the transport state after readObservation() and return that exact cached object from readTransportState().

Therefore no second network read can create a tick race between Queen and Fourmi position.

## Queen bridge extension

The existing Queen bridge now recognizes:

/api/live-transport/state

as a valid same-tick Queen observation endpoint in addition to /api/state and /ws.

The embedded Queen fields must still satisfy the original Queen validation rules.

## State integrity

The adapter checks:

- source schema = ANTMUX-LIVE-FOURMI-TRANSPORT-v0.1
- authority = QUEEN_SERVER_V0_2
- source endpoint
- current tick
- Queen tick equality
- Queen integrity_match
- Queen reference_h256
- ANT_ID
- position
- MATERIAL_ID/H256
- ATTACHED
- state_version
- canonical state_h256

A tampered state is rejected before it can enter the runtime.

## Actuator

performAuthorizedMove() accepts only the exact command produced by the merged one-step runtime.

The adapter strips Brutus-only SCHEMA/VERSION wrapper fields and sends only the bounded Antmux server contract.

It never chooses or changes FROM/TO.

The returned acknowledgment must exactly match:

- COMMAND_ID
- AUTHORIZATION_ID
- ANT_ID
- MATERIAL_ID
- FROM
- TO

The acknowledgment remains acceptance evidence only.

The one-step runtime still requires the post-action same-tick server state before it creates ANT_MOVE / MATERIAL_MOVE.

## Runtime bindings

createAntmuxLiveTransportRuntimeBindings() supplies exactly the four interfaces expected by the merged runtime:

- readObservation
- readAntBirthReceipt
- readTransportState
- performAuthorizedMove

The bindings enforce the read order:

readObservation -> readTransportState

A transport state cannot be consumed without its matching Queen observation.

## Cross-repo integration test

A strict fake Antmux server implements the exact PR #226 protocol.

The test executes the real Brutus chain:

adapter
-> same-tick runtime bindings
-> one-step runtime
-> move HTTP request
-> post-state verification
-> ANT_MOVE
-> MATERIAL_MOVE
-> authorization consumption

Result:

10 tests
10 pass
0 fail

The integration test also verifies:

- insecure non-loopback HTTP rejection
- token not exposed by adapter
- private birth receipt
- exact attach
- one HTTP state read per Queen/state pair
- read-order fail-closed
- state hash tamper detection
- exact bounded move POST
- no timers/random/process execution in adapter

## Production status

The adapter code is ready, but a production movement is not claimed until:

1. Antmux PR #226 is merged;
2. Queen server deployment includes those routes;
3. a real persisted ANT birth identity is selected;
4. a Brutus math material is admitted to that exact ANT_ID;
5. the dedicated transport token is provided privately to the runtime;
6. an explicit live transport grant is issued;
7. the one-step runtime completes with observed post-state.

No secret is stored in Git.
