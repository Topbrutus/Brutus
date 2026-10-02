# Fourmi Material Action v0.1

Status: candidate.

## Purpose

Materialize one exact segment from one validated Brutus crystal strand after an explicit bounded control-plane request.

This is the first Brutus layer where a strand-segmentation proposal can become a new immutable material artifact.

The parent strand is never modified or deleted by v0.1.

## Chain

~~~text
CRYSTAL STRAND
      |
      v
SEGMENTATION PROPOSAL
      |
      v
EXPLICIT MATERIAL ACTION REQUEST
      |
      v
FOURMI MATERIAL ACTION
      |
      +--> CRYSTAL_FRAGMENT
      |
      +--> CRYSTAL_DUST
~~~

## Inputs

Materialization requires all three inputs together:

~~~text
strand
proposal
request
~~~

The strand is revalidated by the existing crystal-strand validator.

The proposal is recomputed deterministically from that exact strand.

The supplied proposal must hash to the exact same value as the recomputed proposal.

A caller therefore cannot silently alter:

- segment boundaries;
- disposition;
- metrics;
- parent identity;
- segment hash.

## Explicit request

The request contract is:

~~~text
BRUTUS-FOURMI-MATERIAL-ACTION-REQUEST-v0.1
~~~

It pins:

~~~text
ANT_ID
Queen TICK
PARENT_STRAND_ID
PARENT_SIGNATURE_H256
PROPOSAL_H256
SEGMENT_ID
TRACE_ID
~~~

and requires:

~~~text
AUTHORIZATION.POLICY = BRUTUS-FOURMI-MATERIAL-ACTION-v0.1
AUTHORIZATION.DECISION = APPROVED
AUTHORIZATION.APPROVER = BRUTUS_CONTROL_PLANE
~~~

This authorization block is an explicit contract record in v0.1.

It is not presented as an external cryptographic identity/signature system.

A future contract can add stronger signed authorization without changing the material pedigree model.

## Queen time

The request requires:

~~~text
CLOCK_AUTHORITY = QUEEN_SERVER_V0_2
~~~

The action tick cannot precede the end tick of the selected segment.

No local clock can authorize earlier materialization.

## Disposition mapping

The deterministic segmentation disposition controls the only admitted material type.

~~~text
PRESERVE_FRAGMENT_CANDIDATE
    -> CRYSTAL_FRAGMENT / PRESERVE

CRYSTAL_FRAGMENT_CANDIDATE
    -> CRYSTAL_FRAGMENT / RECRYSTALLIZE

DUST_CANDIDATE
    -> CRYSTAL_DUST / RECYCLE
~~~

The caller cannot choose another mapping.

## Exact extraction

The new material contains only:

~~~text
parent.BEADS[START_INDEX .. END_INDEX]
~~~

The action verifies:

- bead count;
- first and last ticks;
- exact segment identity;
- exact parent signature;
- exact proposal hash.

The original strand remains unchanged.

## Material artifact

Output schema:

~~~text
BRUTUS-FOURMI-MATERIAL-v0.1
~~~

Each artifact contains:

~~~text
MATERIAL_ID
MATERIAL_CLASS
MATERIAL_INTENT
ANT_ID
CREATED_AT_TICK
TRACE_ID
AUTHORIZATION_REF
PEDIGREE
PAYLOAD
PAYLOAD_H256
MATERIAL_H256
~~~

## Pedigree

Every material artifact preserves:

~~~text
PARENT_STRAND_ID
PARENT_SIGNATURE_H256
SEGMENT_ID
SEGMENT_H256
START_INDEX
END_INDEX
TICK_START
TICK_END
~~~

Therefore:

~~~text
MATERIAL
  -> SEGMENT
  -> PARENT STRAND
  -> ORIGINAL SENSORY BEADS
~~~

remains reconstructible.

## Sensory payload

The payload keeps the exact selected beads.

It also derives and validates:

~~~text
MODALITY_KINDS
LOGICAL_HZ_MIN
LOGICAL_HZ_MAX
SALIENCE_PEAK
~~~

The independent material validator recomputes these values from the beads.

A forged summary therefore fails closed.

The bead structure itself is also revalidated:

- IDs;
- strict tick order;
- modality fields;
- source hashes;
- feature hashes;
- salience/confidence;
- logical Hz;
- valence;
- left/right wheel phases.

## Integrity

The payload carries:

~~~text
PAYLOAD_H256
~~~

The complete material artifact carries:

~~~text
MATERIAL_H256
~~~

Both use the Brutus canonical recursive-key-sorted JSON SHA-256 method.

The material can therefore be validated later without trusting the in-memory object that originally created it.

## Parent boundary

Every material artifact fixes:

~~~text
PARENT_MUTATED = false
PARENT_DELETED = false
MATERIAL_CREATED = true
~~~

Materialization means creation of a new immutable data artifact.

It does not mean destructive extraction from the parent.

## Proof / routing boundary

Every request requires:

~~~text
PROOF_REF = null
EXECUTABLE = false
GATE_AUTHORITY = false
ROUTING_AUTHORIZATION = UNDECIDED
~~~

Every produced material fixes:

~~~text
PROOF_REF = null
IMMUTABLE = true
EXECUTABLE = false
AUTO_PROOF_PROMOTION = false
GATE_AUTHORITY = false
ROUTING_AUTHORIZATION = UNDECIDED
~~~

Therefore:

~~~text
MATERIAL_CREATED != PROOF_CREATED
DUST_CREATED_AS_DATA != ROUTING_AUTHORITY
FRAGMENT_CREATED != CRYSTAL_PROOF
FOURMI_ACTION != PARENT_DELETION
~~~

## Determinism

The same:

~~~text
strand
proposal
request
~~~

produces the same:

~~~text
MATERIAL_ID
PAYLOAD_H256
MATERIAL_H256
~~~

v0.1 contains no random sampling.

## CPU / security boundary

The production material action contains no:

- timers;
- network access;
- WebSocket;
- random sampling;
- process execution;
- World Router call;
- parent deletion;
- source mutation;
- proof promotion.

## Files

~~~text
contracts/fourmi-material-action-request.v0.schema.json
contracts/fourmi-material.v0.schema.json
src/fourmi-material-action.mjs
tests/fourmi-material-action.test.mjs
~~~

## Next brick

The next natural contract is the first controlled body ingress:

~~~text
FOURMI MATERIAL
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

That future brick should consume only validated Fourmi material and authoritative wheel/frequency state.

It must preserve the material pedigree and keep:

~~~text
INTERFERENCE != PROOF
RECRYSTALLIZATION != PROOF
~~~
