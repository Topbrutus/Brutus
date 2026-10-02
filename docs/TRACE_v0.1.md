# Brutus TRACE v0.1

Status: candidate.

## Purpose

TRACE v0.1 is the first durable action footprint for the internal Brutus world.

It records **who acted, where, at which Queen tick, what Brutus Code action was used, which objects were involved, what result was recorded, and how that trace links to prior traces**.

A trace is evidence of a recorded action event. It is not automatically proof.

```text
TRACE != PROOF
TRACE != ROUTING_AUTHORITY
TRACE != GATE_OPEN
```

## Contract

- Schema: `contracts/brutus-trace.v0.schema.json`
- Validator: `src/brutus-trace.mjs`
- Reference fixture: `examples/traces/TRACE-FMIN-Q0001-0001.json`

Core fields:

```text
TRACE_ID
TRACE_CLASS
ANT_ID
ACTOR_CLASS
POSITION
TICK
CLOCK_AUTHORITY
ACTION
INPUT_OBJECTS[]
OUTPUT_OBJECTS[]
RESULT
SUCCESS_LEVEL
CONFIDENCE
PARENT_TRACE
MESSAGE_ID
PROOF_REF
SIGNATURE_METHOD
SIGNATURE_H256
```

## Clock rule

```text
CLOCK_AUTHORITY = QUEEN_SERVER_V0_2
LOCAL_TICK_INVENTION = NO
```

The trace validator accepts a non-negative safe integer tick, but the contract identifies Queen server authority as the source.

## Brutus Code action rule

`ACTION` must already exist in Brutus Code v0.1.

TRACE cannot invent a new action vocabulary.

## Object references

Inputs and outputs are typed symbolic references:

```text
P: part
C: crystal
L: lineage
G: gate
T: trace
M: machine
Z: marked-Z object
W: world/zone
A: ant-related object
```

Unknown free-form text is not admitted.

## Result fields

`RESULT` is one of:

```text
UNKNOWN
SUCCESS
FAILURE
PARTIAL
INCONCLUSIVE
```

`SUCCESS_LEVEL` and `CONFIDENCE` are integers from 0 to 100.

These numbers describe the trace record. They do not elevate it to proof.

## Chain

`PARENT_TRACE` is nullable.

When present, it points to the preceding trace identifier and allows a sequence of actions to be reconstructed.

A future ledger may add append-only chain enforcement. TRACE v0.1 only validates the individual immutable record.

## Brutus Code message link

`MESSAGE_ID` may point to the Brutus Code message that initiated or contextualized the action.

It is nullable because not every future trace must originate from a conversational exchange.

## Synthetic fixture boundary

The first repository example is explicitly:

```text
TRACE_CLASS = SYNTHETIC_FIXTURE
```

Its values demonstrate the contract only. It is not presented as a runtime measurement.

A live footprint must use:

```text
TRACE_CLASS = RUNTIME
```

and must be produced by a later audited runtime.

## Signature

The entire trace except `SIGNATURE_H256` is canonicalized by recursively sorting object keys while preserving array order.

Then:

```text
SIGNATURE_H256 =
SHA256(JSON(canonical trace without SIGNATURE_H256))
```

Method:

```text
BRUTUS-CANONICAL-JSON-SHA256-v0.1
```

This protects integrity. It does not prove that the reported event truly occurred.

## Authority boundary

Every v0.1 trace is fixed to:

```text
PROOF_REF = null
IMMUTABLE = true
EXECUTABLE = false
PROOF_CLAIM = false
GATE_AUTHORITY = false
ROUTING_AUTHORIZATION = UNDECIDED
```

Therefore a trace cannot self-promote to proof, open L8-L13, authorize routing or execute code.

## Relation to Fourminizer-Reine

The Queen crystal declares `TRACE_WRITE = true`.

TRACE v0.1 now defines the shape of that future footprint, but it still does not activate the Queen.

The first functional chain remains:

```text
FOURMINIZER-REINE
 -> BRUTUS CODE ACTION
 -> TRACE v0.1
 -> later: LOCAL_WORLD_MODEL
 -> later: LOCAL_MACHINE
```

## Next brick

After TRACE v0.1 survives CI and merge, the next intended contract is:

```text
LOCAL_WORLD_MODEL v0.1
```

That model will let the Queen represent SELF, POSITION, known objects, unknown zones and available traces without pretending to be omniscient.
