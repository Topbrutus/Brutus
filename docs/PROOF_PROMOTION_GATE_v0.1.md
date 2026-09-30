# Proof Promotion Gate v0.1

Status: candidate.

## Purpose

Link a real reviewed proof artifact to an existing counter-test RESULT without allowing the RESULT to promote itself.

The gate verifies four independent facts:

1. the source RESULT already exists in the ASTRA STATION ledger;
2. the proof artifact exists locally under `proofs/`;
3. the artifact bytes match the expected SHA-256 exactly;
4. an explicit review status says `APPROVED`.

Only then does it create a separate `PROOF_REF` record.

## Required boundary

```text
RESULT
  -> REVIEW
  -> EXISTING PROOF ARTIFACT
  -> SHA-256 MATCH
  -> PROOF_REF RECORD
```

Never:

```text
PASS
  -> PROOF
```

## Source verdict

The source result must be either:
- PASS
- FAIL

INCONCLUSIVE and ERROR results cannot enter proof promotion directly.

This allows a reviewed proof artifact to support either a successful claim or a rigorous counterexample/failure result.

## Artifact boundary

`PROOF_REF` must resolve beneath the repository's `proofs/` directory.

Path traversal is rejected.

The exact file bytes are hashed with SHA-256 and compared with `EXPECTED_PROOF_H256`.

## What the gate does not claim

The gate does not determine mathematical or scientific truth.

It proves only that:
- a specific result record exists;
- a specific artifact exists;
- its hash matches;
- a review approval was explicitly recorded;
- the resulting link is traceable.

The quality and scope of the proof artifact still require human/technical review.
