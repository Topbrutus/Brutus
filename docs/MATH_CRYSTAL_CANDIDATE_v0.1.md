# Math Crystal Candidate v0.1

Status: candidate.

## Purpose

Turn one exact item from a validated:

~~~text
BRUTUS-MATH-INPUT-PACKET-v0.1
~~~

into one immutable internal mathematical candidate while preserving exact source ancestry.

The transformation is:

~~~text
MATH INPUT PACKET
       |
       +-- exact ITEM_ID
       |
       v
MATH CRYSTAL CANDIDATE
~~~

This layer does not evaluate mathematical truth.

It preserves source claims and source evidence without silently converting them into Brutus proof.

## Core boundary

Every crystal fixes:

~~~text
MATERIAL_CLASS = MATH_CRYSTAL_CANDIDATE
STATE = CANDIDATE
BRUTUS_EVIDENCE_CLASS = CANDIDAT
BRUTUS_TRUTH_STATUS = UNVERIFIED_BY_BRUTUS
PROOF_REF = null
~~~

Therefore:

~~~text
SOURCE_PASS != BRUTUS_PROOF
SOURCE_AUTHENTICATED != BRUTUS_PROOF
SOURCE_PROOF_REF != BRUTUS_PROOF_REF
EXACT_WITNESS_REPLAY != BRUTUS_PROOF
MATH_CRYSTAL_CANDIDATE != THEOREM
~~~

## Exact source item

The input packet is first revalidated by the existing Math Input Bus validator.

The requested ITEM_ID must exist in that exact validated packet.

A candidate cannot be created from:

- an unknown item;
- a silently modified packet;
- a packet with invalid PACKET_H256;
- an item outside that packet.

## Pedigree

Every crystal records:

~~~text
PACKET_ID
PACKET_H256
SOURCE_SNAPSHOT_H256
SOURCE_SYSTEM
SOURCE_RUN_ID
ITEM_ID
ITEM_KIND
SOURCE_ITEM_H256
~~~

The source item itself is canonically hashed.

That gives the chain:

~~~text
MATH CRYSTAL
    |
    v
SOURCE ITEM
    |
    v
MATH INPUT PACKET
    |
    v
SOURCE SNAPSHOT
    |
    v
EXTERNAL SOURCE RUN
~~~

## Mathematical content

The crystal preserves:

~~~text
EXPRESSION
SOURCE_STATUS
BINDINGS
EVIDENCE
PROVENANCE
~~~

The expression receives its own independent UTF-8 SHA-256:

~~~text
EXPRESSION_HASH_METHOD = UTF8-SHA256-v0.1
EXPRESSION_H256
~~~

The complete CONTENT object is also canonically hashed:

~~~text
CONTENT_H256
~~~

And the complete crystal receives:

~~~text
CRYSTAL_H256
~~~

## Source evidence

Source evidence remains nested under:

~~~text
CONTENT.EVIDENCE
~~~

It may contain:

~~~text
SOURCE_TRACE_REF
SOURCE_PROOF_REF
SOURCE_HASH_REF
SUPPORT_COUNT
TEST_COUNT
REPLAY_STATUS
~~~

A SOURCE_PROOF_REF is explicitly an upstream/source reference.

It never populates:

~~~text
PROOF_REF
~~~

which remains null at v0.1.

## Source status

The exact SOURCE_STATUS is preserved.

Examples include:

~~~text
OBSERVED_CANONICAL_SAMPLE
SOURCE_PASS
SOURCE_AUTHENTICATED
TESTING
REJECTED
~~~

Brutus does not reinterpret these strings as its own verdict.

The internal truth status remains:

~~~text
UNVERIFIED_BY_BRUTUS
~~~

## Queen time

The crystal cannot invent Brutus time.

If the source packet is not Queen-bound:

~~~text
BOUND_TO_QUEEN = false
QUEEN_TICK = null
CLOCK_AUTHORITY = null
~~~

the crystal remains unbound.

If a packet was already explicitly bound to:

~~~text
CLOCK_AUTHORITY = QUEEN_SERVER_V0_2
QUEEN_TICK = authoritative tick
~~~

the crystal preserves exactly that binding.

A crystal cannot silently change the packet's Queen-binding state.

## Transport boundary

v0.1 fixes:

~~~text
TRANSPORT_AUTHORIZATION = false
~~~

Creation of a math crystal does not automatically place it on a Fourmi, wheel, route or machine.

Transport requires a later audited contract.

## Authority boundary

Every candidate fixes:

~~~text
IMMUTABLE = true
EXECUTABLE = false
AUTO_PROOF_PROMOTION = false
GATE_AUTHORITY = false
ROUTING_AUTHORIZATION = UNDECIDED
TRANSPORT_AUTHORIZATION = false
~~~

An upstream formula capsule may say that it was executable in the source system.

That upstream provenance is preserved, but:

~~~text
UPSTREAM_EXECUTABLE != BRUTUS_EXECUTABLE
~~~

## Independent validation

The crystal can be validated without having its source packet in memory.

Independent validation checks:

- exact fields;
- expression hash;
- content hash;
- complete crystal hash;
- immutable candidate state;
- proof boundary;
- execution/routing/transport boundaries;
- Queen-time consistency.

## Ancestry verification

A second operation can verify a candidate against the original packet.

It checks:

- packet ID;
- packet hash;
- source snapshot hash;
- source system;
- source run;
- exact ITEM_ID;
- item kind;
- source item hash;
- exact normalized content;
- exact inherited clock binding.

PASS returns:

~~~text
BRUTUS-MATH-CRYSTAL-ANCESTRY-VERIFICATION-v0.1
VERDICT = PASS
PROOF_CREATED = false
PROOF_REF = null
~~~

An ancestry PASS means the crystal matches its source packet.

It is not a mathematical proof.

## Determinism

The same exact packet item produces the same:

~~~text
CRYSTAL_ID
SOURCE_ITEM_H256
EXPRESSION_H256
CONTENT_H256
CRYSTAL_H256
~~~

No random identifier is used.

## Live verification

The implementation was exercised against the actual local Brotoculateur through the already merged read-only input adapter.

At the observation instant, two source items were crystallized successfully.

### Canonical sample

~~~text
EXPRESSION = (2*A<INPUT>)=B<OUTPUT>
SOURCE_STATUS = OBSERVED_CANONICAL_SAMPLE
BRUTUS_TRUTH_STATUS = UNVERIFIED_BY_BRUTUS
PROOF_REF = null
ANCESTRY = PASS
~~~

Observed candidate ID:

~~~text
MATH-CRYSTAL-B6AF27A569DF6CCA07937E58
~~~

### ZEL capsule

~~~text
EXPRESSION = z_P(21^k)=4*21^(k-1)
SOURCE_STATUS = SOURCE_PASS
BRUTUS_TRUTH_STATUS = UNVERIFIED_BY_BRUTUS
PROOF_REF = null
TRANSPORT_AUTHORIZATION = false
ANCESTRY = PASS
~~~

Observed candidate ID:

~~~text
MATH-CRYSTAL-D6E3D58C37E92CEB7C07F59A
~~~

Those IDs are tied to the exact live packet/source snapshot observed at that instant.

A later evolving source packet can legitimately produce different candidate IDs.

## Tests

Targeted local tests cover:

- canonical formula crystallization;
- SOURCE_PASS preservation without proof promotion;
- upstream source-proof reference preservation;
- deterministic identity;
- different items -> different crystals;
- missing item rejection;
- tampered packet rejection;
- tampered crystal rejection;
- exact ancestry PASS;
- evolved packet ancestry failure;
- no invented Queen time;
- exact Queen tick inheritance;
- no routing/gate/transport/execution authority;
- no network/timer/random/process execution in the core.

## Files

~~~text
contracts/math-crystal-candidate.v0.schema.json
src/math-crystal-candidate.mjs
tests/math-crystal-candidate.test.mjs
docs/MATH_CRYSTAL_CANDIDATE_v0.1.md
~~~

## Next brick

The next natural boundary is not automatic wheel execution.

It is an audited math-material admission / transport contract:

~~~text
VALIDATED MATH CRYSTAL CANDIDATE
        |
        v
EXPLICIT ADMISSION / TRANSPORT AUTHORIZATION
        |
        v
FOURMI MATH MATERIAL
~~~

Only after explicit transport admission should a mathematical crystal become eligible for body/wheel processing.

The invariants must remain:

~~~text
TRANSPORTED != PROVED
TRANSFORMED != PROVED
RECRYSTALLIZED != PROVED
~~~
