# Crystal Strand Metabolism v0.1

Status: candidate.

## Purpose

Define the first bounded Brutus memory strand and a deterministic, non-mutating metabolism analysis for it.

The strand is a time-ordered multisensory memory object. It preserves provenance references and compact feature hashes while keeping Brutus internal state at the same Queen-authoritative ticks.

It is intentionally closer to a temporal cord than to a database row.

## Core shape

A strand contains 2..4096 ordered beads.

Each bead contains:

- one authoritative Queen tick;
- one or more sensory modalities;
- compact source and feature SHA-256 references;
- per-modality salience and confidence;
- the Brutus internal state at that tick:
  - logical resonance frequency;
  - valence;
  - left wheel phase;
  - right wheel phase.

Admitted modalities in v0.1:

~~~text
AUDITION
VISION
TOUCH
ODOR
TASTE
INTERNAL
~~~

A bead cannot contain the same modality twice.

## Raw media boundary

The strand does not embed full audio, video or other high-volume sensor streams.

Each modality carries:

~~~text
SOURCE_REF
SOURCE_H256
FEATURE_H256
SALIENCE
CONFIDENCE
~~~

This lets a future adapter bind the strand to exact source material without making the strand itself a media archive.

## Queen time

~~~text
CLOCK_AUTHORITY = QUEEN_SERVER_V0_2
~~~

Bead ticks must be strictly increasing.

~~~text
TICK_START = first bead tick
TICK_END   = last bead tick
~~~

No local memory clock is invented.

## Internal resonance

Each bead records:

~~~text
LOGICAL_HZ
VALENCE
LEFT_PHASE_DEG
RIGHT_PHASE_DEG
~~~

LOGICAL_HZ is a Brutus software resonance variable. It is not, by itself, a claim that a biological, acoustic or electromagnetic system has that physical frequency.

The field exists so future Parazone/Brutus wheel contracts can preserve the exact resonance state that was active when a perceptual bead was formed.

## Why a strand instead of one large crystal

A long sensory experience often contains both useful and repetitive intervals.

The strand preserves temporal ordering so future Fourmi/machine contracts can:

- identify repetitive intervals;
- preserve strongly varying intervals;
- segment distinctive intervals;
- consolidate repeated patterns;
- recycle low-information material.

v0.1 only analyses. It does not perform those actions.

## Metabolism metrics

analyzeCrystalStrand() derives:

~~~text
BEAD_COUNT
TRANSITION_RATIO
FREQUENCY_SPREAD_HZ
DISTINCT_1HZ_BANDS
MODALITY_COUNT
MODALITY_COVERAGE
SYNC_DENSITY
SALIENCE_PEAK
MEAN_SALIENCE
REPLAY_COUNT
~~~

TRANSITION_RATIO is based on changes in the bead fingerprint:

~~~text
modal feature hashes
+
logical resonance
+
valence
+
left/right wheel phase
~~~

Therefore a strand can vary because the sensed material changed, the body state changed, or both changed.

## Experimental v0.1 policy

The first policy is deliberately simple and explicit.

### PRESERVE

A strand is marked PRESERVE when either:

~~~text
SALIENCE_PEAK >= 0.80
~~~

or:

~~~text
TRANSITION_RATIO >= 0.60
AND
DISTINCT_1HZ_BANDS >= 3
~~~

This represents the current hypothesis that highly salient or strongly varying/frequency-diverse strands deserve retention.

### CONSOLIDATE

A strand is marked CONSOLIDATE when it was replayed at least three times, or when at least three sensory modalities are sufficiently synchronized.

This is the seam intended for future sleep/replay consolidation.

### RECYCLE_CANDIDATE

A strand is marked RECYCLE_CANDIDATE only when all are true:

~~~text
TRANSITION_RATIO <= 0.10
DISTINCT_1HZ_BANDS <= 1
SALIENCE_PEAK < 0.30
REPLAY_COUNT = 0
~~~

This is not deletion.

It means the strand is eligible for a future audited Fourmi/machine recycling action.

### SEGMENT_CANDIDATE

Anything mixed that is neither strongly preservable nor clearly flat is marked:

~~~text
SEGMENT_CANDIDATE
~~~

The intent is to let a future segmenter search for distinctive sub-strands instead of throwing the whole memory away.

## No autonomous destruction

The metabolism result is advisory data only.

Every result fixes:

~~~text
MUTATION_PERFORMED = false
DUST_CREATED = false
SEGMENT_CREATED = false
CRYSTAL_CREATED = false
DELETION_PERFORMED = false
PROOF_REF = null
~~~

The strand itself also fixes:

~~~text
EXECUTABLE = false
MUTATION_AUTHORITY = false
DUST_CREATION_AUTHORITY = false
DELETION_AUTHORITY = false
PROOF_REF = null
~~~

Therefore:

~~~text
RECYCLE_CANDIDATE != DELETED
SEGMENT_CANDIDATE != SEGMENTED
PRESERVE != PROOF
CONSOLIDATE != PROOF
~~~

## Future Fourmi seam

A later audited contract can consume a metabolism result and perform a real action:

~~~text
STRAND
  |
  v
METABOLISM ANALYSIS
  |
  +--> PRESERVE
  +--> CONSOLIDATE
  +--> SEGMENT_CANDIDATE
  +--> RECYCLE_CANDIDATE
                |
                v
      FUTURE FOURMI/MACHINE ACTION
                |
                +--> segment
                +--> dust
                +--> new crystal candidate
~~~

That future contract must preserve parent IDs, ticks, source hashes and trace ancestry.

## Sleep seam

REPLAY_COUNT exists so a future sleep/consolidation controller can record repeated reprocessing without rewriting original sensory beads.

No sleep scheduler is implemented in v0.1.

## Evidence boundary

The strand is memory/provenance material, not proof.

High salience, high frequency diversity, multisensory synchrony or repeated replay never upgrade an item to proof.

## CPU and security boundary

The production metabolism module contains no:

- network access;
- WebSocket;
- timer loop;
- random sampling;
- process execution;
- World Router call;
- autonomous Fourmi;
- source deletion;
- dust creation;
- proof promotion.

It performs bounded validation and deterministic analysis of a supplied strand only.

## Files

~~~text
contracts/crystal-strand.v0.schema.json
src/crystal-strand-metabolism.mjs
tests/crystal-strand-metabolism.test.mjs
~~~

## Next brick

After this contract is validated, the next natural brick is a separate:

~~~text
STRAND_SEGMENTATION / DUST_CANDIDATE v0.1
~~~

It should identify candidate cut boundaries and construct traceable child-material proposals without deleting or mutating the parent strand.
