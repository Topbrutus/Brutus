# Strand Segmentation / Dust Proposal v0.1

Status: candidate.

## Purpose

Define the first deterministic Brutus proposal layer that can examine a validated crystal strand and identify candidate cut boundaries without mutating the parent.

The module does not create real dust, real crystals or Fourmi actions.

It produces traceable proposals only.

## Input

The input is a valid:

~~~text
BRUTUS-CRYSTAL-STRAND-v0.1
~~~

The strand is revalidated before any proposal is generated.

Its canonical signature remains the parent identity for every proposed fragment.

## Boundary signals

A cut may be proposed only when an observed bead boundary changes at least one of:

~~~text
FEATURE_SIGNATURE
LOGICAL_HZ 1-Hz band
SALIENCE band
MODALITY set
~~~

No random boundary is generated.

The segmenter does not infer semantic meaning.

## Salience bands

v0.1 uses:

~~~text
LOW  < 0.30
MID  >= 0.30 and < 0.80
HIGH >= 0.80
~~~

These are experimental policy thresholds, not biological claims.

## Fragment dispositions

Each proposed segment can be classified as:

~~~text
PRESERVE_FRAGMENT_CANDIDATE
CRYSTAL_FRAGMENT_CANDIDATE
DUST_CANDIDATE
~~~

A high-salience fragment is a preservation candidate.

A low-salience segment with one stable feature, one logical-frequency band and at most two modalities can be marked as dust candidate.

Everything else becomes a crystal-fragment candidate.

None of these labels performs the action.

## Flat strand

If the metabolism layer has already classified the complete strand as:

~~~text
RECYCLE_CANDIDATE
~~~

the segmenter proposes the whole strand as one:

~~~text
DUST_CANDIDATE
~~~

with zero cuts.

The parent remains intact.

## Mixed strand

For:

~~~text
SEGMENT_CANDIDATE
~~~

the module proposes deterministic cuts at observed material boundaries and returns the resulting fragment proposals.

## Selective retention

A preserved strand can still contain a small distinctive event surrounded by long flat material.

Example:

~~~text
flat low-salience
        |
        v
strong high-salience spike
        |
        v
flat low-salience
~~~

If deterministic boundaries isolate both:

- at least one preserve fragment candidate; and
- at least one dust candidate,

the result can be:

~~~text
PROPOSE_SELECTIVE_RETENTION
~~~

This prevents one strong moment from forcing all surrounding flat material to remain equally valuable forever.

The original parent strand is still not modified.

## Consolidation boundary

A strand classified:

~~~text
CONSOLIDATE
~~~

is not cut by v0.1.

Replay and multisensory consolidation remain separate from recycling.

## Pedigree

Every proposed segment records:

~~~text
SEGMENT_ID
PARENT_STRAND_ID
PARENT_SIGNATURE_H256
START_INDEX
END_INDEX
TICK_START
TICK_END
BEAD_COUNT
SEGMENT_H256
~~~

This keeps each proposal traceable back to the exact immutable parent.

## Authority boundary

Every top-level result fixes:

~~~text
MUTATION_PERFORMED = false
MATERIAL_CREATED = false
DUST_CREATED = false
CRYSTAL_CREATED = false
DELETION_PERFORMED = false
PROOF_REF = null
~~~

Every segment proposal repeats the same creation/deletion/proof boundaries.

Therefore:

~~~text
DUST_CANDIDATE != DUST_CREATED
CRYSTAL_FRAGMENT_CANDIDATE != CRYSTAL_CREATED
PRESERVE_FRAGMENT_CANDIDATE != PROOF
CUT_PROPOSAL != PARENT_MUTATION
~~~

## CPU / security boundary

The production segmenter contains no:

- random sampling;
- timer loop;
- network access;
- WebSocket;
- process execution;
- source deletion;
- autonomous Fourmi;
- World Router authority;
- proof promotion.

It is deterministic over one supplied validated strand.

## Files

~~~text
contracts/strand-segmentation-proposal.v0.schema.json
src/strand-segmentation-dust.mjs
tests/strand-segmentation-dust.test.mjs
~~~

## Next brick

The next audited layer can be a real Fourmi material action contract.

It should consume a specific approved proposal and produce one or more immutable material artifacts while preserving:

~~~text
parent strand signature
segment hash
tick ancestry
source provenance
trace ancestry
PROOF_REF = null
~~~

Deletion of the parent should remain a separate authority decision.
