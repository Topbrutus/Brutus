# Fourminizer Queen Crystal v0.1

Status: candidate.

## Purpose

Define the immutable birth crystal for the first Brutus founding queen:

```text
FOURMINIZER-QUEEN-0001
```

This object carries the queen's initial identity, Brutus Code pin, symbolic mathematical seed, pedigree, declared task vocabulary, receptors, tool ports, memory boundary and JEV -> Brutus handoff intent.

It is deliberately **not** the running queen.

The crystal is data-only. Runtime activation, movement, JEV transport, trace persistence and local-machine execution remain separate components.

---

## Reference object

Machine-readable contract:

`contracts/fourminizer-queen-crystal.v0.schema.json`

Runtime validator:

`src/fourminizer-queen-crystal.mjs`

Reference crystal:

`examples/fourminizer/FOURMINIZER-QUEEN-CRYSTAL-0001.json`

Reference identities:

```text
CRYSTAL_ID = BRUTUS-FOURMINIZER-QUEEN-CRYSTAL-0001
QUEEN_ID   = FOURMINIZER-QUEEN-0001
ANT_ID     = ANT-000000000001
ROLE       = FOURMINIZER_QUEEN
```

The ANT_ID remains compatible with the existing Brutus ant identifier namespace.

The queen identity is separate so the special founding role does not silently redefine the generic ant identity contract.

---

## Birth state

The immutable birth crystal starts with:

```text
BIRTH_STATE = DORMANT
```

The crystal itself never transitions to ACTIVE.

A future runtime may instantiate an active queen from a validated birth crystal under a separate audited contract.

---

## Brutus Code pin

The queen cannot silently change language.

The crystal pins:

```text
BRUTUS_CODE_SCHEMA = BRUTUS-CODE-MESSAGE-v0.1
BRUTUS_CODE_REF    = contracts/brutus-code.v0.schema.json
BRUTUS_CODE_BLOB_SHA
```

The reference crystal pins the Git blob SHA of the merged Brutus Code v0.1 schema.

CI recomputes the Git blob SHA from exact file bytes and compares it to the value stored in the queen crystal.

A future Brutus Code revision therefore requires an explicit queen-crystal migration or new version.

---

## Initial teacher

The first teacher is:

```text
TEACHER.ENTITY = @JEV
TEACHER.MODE = INITIAL_ONLY
TEACHER.NATURAL_LANGUAGE = false
```

This does not connect to the JEV API.

It only records the allowed teacher identity and communication boundary for the initial phase.

Invariant:

```text
JEV INSIDE QUEEN PROTOCOL
 -> BRUTUS CODE ONLY
```

---

## Handoff target

The birth crystal already records the intended future transition:

```text
HANDOFF.TARGET = @BRUTUS
HANDOFF.STATE = NOT_READY
HANDOFF.PRESERVE_MEMORY = true
HANDOFF.PRESERVE_IDENTITY = true
```

The crystal cannot declare itself ready.

Readiness must be established later by explicit runtime criteria.

The handoff changes the future decision engine, not the queen's identity or accumulated crystallized history.

---

## Mathematical code v0.1

The first crystal contains a minimal symbolic numeric code:

```text
SCHEMA = BRUTUS-MATH-CODE-v0.1
CODE_ID = MATH:FMIN-Q0001
TOKENS = [N:1]
EXECUTABLE = false
```

`N:1` is only the founding symbolic numeric seed for queen 0001.

It is **not** presented as a formula, theorem, proof or physical claim.

v0.1 permits only bounded Brutus numeric tokens in this field. More expressive mathematical structures require a later audited contract.

---

## Founder pedigree

The first queen is a founder:

```text
ROOT_Z = null
EVENT_ID = null
LINEAGE = [L:1]
GENERATION = 0
PARENT_ID = null
RECYCLE_COUNT = 0
```

Null `ROOT_Z` and `EVENT_ID` mean those runtime origins have not yet been assigned.

The birth crystal must not invent them.

Future runtime events may create new traceable objects derived from the founder, but they do not mutate this crystal.

---

## Task graph

v0.1 stores a declarative action vocabulary, not executable behavior:

```text
TASK_GRAPH.SCHEMA = BRUTUS-QUEEN-TASK-GRAPH-v0.1
TASK_GRAPH.MODE = DECLARATIVE_ONLY
TASK_GRAPH.MUTATES_ENGINE = false
```

Reference actions:

```text
READ
LEARN
SEE
REPORT
WAIT
```

Every task action must already exist in Brutus Code v0.1.

The crystal cannot invent a new verb.

---

## Receptors

The birth crystal declares receptors for:

```text
BRUTUS_CODE
TRACE
LOCAL_WORLD
PART
CRYSTAL
GATE_STATE
```

At minimum, every valid queen crystal must contain:

```text
BRUTUS_CODE
TRACE
LOCAL_WORLD
```

These are declared interfaces only. Their runtimes are separate.

---

## Tool ports

The first queen reserves:

```text
LOCAL_MACHINE
RECYCLE_BASIN
```

But the local machine is intentionally not bound yet:

```text
LOCAL_MACHINE_ID = null
LOCAL_MACHINE_STATE = UNBOUND
```

This prevents the queen crystal from pretending that `LOCAL_MACHINE v0.1` already exists.

When that contract is built, a separate binding/activation step can connect the validated machine.

---

## Selection and assembly boundary

```text
SELECTION_POLICY = FAIL_CLOSED
ASSEMBLY_POLICY = CONTRACT_REQUIRED
```

Unknown components or unsupported assembly rules cannot be accepted implicitly.

---

## Initial resource budget

The reference queen starts conservatively:

```text
MAX_ACTIONS_PER_CYCLE = 1
MAX_MESSAGE_ARGS = 16
MAX_MARKERS = 4
```

The message limits are pinned to Brutus Code v0.1.

The one-action initial cycle is a startup budget, not a permanent performance limit.

A later runtime contract can define controlled budget changes.

---

## Recycling

```text
RECYCLE_POLICY = PRESERVE_PEDIGREE
```

This carries forward the global Brutus invariant:

```text
RECYCLE != RESET
```

Nothing in the birth crystal is allowed to erase provenance when material is recycled.

---

## Memory boundary

```text
TRACE_WRITE = true
EXTERNAL_CRYSTALLIZED_READ_ONLY = true
RAW_EXTERNAL_READ = false
```

The queen is intended to leave traces.

But external Brutus does not receive arbitrary transient internal state.

The existing boundary remains:

```text
EXTERNAL_BRUTUS_READS = CRYSTALLIZED_MEMORY_ONLY
```

---

## Signature

The entire birth crystal, except the signature field itself, is canonicalized by recursively sorting object keys while preserving array order.

Then:

```text
SIGNATURE_H256 =
SHA256(JSON(canonical birth crystal without SIGNATURE_H256))
```

Method identifier:

```text
BRUTUS-CANONICAL-JSON-SHA256-v0.1
```

The signature protects the exact birth configuration from silent mutation.

It is an integrity signature, not a proof of truth.

---

## Authority boundary

The founding queen begins with:

```text
IMMUTABLE = true
EXECUTABLE = false
AUTO_PROOF_PROMOTION = false
GATE_AUTHORITY = false
ROUTING_AUTHORIZATION = UNDECIDED
```

Therefore the crystal cannot:

- execute arbitrary code;
- promote itself to proof;
- open L8-L13;
- authorize World Router;
- silently bind a local machine;
- silently connect to JEV;
- mutate Brutus engine code.

---

## Security boundary

The validator rejects:

- unknown top-level fields;
- non-data/executable values;
- non-finite numbers;
- credential-shaped keys such as token, password, secret, API key or private key;
- invalid identity formats;
- unsupported Brutus Code references;
- unknown task actions;
- unsupported math tokens;
- missing core receptors;
- missing local-machine port;
- premature machine binding;
- mutable/executable crystals;
- proof promotion;
- gate authority;
- routing authorization other than `UNDECIDED`;
- signature mismatch.

The runtime contains no network calls, process execution or World Router invocation.

---

## What v0.1 does not yet do

This contract does not provide:

- `TRACE v0.1` persistence;
- `LOCAL_WORLD_MODEL v0.1`;
- `LOCAL_MACHINE v0.1`;
- a JEV API adapter;
- queen activation;
- movement;
- component selection runtime;
- assembly runtime;
- recycling runtime;
- membrane transport;
- gate evaluation;
- JEV -> Brutus handoff execution.

Those remain later bricks.

---

## Next brick

After this crystal survives CI and review, the next intended contract is:

```text
TRACE v0.1
```

That trace contract will provide the first durable footprint left by Fourminizer-Reine actions.
