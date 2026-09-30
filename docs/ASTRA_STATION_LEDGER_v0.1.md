# ASTRA STATION — Append-only Ledger v0.1

Status: candidate.

## Purpose

Give ANCHOR-0001 a trace surface without turning the station into an editor or router.

The ledger stores **data records only** and chains them with SHA-256.

## Record types

- OBSERVATION
- RESULT
- PROOF_REF
- NOTE

Every record belongs to:
- ANCHOR-0001;
- a prototype already registered in the Astra Station runtime;
- optionally a prepared Verso CARD_ID.

## Hash chain

Each append creates:

```text
SEQUENCE
PREVIOUS_H256
RECORD
ENTRY_H256
```

`ENTRY_H256` hashes the canonical entry body.

This makes ordering and accidental mutation detectable inside a ledger instance.

## Append-only boundary

The v0.1 API exposes:
- append
- get
- list
- verify
- snapshot

It exposes no:
- update
- delete
- execute
- route
- network transport

## Credential boundary

Credential-shaped data keys are rejected, including password, token, secret, api_key, private_key, authorization and cookie forms.

The ledger is not a secret store.

## First record

`BRUTUS-RECORD-QUEEN-PUBLIC-READ-0001`

references the already proven Queen public read:

`proofs/BRUTUS-PROOF-QUEEN-PUBLIC-READ-0001.json`

The record does not rerun the experiment. It preserves a trace reference at the fixed anchor.

## Persistence boundary

The runtime ledger is in-memory in v0.1.

Durable record examples may be committed as repository data.

A persistent append-only store is intentionally deferred until provenance, locking and concurrent-writer rules are designed.
