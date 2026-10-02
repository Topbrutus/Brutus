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

Supported digest modes in the crystal contract:

- `SHA256` — 64 hexadecimal characters;
- `GIT_SHA1` — 40 hexadecimal characters;
- `NONE` — digest must be null.

`NONE` means integrity was not supplied for that source; it must not be interpreted as verified integrity.

## Local source-byte integrity verifier

The optional local verifier is implemented separately from the crystal validator:

`src/crystal-source-integrity.mjs`

This separation is intentional. A crystal can remain a portable data object while source-byte verification is performed only when the caller explicitly supplies a local repository root.

For v0.1 the verifier resolves only these local source kinds:

- `BRUTUS_RECORD`;
- `BRUTUS_PROOF`.

And it independently verifies only:

`DIGEST_ALGORITHM = GIT_SHA1`

The Git blob digest is recomputed from exact file bytes using:

```text
SHA1("blob " + byte_length + NUL + bytes)
```

The verifier does not call Git or execute a process.

### Verdict semantics

`PASS`
: every source handled by this verifier was resolved locally and its recomputed digest matched.

`FAIL`
: at least one handled source failed integrity or local containment. Examples include digest mismatch, missing source, non-file source, unreadable source, path traversal or symlink escape outside the supplied repository root.

`INCONCLUSIVE`
: no handled source failed, but at least one source could not be verified by this local v0.1 verifier because its kind or digest algorithm is outside the supported scope.

An unsupported source can never produce a silent PASS.

### Repository boundary

The verifier performs both:
- lexical containment checking before file access;
- real-path containment checking after symlink resolution.

This prevents `../` traversal and symlink escape from being treated as valid local provenance.

The result is data-only and records:

```text
MUTATION_PERFORMED = false
NETWORK_USED = false
PROCESS_EXECUTION_USED = false
WORLD_ROUTER_INVOKED = false
PROOF_PROMOTION = false
```

Machine-readable result contract:

`contracts/crystal-source-integrity-result.v0.schema.json`

## Security boundary

The crystal validator rejects:

- executable values/functions;
- non-finite numbers;
- credential-shaped keys such as password, token, secret, API key or private key;
- unknown top-level fields;
- malformed typed source digests;
- payload/hash mismatch;
- executable crystals;
- automatic proof promotion.

The crystal runtime exposes validation and payload hashing only. It has no network access, process execution, World Router invocation, update/delete operation or source mutation.

The source-integrity verifier adds local file reads only. It does not add network access, process execution, routing authority, source mutation or proof promotion.

## First reference crystal

`examples/crystals/BRUTUS-CRYSTAL-QUEEN-PUBLIC-READ-0001.json`

It snapshots a small subset of the already recorded Queen public-read measurement and pins the existing Brutus record/proof blob SHAs.

The local source-integrity verifier recomputes those two Git blob SHAs from exact bytes.

This is intentionally conservative: the first crystal demonstrates preservation and verifiable local provenance, not a new execution capability.

## What v0.1 does not solve

- network-backed source verification;
- verification of external reports;
- live-ant routing authorization;
- universal semantic reconstruction of an external experiment;
- lifecycle or revocation of distributed crystals;
- proof truth evaluation;
- automatic publication;
- inter-universe authority.

Those remain separate contracts or future audited extensions.
