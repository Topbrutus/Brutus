# CURRENT STATE — BRUTUS — 2026-10-02

Repository: Topbrutus/Brutus

Verified main HEAD:
`78fa58c3f85ab8a2fd8f37f34216dc3aab0806e3`

Integrated through:
- PR #22 — exact L8 q=47 rank witness
- PR #23 — candidate crystallization contract v0.1

Post-merge Brutus CI:
- run #62 — SUCCESS

## Workstream ownership

This Astra instance owns Brutus architecture, contracts, provenance, continuity, integration and invariant tests.

Separate Astra workstreams handle:
- the remaining L8 door research;
- GameZEL / ZELSTEREOS.

Do not duplicate those active research tracks inside this Brutus workstream unless their results are later imported through an explicit provenance boundary.

## L8 counter-test status already integrated

Overall verdict: PASS

- CT-01 = PASS — L8 valid as stated for q odd prime and r prime divisor of Q_q.
- CT-02 = PASS — exact Q data preserved; Q_47 has one explicit factor and remains partially factored.
- CT-03 = PASS — explicit prime factor of Q_47 independently verified with exact Pell rank 2209 = 47^2.
- CT-04 = PASS — bounded scan remains 4,853 candidates / 0 exact witnesses.

Exact q=47 witness:

`r = 424675575059690484579658261789171649`

`z_P(r) = 2209 = 47^2`

Q_47 remaining cofactor:
- 792 digits
- SHA-256: `978b7253d1665b4c59168fed591b9844db1faf9020b675776ef6a274ba36f570`
- factorization status: PARTIAL

The completed q=47 campaign must not be repeated by default.

## Crystallization v0.1 integrated

PR #23 added the first candidate crystallization contract.

Integrated files:
- `contracts/crystal.v0.schema.json`
- `src/crystal-contract.mjs`
- `tests/crystal-contract.test.mjs`
- `examples/crystals/BRUTUS-CRYSTAL-QUEEN-PUBLIC-READ-0001.json`
- `docs/CRYSTALLIZATION_v0.1.md`

Core crystal invariants:

```text
PORTABLE = JSON data only
TRACEABLE = typed SOURCE_REFS
RECONSTRUCTIBLE = canonical payload + PAYLOAD_H256
IMMUTABLE = true
EXECUTABLE = false
AUTO_PROOF_PROMOTION = false
```

Canonical reconstruction method:

`BRUTUS-CANONICAL-JSON-SHA256-v0.1`

The validator rejects:
- executable values;
- non-finite numbers;
- credential-shaped keys;
- malformed source digests;
- payload/hash mismatch;
- unknown top-level fields;
- executable crystals;
- automatic proof promotion.

The crystal runtime contains no network, process execution or World Router invocation path.

Reference crystal:

`BRUTUS-CRYSTAL-QUEEN-PUBLIC-READ-0001`

It preserves a small already-proven Queen public-read measurement and points to existing Brutus record/proof blob SHAs. It does not create a new proof or routing authority.

Verification before merge:
- focused crystallization tests: 13/13 PASS
- PR CI runs #59, #60 and #61: SUCCESS
- final PR head: `ff5db03d4e8346c9b0990111957c5376393f5081`

Verification after merge:
- main CI run #62: SUCCESS

## Evidence boundary

```text
CANDIDATE != PROOF
CRYSTAL != PROOF
PROOF_REF != PROOF_CREATION
MERGED != RUNTIME_PROOF
BEAUTY != PROOF
```

Current safety state:

```text
PROOF_REF promotion = MANUAL / REVIEWED ONLY
AUTO_PROOF_PROMOTION = false
LIVE_ANT_ROUTING = DENIED
WORLD_ROUTE_WITHOUT_CONTRACT = CLOSED
VERSO_DEFAULT = DEFAULT_LOCKED
```

## Open crystallization limitation

The v0.1 crystal validator verifies the syntax and shape of typed source digests, but it does not yet independently recompute a local source file's Git blob SHA and compare it to a crystal SOURCE_REF.

Therefore:

```text
SOURCE_REF DIGEST DECLARED != SOURCE BYTES REVERIFIED
```

That gap is the next Brutus-specific hardening target.
