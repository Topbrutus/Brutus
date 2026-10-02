# Brutus Code v0.1

Status: candidate.

## Purpose

Brutus Code is the closed symbolic protocol used by the internal Brutus world.

Its first use is the controlled exchange between **JEV**, acting as the initial teacher, and **FOURMINIZER_QUEEN_0001**.

Brutus Code is deliberately not natural language. It contains only identifiers, actions, typed arguments, markers and explicitly admitted emoji signals.

The protocol is data-only and fail-closed.

---

## Boundary

```text
UNKNOWN_TOKEN = REJECT
NATURAL_LANGUAGE_INTERNAL = FORBIDDEN
EXECUTABLE = false
PROOF_CLAIM = false
GATE_AUTHORITY = false
```

A Brutus Code message cannot:

- execute code;
- invoke World Router;
- authorize live ant routing;
- promote itself to proof;
- open a gate;
- add new vocabulary implicitly;
- carry free-form natural-language text.

Vocabulary extension requires a new audited protocol version.

---

## Canonical message

Machine-readable contract:

`contracts/brutus-code.v0.schema.json`

Runtime validator/parser:

`src/brutus-code.mjs`

A message contains:

```text
SCHEMA
VERSION
MESSAGE_ID
SENDER
RECIPIENT
ACTION
ARGS[]
MARKERS[]
SIGNAL
NATURAL_LANGUAGE
EXECUTABLE
PROOF_CLAIM
GATE_AUTHORITY
```

Reference object:

`examples/brutus-code/BRUTUS-CODE-MESSAGE-FOURMINIZER-0001.json`

---

## Canonical line grammar

The human-visible compact form is:

```text
SENDER RECIPIENT ACTION [ARGS...] [MARKERS...] [SIGNAL]
```

Example:

```text
@FMIN-Q0001 @JEV QUERY P:184 L:7 ? 🟡
```

Teacher example:

```text
@JEV @FMIN-Q0001 TEACH P:184 P:033 C:001 + 🟣
```

Only one ASCII space is valid between tokens in the canonical line parser.

Markers and the optional signal must appear after arguments.

---

## Entities

Entity identifiers use:

```text
@NAME
```

Examples:

```text
@JEV
@FMIN-Q0001
@ANT-0123456789AB
```

They are protocol identities only. They do not imply authorization.

---

## Actions v0.1

Closed action vocabulary:

```text
SEE
QUERY
TAKE
DROP
MOVE
JOIN
SPLIT
TEST
RECYCLE
FOLLOW
TEACH
LEARN
REPORT
WAIT
STORE
READ
BUILD
COMPARE
```

Unknown actions are rejected.

---

## Typed arguments

### Object / world references

```text
P:ID  part
C:ID  crystal
L:ID  lineage
G:ID  gate
T:ID  trace
M:ID  local machine
Z:ID  marked-Z object
W:ID  world/zone
A:ID  ant-related object
```

Examples:

```text
P:184
C:001
L:7
G:L8
T:0001
M:FMIN-01
```

### Integers

```text
N:42
N:-3
N:0
```

### Booleans

```text
B:0
B:1
```

### States

Closed v0.1 states:

```text
S:UNKNOWN
S:READY
S:CLOSED
S:OPEN
S:PASS
S:FAIL
S:INCONCLUSIVE
S:ACTIVE
S:IDLE
S:LOCKED
```

There is no free-form TEXT argument in v0.1.

---

## Markers

```text
?  query / uncertainty
!  attention
+  favorable
-  unfavorable
=  confirmed relation/result
~  approximate
#  trace/reference emphasis
*  discovery/new item
```

A `QUERY` must explicitly carry `?` or the `❓` signal.

---

## Emoji signals

The v0.1 signal vocabulary is:

```text
🟢  favorable / continue
🟡  uncertain / verify
🔴  reject / stop candidate
🔵  new observation
🟣  interesting combination
🔁  recycle / retry
🔒  closed / unavailable
🔓  gate-ready-looking signal only
❓  information missing / query
✅  local test/result accepted by the current step
```

These symbols are protocol signals, not claims of human emotion.

### Critical gate rule

`🔓` does **not** open a gate.

It can mean only that a message reports a candidate that appears ready for gate evaluation.

```text
SIGNAL = 🔓
GATE_AUTHORITY = false
```

Actual gate transition remains separate:

```text
CANDIDATE
 -> COUNTER_TEST
 -> GATE_VALIDATOR
 -> CLOSED / OPEN
```

---

## JEV boundary

JEV is the first external teacher for the Fourminizer-Reine.

Inside this protocol:

```text
JEV_OUTPUT != PROOF
JEV_OUTPUT != GATE_OPEN
JEV_OUTPUT_NOT_IN_BRUTUS_CODE = REJECT
```

JEV may teach, query, compare, report and propose combinations using the closed vocabulary.

JEV does not gain engine mutation, proof promotion or gate authority.

---

## Fourminizer-Reine first exchange

First candidate message:

```text
@FMIN-Q0001 @JEV QUERY P:184 L:7 ? 🟡
```

Interpretation for developers:

- sender: Fourminizer-Reine;
- recipient: JEV;
- action: query;
- observed/target part: `P:184`;
- lineage context: `L:7`;
- explicit uncertainty marker: `?`;
- uncertainty signal: `🟡`.

A valid reply might be:

```text
@JEV @FMIN-Q0001 TEACH P:184 P:033 C:001 + 🟣
```

The runtime accepts the symbols. Semantic usefulness must still be tested by Brutus.

---

## Parser invariants

The v0.1 runtime rejects:

- unknown top-level fields;
- unknown actions;
- unknown argument token forms;
- unknown markers;
- unknown emoji signals;
- more than 16 arguments;
- more than 4 markers;
- duplicate markers;
- non-canonical line whitespace;
- markers/signals in argument position;
- `QUERY` without explicit uncertainty;
- executable or non-data values;
- any claim of proof authority;
- any claim of gate authority.

The validator returns a deeply frozen copy.

---

## What v0.1 intentionally does not solve

- full sentence-level semantics;
- automatic vocabulary growth;
- natural-language translation inside the ant world;
- JEV API transport;
- Fourminizer crystal definition;
- local world model;
- local machine actions;
- trace persistence;
- gate validation;
- proof truth evaluation;
- membrane transport;
- Brutus takeover from JEV.

Those are subsequent contracts.

---

## Next contract

After this protocol survives CI and review, the next intended brick is:

```text
FOURMINIZER_QUEEN_CRYSTAL v0.1
```

It will reference a pinned Brutus Code version rather than redefining the language.
