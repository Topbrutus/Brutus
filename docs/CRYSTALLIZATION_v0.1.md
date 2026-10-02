# Crystallization Contract v0.1

Status: candidate.

## Purpose

Define the smallest Brutus object that can preserve a result as a portable, traceable and reconstructible data artifact without turning storage into execution or proof promotion.

A crystal is a sealed data container. It is not an agent, route, program, theorem or authority grant.

## Core invariants

```text
PORTABLE = JSON data only
TRACEABLE = at least one typed SOURCE_REF
RECONSTRUCTIBLE = canonical payload + PAYLOAD_H256
IMMUTABLE = true
EXECUTABLE = false
AUTO_PROOF_PROMOTION = false
```

The canonical payload digest is:

```text
SHA256(JSON(recursively sort object keys; preserve array order))
```

Method identifier:

```text
BRUTUS-CANONICAL-JSON-SHA256-v0.1
```

## Evidence boundary

`EVIDENCE_LABEL` reuses the Brutus proof-policy vocabulary:

- SOURCE
- MESURE
- CALCUL
- CANDIDAT
- HYPOTHESE
- INTERPRETATION

The label describes the payload's evidence class. It does not upgrade the payload.

`PROOF_REFS` may point to existing proof artifacts, but a crystal cannot create or self-promote a proof. `AUTO_PROOF_PROMOTION` is fixed to `false`.

## Provenance

Every crystal requires at least one `SOURCE_REF`.

Each source reference declares:

- KIND;
- REF;
- DIGEST_ALGORITHM;
- DIGEST.

Supported digest modes in v0.1:

- `SHA256` — 64 hexadecimal characters;
- `GIT_SHA1` — 40 hexadecimal characters;
- `NONE` — digest must be null.

`NONE` means integrity was not supplied for that source; it must not be interpreted as verified integrity.

## Security boundary

The validator rejects:

- executable values/functions;
- non-finite numbers;
- credential-shaped keys such as password, token, secret, API key or private key;
- unknown top-level fields;
- malformed typed source digests;
- payload/hash mismatch;
- executable crystals;
- automatic proof promotion.

The crystal runtime exposes validation and payload hashing only. It has no network access, process execution, World Router invocation, update/delete operation or source mutation.

## First reference crystal

`examples/crystals/BRUTUS-CRYSTAL-QUEEN-PUBLIC-READ-0001.json`

It snapshots a small subset of the already recorded Queen public-read measurement and pins the existing Brutus record/proof blob SHAs.

This is intentionally conservative: the first crystal demonstrates preservation, not a new capability.

## What v0.1 does not solve

- live-ant routing authorization;
- universal semantic reconstruction of an external experiment;
- lifecycle or revocation of distributed crystals;
- proof truth evaluation;
- automatic publication;
- inter-universe authority.

Those remain separate contracts or future audited extensions.
