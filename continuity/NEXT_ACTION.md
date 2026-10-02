# NEXT ACTION — VERIFY CRYSTAL SOURCE INTEGRITY

Brutus main now contains Crystallization Contract v0.1.

Current main HEAD at this checkpoint:

`78fa58c3f85ab8a2fd8f37f34216dc3aab0806e3`

Post-merge CI run #62 is SUCCESS.

## Next Brutus brick

Build the smallest local source-integrity verifier for crystals.

Goal:

A crystal that declares a local Brutus source with:

```text
DIGEST_ALGORITHM = GIT_SHA1
```

must be independently checkable against the actual source file bytes using the Git blob object rule:

```text
sha1("blob " + byte_length + "\0" + bytes)
```

## Required behavior

1. Validate the crystal first with the existing v0.1 validator.
2. Accept an explicit repository root supplied by the caller.
3. Only resolve repository-relative source paths that are intended to be local Brutus artifacts.
4. Reject path traversal or escape outside the supplied repository root.
5. Recompute the Git blob SHA-1 from exact file bytes.
6. Compare the computed SHA with the declared SOURCE_REF digest.
7. Return a data-only verification result.
8. Do not mutate the crystal or source.
9. Do not use network access.
10. Do not execute processes.
11. Do not invoke World Router.
12. Do not upgrade evidence or create PROOF_REF.

## First exact test target

Reference crystal:

`examples/crystals/BRUTUS-CRYSTAL-QUEEN-PUBLIC-READ-0001.json`

Its local source refs currently declare:

- `examples/records/BRUTUS-RECORD-QUEEN-PUBLIC-READ-0001.json`
  - Git blob SHA: `04b8a74da278f9027d0bc2528ba60325e7feccc9`
- `proofs/BRUTUS-PROOF-QUEEN-PUBLIC-READ-0001.json`
  - Git blob SHA: `2c4d29b967d250787f89110e9c36e19738b32baf`

The next implementation must recompute and confirm both values from file bytes.

## Required counter-tests

At minimum:
- valid local source digest -> PASS;
- one-byte source tamper -> FAIL;
- wrong declared digest -> FAIL;
- missing source -> FAIL;
- path traversal attempt -> FAIL;
- unsupported source kind for local resolution -> explicit non-verification, never silent PASS;
- validator/runtime contains no fetch, exec, spawn, fork or World Router route call.

## Stop conditions

Do not:
- build a crystal registry yet;
- add publication;
- modify Verso;
- open live-ant routing;
- import L8 door research;
- modify GameZEL/ZELSTEREOS;
- add network-backed source verification.

First make local source-byte integrity exact and green.

After that passes full Brutus CI, reconsider the next brick.
