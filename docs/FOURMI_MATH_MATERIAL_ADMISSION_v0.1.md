# Fourmi Math Material Admission v0.1

Status: candidate.

## Purpose

Admit one validated Brutus math crystal candidate as transport-eligible Fourmi material without mutating the parent crystal and without performing movement, routing, wheel ingress, machine execution or proof promotion.

The chain is:

~~~text
MATH INPUT PACKET
       |
       v
MATH CRYSTAL CANDIDATE
       |
       v
EXPLICIT CONTROL-PLANE ADMISSION REQUEST
       |
       v
FOURMI MATH MATERIAL
~~~

## Parent crystal remains unchanged

The parent candidate retains:

~~~text
TRANSPORT_AUTHORIZATION = false
~~~

Admission creates a new immutable material artifact.

It never edits the parent crystal in place.

Therefore:

~~~text
PARENT CRYSTAL != TRANSPORT MATERIAL
ADMISSION != PARENT MUTATION
~~~

## Explicit request

Request schema:

~~~text
BRUTUS-MATH-MATERIAL-ADMISSION-REQUEST-v0.1
~~~

The request pins:

~~~text
REQUEST_ID
ANT_ID
Queen TICK
PARENT_CRYSTAL_ID
PARENT_CRYSTAL_H256
TRACE_ID
~~~

and requires:

~~~text
PURPOSE = FOURMI_TRANSPORT_ADMISSION

AUTHORIZATION.POLICY =
  BRUTUS-MATH-MATERIAL-ADMISSION-v0.1

AUTHORIZATION.DECISION = APPROVED
AUTHORIZATION.APPROVER = BRUTUS_CONTROL_PLANE
~~~

The authorization block is an explicit v0.1 contract record.

It is not an external cryptographic identity-signature system.

## Queen clock

Material admission itself is a Brutus action and requires:

~~~text
CLOCK_AUTHORITY = QUEEN_SERVER_V0_2
TICK = authoritative Queen tick
~~~

If the source math crystal was already Queen-bound, admission cannot occur before its inherited source tick.

If the source crystal was historically unbound, that history remains recorded as unbound while the new admission artifact receives its own authoritative creation tick.

This preserves both facts instead of rewriting history.

## Exact source ancestry

Before admission, Brutus revalidates:

1. the math input packet;
2. the math crystal candidate;
3. the crystal against the exact parent packet.

Admission therefore fails if:

- the packet changed;
- the source snapshot changed;
- the item changed;
- the crystal changed;
- the request names another crystal;
- the parent crystal hash is forged.

## Output

Output schema:

~~~text
BRUTUS-FOURMI-MATH-MATERIAL-v0.1
~~~

The output carries:

~~~text
MATERIAL_ID
MATERIAL_CLASS = FOURMI_MATH_MATERIAL
MATERIAL_INTENT = TRANSPORT
CREATED_AT_TICK
TRACE_ID
TRANSPORT_STATE
CARRIER
AUTHORIZATION_REF
PEDIGREE
SOURCE_CRYSTALLIZATION
CONTENT
CONTENT_H256
MATERIAL_H256
~~~

## Transport semantics

The material fixes:

~~~text
TRANSPORT_AUTHORIZATION = true
TRANSPORT_STATE = ADMITTED_NOT_MOVED
MOVEMENT_PERFORMED = false
~~~

This means the material is eligible to be carried by a Fourmi under future runtime movement contracts.

It does not claim that movement already happened.

Invariant:

~~~text
TRANSPORT_AUTHORIZED != MOVED
~~~

## Carrier semantics

The material records:

~~~text
CARRIER.ANT_ID
CARRIER.BINDING_STATUS = CONTROL_PLANE_DECLARED
CARRIER.RUNTIME_VERIFIED = false
~~~

v0.1 therefore records the intended carrier identity from the approved request without pretending that a live runtime ant binding was independently observed.

A later runtime contract can verify the actual carrier and movement event.

Invariant:

~~~text
DECLARED_CARRIER != LIVE_CARRIER_PROOF
~~~

## Math pedigree

Every material artifact preserves:

~~~text
PARENT_CRYSTAL_ID
PARENT_CRYSTAL_H256

PACKET_ID
PACKET_H256
SOURCE_SNAPSHOT_H256

SOURCE_SYSTEM
SOURCE_RUN_ID

ITEM_ID
ITEM_KIND
SOURCE_ITEM_H256

CONTENT_H256
EXPRESSION_H256
~~~

This maintains the complete ancestry:

~~~text
FOURMI MATH MATERIAL
       |
       v
MATH CRYSTAL
       |
       v
MATH INPUT ITEM
       |
       v
MATH INPUT PACKET
       |
       v
EXTERNAL SOURCE SNAPSHOT
~~~

## Content

The exact math crystal content is copied into the new material:

~~~text
EXPRESSION
EXPRESSION_H256
SOURCE_STATUS
BINDINGS
EVIDENCE
PROVENANCE
~~~

The material independently revalidates the expression hash and complete content hash.

## Source status and proof boundary

Source state remains provenance.

Examples:

~~~text
SOURCE_PASS
SOURCE_AUTHENTICATED
EXACT_WITNESS_REPLAY
SOURCE_PROOF_REF
~~~

never become Brutus truth automatically.

The material fixes:

~~~text
BRUTUS_TRUTH_STATUS = UNVERIFIED_BY_BRUTUS
PROOF_REF = null
AUTO_PROOF_PROMOTION = false
~~~

Therefore:

~~~text
SOURCE_PASS != BRUTUS_PROOF
SOURCE_PROOF_REF != BRUTUS_PROOF_REF
TRANSPORT_AUTHORIZED != PROVED
~~~

## Wheel boundary

v0.1 explicitly fixes:

~~~text
WHEEL_INGRESS_AUTHORIZATION = false
~~~

A material artifact cannot enter the left wheel merely because it is transportable.

A separate audited body-ingress contract is required.

Invariant:

~~~text
TRANSPORT_AUTHORIZED != WHEEL_AUTHORIZED
~~~

## Routing and machine boundary

The material also fixes:

~~~text
ROUTING_AUTHORIZATION = UNDECIDED
MACHINE_EXECUTION_AUTHORIZATION = false
EXECUTABLE = false
GATE_AUTHORITY = false
~~~

Thus the admission artifact cannot:

- choose a route;
- move itself;
- invoke a machine;
- enter a wheel;
- execute upstream formula code;
- open a gate;
- create a proof.

## Parent safety

Every material artifact fixes:

~~~text
PARENT_MUTATED = false
PARENT_DELETED = false
MATERIAL_CREATED = true
~~~

The parent crystal survives unchanged.

## Determinism

The same exact:

~~~text
math crystal
math input packet
admission request
~~~

produces the same:

~~~text
MATERIAL_ID
MATERIAL_H256
~~~

No random identifier is used.

## Security / CPU boundary

The core:

~~~text
src/fourmi-math-material-admission.mjs
~~~

contains no:

- network access;
- WebSocket;
- timer loop;
- random sampling;
- process execution;
- route execution;
- movement execution;
- wheel invocation;
- proof promotion.

## Live verification

The full chain was exercised against the live local Brotoculateur and the authoritative X72 Queen stream.

The source formula observed was:

~~~text
z_P(21^k)=4*21^(k-1)
~~~

with source status:

~~~text
SOURCE_PASS
~~~

The admission used a real Queen tick observed from:

~~~text
source = QUEEN_SERVER_V0_2
integrity_match = true
noyau_runtime.authority = NOYAU_ENGINE_HEADLESS
noyau_runtime.noyau.tick = 192712493
~~~

At that observation instant, Brutus produced:

~~~text
CRYSTAL_ID =
MATH-CRYSTAL-E32F4E111E72201A07425070

MATERIAL_ID =
MAT-MATH-B5DCB678F8271A28C3F58C1E

TRANSPORT_AUTHORIZATION = true
TRANSPORT_STATE = ADMITTED_NOT_MOVED
MOVEMENT_PERFORMED = false

WHEEL_INGRESS_AUTHORIZATION = false
ROUTING_AUTHORIZATION = UNDECIDED

BRUTUS_TRUTH_STATUS = UNVERIFIED_BY_BRUTUS
PROOF_REF = null

CARRIER.ANT_ID = ANT-000000000001
CARRIER.BINDING_STATUS = CONTROL_PLANE_DECLARED
CARRIER.RUNTIME_VERIFIED = false
~~~

The observed tick and IDs are evidence from that particular live snapshot, not constants in the contract.

## Tests

Targeted local tests cover:

- approved transport admission;
- unchanged non-transport parent crystal;
- SOURCE_PASS / upstream executable boundary;
- unbound source history plus Queen-ticked admission;
- rejection of time travel before Queen-bound parent;
- denied authorization;
- wrong parent crystal ID;
- forged parent crystal hash;
- packet/crystal ancestry mismatch;
- deterministic material identity;
- complete math pedigree preservation;
- material-content tamper detection;
- declared-vs-runtime carrier boundary;
- deep immutability;
- no network/timer/random/process execution in core.

## Files

~~~text
contracts/math-material-admission-request.v0.schema.json
contracts/fourmi-math-material.v0.schema.json
src/fourmi-math-material-admission.mjs
tests/fourmi-math-material-admission.test.mjs
docs/FOURMI_MATH_MATERIAL_ADMISSION_v0.1.md
~~~

## Next brick

The next natural boundary is an actual runtime movement contract:

~~~text
FOURMI MATH MATERIAL
        |
        v
LIVE CARRIER VERIFICATION
        |
        v
REAL ANT_MOVE / MATERIAL_MOVE EVENT
~~~

Only after real movement exists should a separate contract admit that transported material to the body:

~~~text
LEFT WHEEL INPUT
        |
        v
CENTRAL INTERFERENCE / RESONANCE
        |
        v
RIGHT WHEEL OUTPUT
~~~

The invariants remain:

~~~text
MOVED != PROVED
WHEEL_PROCESSED != PROVED
RECRYSTALLIZED != PROVED
~~~
