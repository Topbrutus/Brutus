# Fourmi Math Material Move Binding v0.1

Status: candidate.

## Purpose

Bind an already admitted Fourmi math material to one observed material movement only when Brutus has all required runtime evidence.

The required chain is:

~~~
FOURMI MATH MATERIAL
        |
        +-- validated live ANT identity
        |
        +-- validated ATTACHED carrier observation
        |
        +-- validated real ANT_MOVE
        |
        v
FOURMI MATH MATERIAL MOVE
~~~

This layer does not generate motion. It only binds already supplied validated runtime observations.

## Why three runtime pieces are required

An ANT moving is not enough to conclude that a material moved with it. The material must have been observed attached to that exact ant before the ANT_MOVE.

Invariant:

~~~
ANT_MOVED != MATERIAL_MOVED
~~~

Only:

~~~
LIVE_ANT_IDENTITY
+ ATTACHED(material, ant)
+ ANT_MOVE(ant)
= MATERIAL_MOVE_VERIFIED
~~~

may produce a material movement receipt.

## Carrier observation

Schema:

~~~
BRUTUS-MATH-MATERIAL-CARRIER-OBSERVATION-v0.1
~~~

It pins:

~~~
OBSERVATION_ID
Queen TICK
MATERIAL_ID
MATERIAL_H256
ANT_ID
BINDING_STATE = ATTACHED
SOURCE
TRACE_ID
SIGNATURE_H256
~~~

Required source integrity:

~~~
SOURCE.INTEGRITY_MATCH = true
~~~

The carrier observation itself has no movement or proof authority.

~~~
PROOF_REF = null
PROOF_CLAIM = false
EXECUTABLE = false
GATE_AUTHORITY = false
ROUTING_AUTHORIZATION = UNDECIDED
~~~

## Live ant identity

The existing ANTMUX-ANT-BIRTH-v1 receipt is normalized through src/adapters/ant-birth-identity.mjs.

The normalized ANT_ID must exactly equal FOURMI_MATH_MATERIAL.CARRIER.ANT_ID and the carrier observation ANT_ID.

A declared ANT_ID string alone is insufficient.

## Real ANT_MOVE

v0.1 consumes the already merged:

~~~
BRUTUS-REAL-MECHANISM-EVENT-v0.1
EVENT_TYPE = ANT_MOVE
~~~

The mechanism event must independently pass its existing validator.

That already requires:

~~~
EVENT_CLASS = RUNTIME_OBSERVATION
CLOCK_AUTHORITY = QUEEN_SERVER_V0_2
SOURCE.INTEGRITY_MATCH = true
SUBJECT.TYPE = ANT
real changed FROM/TO positions
signed event hash
PROOF_REF = null
PROOF_CLAIM = false
~~~

## Temporal order

The required Queen chronology is:

~~~
MATERIAL ADMISSION TICK
        <=
ATTACHMENT OBSERVATION TICK
        <=
ANT_MOVE TICK
~~~

A carrier observation before material creation is rejected. An ANT_MOVE before the attachment observation is rejected.

## Exact material pin

The attachment observation must pin MATERIAL_ID and MATERIAL_H256.

The move binding revalidates the complete Fourmi math material first. Therefore neither a similar material nor a forged material hash can be silently substituted.

## Output

Schema:

~~~
BRUTUS-FOURMI-MATH-MATERIAL-MOVE-v0.1
~~~

The receipt contains:

~~~
MOVE_ID
TICK
CLOCK_AUTHORITY
MATERIAL_REF
CARRIER
ANT_MOVE_REF
MOVEMENT
MOVE_H256
~~~

## Material reference

The output preserves:

~~~
MATERIAL_ID
MATERIAL_H256
PARENT_CRYSTAL_ID
PARENT_CRYSTAL_H256
CONTENT_H256
EXPRESSION_H256
~~~

Thus movement does not break the math provenance chain.

## Carrier verification

The output records:

~~~
CARRIER.ANT_ID
CARRIER.ANT_IDENTITY_H256
CARRIER.CARRIER_OBSERVATION_ID
CARRIER.CARRIER_OBSERVATION_H256
CARRIER.RUNTIME_VERIFIED = true
~~~

RUNTIME_VERIFIED=true is allowed only after the validated live identity and exact carrier observation match.

## ANT move reference

The output preserves the exact underlying mechanism observation:

~~~
EVENT_ID
EVENT_SIGNATURE_H256
TRACE_ID
FROM
TO
SOURCE_OBSERVATION_ID
SOURCE_SCHEMA
SOURCE_ENDPOINT
~~~

The MATERIAL_MOVE endpoints must exactly equal the ANT_MOVE endpoints.

## Movement semantics

A successful output fixes:

~~~
EVENT_TYPE = MATERIAL_MOVE
MATERIAL_STATE_BEFORE = ADMITTED_NOT_MOVED
MATERIAL_STATE_AFTER = MOVED_OBSERVED
ANT_MOVED = true
MATERIAL_BOUND_AT_MOVE = true
MATERIAL_MOVEMENT_VERIFIED = true
~~~

This is a verified runtime movement observation. It is not a mathematical truth claim.

## Immutability

The already admitted material remains unchanged.

The movement receipt fixes:

~~~
MATERIAL_MUTATED = false
PARENT_CRYSTAL_MUTATED = false
~~~

The movement state is represented by a new immutable receipt, not by rewriting history.

## Proof boundary

Movement verification does not produce a Brutus proof artifact.

~~~
BRUTUS_TRUTH_STATUS = UNVERIFIED_BY_BRUTUS
PROOF_REF = null
PROOF_CREATED = false
PROOF_CLAIM = false
~~~

Therefore:

~~~
MATERIAL_MOVEMENT_VERIFIED != MATH_PROOF
ANT_MOVE != MATH_PROOF
SOURCE_PASS != BRUTUS_PROOF
~~~

## Wheel boundary

Even after real movement:

~~~
WHEEL_INGRESS_AUTHORIZATION = false
MACHINE_EXECUTION_AUTHORIZATION = false
ROUTING_AUTHORIZATION = UNDECIDED
EXECUTABLE = false
GATE_AUTHORITY = false
~~~

Invariant:

~~~
MOVED != WHEEL_AUTHORIZED
~~~

A separate body-ingress contract is still required.

## Determinism

The same exact material, normalized live ant identity, carrier observation and ANT_MOVE produce the same MOVE_ID and MOVE_H256. No random identity is generated.

## Current live-source status

The runtime was inspected before this contract was written.

The current X72 WebSocket:

~~~
wss://antmux.com/laboratoire/embryon-x72/ws
~~~

exposes the Queen-authoritative nucleus, synapses, relations and world state, including a real Queen tick.

At the observed runtime state it did not expose:

~~~
ANT_MOVE
ANT position
material-to-ant attachment observation
~~~

The Antmux public-journal source creates ANTMUX-ANT-BIRTH-v1 receipts when visitor ants are born, but the current public GET journal endpoint does not expose a read-only birth-receipt/movement stream.

Therefore no live MATERIAL_MOVE was fabricated for this v0.1 implementation.

This is intentional.

Current acceptance status:

~~~
CONTRACT READY = true
LIVE ANT_MOVE SOURCE AVAILABLE = false
LIVE MATERIAL_MOVE EMITTED = false
~~~

The first production MATERIAL_MOVE must wait until a real runtime source supplies both:

~~~
ATTACHED carrier observation
ANT_MOVE
~~~

for the same live ANT_ID and material.

## Tests

Targeted local tests cover successful binding of attachment + ANT_MOVE, no material/parent mutation, ATTACHED state requirement, live ant mismatch, wrong material ID/hash, temporal-order failures, non-ANT events, wrong ANT_MOVE subject, source-integrity failure, deterministic identity, tamper detection, proof boundary, no wheel/machine/routing authority, deep immutability, and no network/timer/random/process execution in core.

## Files

~~~
contracts/math-material-carrier-observation.v0.schema.json
contracts/fourmi-math-material-move.v0.schema.json
src/fourmi-math-material-move.mjs
tests/fourmi-math-material-move.test.mjs
docs/FOURMI_MATH_MATERIAL_MOVE_v0.1.md
~~~

## Next runtime seam

The next operational dependency is external-source-side:

~~~
REAL MATERIAL CARRIER OBSERVATION
+
REAL ANT_MOVE
        |
        v
MATERIAL_MOVE
~~~

Once one genuine MATERIAL_MOVE exists, the next Brutus brick can be:

~~~
MATERIAL_MOVE
        |
        v
EXPLICIT LEFT-WHEEL INGRESS REQUEST
        |
        v
LEFT WHEEL INPUT
~~~

The invariants remain:

~~~
MOVED != PROVED
MOVED != WHEEL_AUTHORIZED
WHEEL_PROCESSED != PROVED
~~~
