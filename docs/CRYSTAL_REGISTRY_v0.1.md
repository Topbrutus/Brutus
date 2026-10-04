# Crystal Registry v0.1

Status: candidate implementation.

## Purpose

Create the first explicit boundary between an admissible crystal and a registered crystal.

```text
VALID CRYSTAL
  !=
VERIFIED CRYSTAL
  !=
ADMISSIBLE CRYSTAL
  !=
REGISTERED CRYSTAL
```

Registration is not proof promotion and does not authorize transport, routing, execution, wheel ingress or mutation.

## Input boundary

The registry requires both:

1. the complete validated crystal;
2. the exact Crystal Admission result for that crystal.

The registry independently checks that the admission remains bound to:

- the same `CRYSTAL_ID`;
- the same `CRYSTAL_H256`;
- the same `PAYLOAD_H256`;
- the same evidence label;
- the complete declared source count;
- `STATUS = ADMISSIBLE`;
- `SOURCE_INTEGRITY_VERDICT = PASS`;
- all admission side-effect flags remain false.

A caller cannot register a crystal by supplying only an ID or a status string.

## Registry entry

Each successful registration creates an immutable entry carrying at least:

```text
CRYSTAL_ID
CRYSTAL_H256
PAYLOAD_H256
ADMISSION_H256
EVIDENCE_LABEL
SOURCE_REFS
PROOF_REFS
VERIFIED_SOURCE_COUNT
STATUS = REGISTERED
REGISTERED_AT_QUEEN_TICK
REGISTERED_AT_UTC
```

The time fields are nullable by design. The registry does not invent a Queen tick or wall-clock observation. If the caller has no authoritative value, the field stays `null`.

`PROOF_REFS` are preserved provenance references only. Their presence does not create or promote proof.

## Append-only structure

Registry entries are ordered and hash-chained:

```text
SEQUENCE
PREVIOUS_H256
ENTRY_H256
```

The registry exposes lookup and verification operations but no update or delete operation.

A repeated registration of the exact same crystal and exact same admission is idempotent and returns the existing entry. A reused `CRYSTAL_ID` with a different complete identity or admission is rejected.

## Security boundary

Every registered entry fixes:

```text
REGISTRY_WRITE_PERFORMED = true
MUTATION_PERFORMED = false
NETWORK_USED = false
PROCESS_EXECUTION_USED = false
WORLD_ROUTER_INVOKED = false
PROOF_PROMOTION = false
```

`REGISTRY_WRITE_PERFORMED = true` means only that an entry was appended to this registry runtime. It does not mean that the source crystal or any external repository was modified.

## Machine-readable contract

```text
contracts/crystal-registry-entry.v0.schema.json
```

Runtime:

```text
src/crystal-registry.mjs
```

## v0.1 lifecycle scope

This step introduces exactly one registry state:

```text
REGISTERED
```

It deliberately does not yet implement lifecycle transitions such as:

```text
SUPERSEDED
REVOKED
```

Those belong to the next lifecycle step and must remain explicit rather than being silently inferred.

## Not solved by v0.1

- persistent disk/database storage;
- distributed registry synchronization;
- lifecycle transition policy;
- revocation policy;
- supersession policy;
- network-backed verification;
- proof truth evaluation;
- proof promotion;
- live routing authorization;
- wheel ingress authorization;
- machine execution.
