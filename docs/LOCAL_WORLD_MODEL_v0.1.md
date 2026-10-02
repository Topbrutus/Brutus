# Local World Model v0.1

Status: candidate.

## Purpose

LOCAL_WORLD_MODEL v0.1 defines the smallest bounded map that Fourminizer-Reine can use to represent her immediate internal world.

It records only what is locally known.

It does **not** grant omniscience.

```text
KNOWN = OBSERVED / EXPLICITLY PROVIDED
UNOBSERVED = UNKNOWN
OMNISCIENT = false
```

The first repository object is a synthetic fixture. It demonstrates the contract; it is not a live perception event.

---

## Files

Schema:

`contracts/local-world-model.v0.schema.json`

Validator:

`src/local-world-model.mjs`

Reference fixture:

`examples/world/LOCAL-WORLD-MODEL-FMIN-Q0001-0001.json`

Tests:

`tests/local-world-model.test.mjs`

---

## Core identity

The reference model belongs to:

```text
QUEEN_ID = FOURMINIZER-QUEEN-0001
ANT_ID = ANT-000000000001
ROLE = FOURMINIZER_QUEEN
```

The current local position is expressed as a typed world reference:

```text
POSITION = W:START
```

A position may never simultaneously appear in `UNKNOWN_ZONES`.

---

## Time boundary

The model records the tick at which the local state was observed:

```text
OBSERVED_AT_TICK
CLOCK_AUTHORITY = QUEEN_SERVER_V0_2
```

The validator accepts a non-negative safe integer, but it does not invent a tick.

The Brutus invariant remains:

```text
LOCAL_TICK_INVENTION = NO
```

---

## Contract pins

The model is pinned to the exact merged contract bytes for:

```text
BRUTUS_CODE v0.1
FOURMINIZER_QUEEN_CRYSTAL v0.1
TRACE v0.1
```

Each pin contains:

```text
REF
BLOB_SHA
```

Tests recompute each Git blob SHA from the real repository file bytes.

A silent change in one of those contracts therefore breaks the model tests instead of changing its meaning invisibly.

---

## Known objects

`KNOWN_OBJECTS` contains only typed Brutus references.

Allowed families are:

```text
P: part
C: crystal
L: lineage
G: gate
T: trace-like object reference
M: machine
Z: marked-Z object
W: world / zone
A: ant-related object
```

The array is bounded and duplicate-free.

---

## Known traces

`KNOWN_TRACES` contains explicit TRACE identifiers:

```text
TRACE-...
```

A local model may know that a trace exists without converting that trace into proof.

```text
KNOWN_TRACE != PROOF
```

---

## Known paths

A path becomes `KNOWN_PATHS` only when its state is recorded as observed:

```text
OBSERVED_OPEN
OBSERVED_BLOCKED
```

v0.1 intentionally has no `GUESSED_OPEN` state.

This prevents a speculative route from silently becoming a known route.

A path also cannot loop from a zone directly to itself in this contract.

---

## Unknown zones

Unobserved regions are explicit:

```text
UNKNOWN_ZONES[]
```

The reference fixture begins with:

```text
W:NORTH
W:SOUTH
W:EAST
W:WEST
```

These are synthetic labels for the startup fixture.

They are not a claim that the future internal world must use a physical compass geometry.

---

## Available parts

`AVAILABLE_PARTS` is deliberately stricter than `KNOWN_OBJECTS`.

Every available part must already exist in `KNOWN_OBJECTS`.

```text
AVAILABLE_PARTS ⊆ KNOWN_OBJECTS
```

Therefore the model cannot manufacture an available component merely by naming it in the available-parts list.

---

## Future gate state

The model may represent only future gates:

```text
G:L8
G:L9
G:L10
G:L11
G:L12
G:L13
```

For v0.1 their local model state is limited to:

```text
CLOSED
UNKNOWN
```

There is deliberately no `OPEN` value in LOCAL_WORLD_MODEL v0.1.

A future gate opening must come from the separate gate-validation architecture, not from the Queen's map.

---

## Local machine

The map knows that a local-machine interface is expected, but the machine does not exist yet as an admitted runtime object.

Therefore:

```text
LOCAL_MACHINE.ID = null
LOCAL_MACHINE.STATE = UNBOUND
```

This state remains frozen until `LOCAL_MACHINE v0.1` gets its own contract.

---

## Objectives

The local model may carry a bounded objective set:

```text
OBSERVE
READ_TRACE
IDENTIFY_PART
WAIT
RETURN_BASIN
```

These values describe current intent.

They are not executable code.

---

## Uncertainty

Uncertainty is explicit:

```text
LEVEL = 0..100
BASIS = LOCAL_OBSERVATION_ONLY
UNKNOWN_ZONE_COUNT
```

The count must exactly equal the current number of `UNKNOWN_ZONES`.

The numeric level is metadata for the model. It is not a probability of truth and not a proof score.

The startup fixture uses maximal uncertainty because it intentionally begins with a very small known world.

---

## Parent model

`PARENT_MODEL` is nullable.

A later model snapshot can point back to a previous model ID.

This provides a basis for reconstructing local-world evolution without mutating old snapshots.

v0.1 validates individual snapshots only. A future ledger may enforce append-only model ancestry.

---

## Synthetic versus runtime

The fixture uses:

```text
SNAPSHOT_CLASS = SYNTHETIC_FIXTURE
```

A real observed model must be emitted by a later audited runtime as:

```text
SNAPSHOT_CLASS = RUNTIME
```

The presence of `RUNTIME` in the schema does not itself prove that a given runtime observation occurred.

---

## Signature

Every model snapshot is signed for integrity with:

```text
BRUTUS-CANONICAL-JSON-SHA256-v0.1
```

The signature is:

```text
SHA256(
  JSON(
    recursively sorted object keys,
    preserving array order,
    excluding SIGNATURE_H256
  )
)
```

Integrity is not truth.

```text
SIGNATURE_MATCH != PROOF
```

---

## Authority boundary

Every valid v0.1 local model is constrained to:

```text
PROOF_REF = null
IMMUTABLE = true
EXECUTABLE = false
PROOF_CLAIM = false
GATE_AUTHORITY = false
ROUTING_AUTHORIZATION = UNDECIDED
OMNISCIENT = false
RAW_EXTERNAL_READ = false
```

Therefore the map cannot:

- execute code;
- open a gate;
- authorize World Router;
- self-promote to proof;
- read raw external transient state;
- pretend that unobserved territory is known.

---

## First startup picture

The synthetic reference model gives Fourminizer-Reine a minimal starting picture:

```text
SELF = known
POSITION = W:START
P:184 = known and available
L:7 = known
TRACE-FMIN-Q0001-0001 = known
L8 -> L13 = UNKNOWN
4 surrounding fixture zones = UNKNOWN
LOCAL_MACHINE = UNBOUND
UNCERTAINTY = maximal startup value
```

That is enough to test the shape of the map without pretending the Queen has already moved or perceived a live world.

---

## Relation to previous bricks

```text
BRUTUS_CODE v0.1
        |
        v
FOURMINIZER_QUEEN_CRYSTAL v0.1
        |
        v
TRACE v0.1
        |
        v
LOCAL_WORLD_MODEL v0.1
```

We now have the language, the immutable founder identity, the footprint format and the bounded local map.

None of these four objects alone is the running Fourminizer-Reine.

---

## Next brick

The next intended contract is:

```text
LOCAL_MACHINE v0.1
```

That is the first piece that will define the Queen's local fabrication interface: admitted components, matrix/cube input, assembly request, output pedigree and recycle handoff.

The machine contract must remain separate from the immutable Queen crystal and from the local-world model.
