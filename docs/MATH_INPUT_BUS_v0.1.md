# Math Input Bus / Brotoculateur Adapter v0.1

Status: candidate.

## Purpose

Create the first extensible external mathematical input path for Brutus.

v0.1 deliberately separates:

~~~text
SOURCE-SPECIFIC ADAPTER
        |
        v
BRUTUS-MATH-INPUT-PACKET-v0.1
        |
        v
future MATH CRYSTAL
~~~

The common packet is not specific to Brotoculateur.

Future programs can provide additional adapters while preserving the same Brutus-side ingestion boundary.

## Input #1: Brotoculateur

The first adapter consumes the existing local endpoint:

~~~text
GET http://127.0.0.1:8778/api/status
~~~

The probe is read-only.

It does not:

- POST;
- PUT;
- PATCH;
- DELETE;
- write files;
- control the Brotoculateur;
- restart the source process;
- alter ZELSTEREOS;
- invent Queen ticks.

## Common packet

Schema:

~~~text
BRUTUS-MATH-INPUT-PACKET-v0.1
~~~

Contract:

~~~text
contracts/math-input-packet.v0.schema.json
~~~

Core runtime:

~~~text
src/math-input-bus.mjs
~~~

A packet contains:

~~~text
PACKET_ID
SOURCE
SOURCE_SNAPSHOT_H256
SUMMARY
ITEMS
INGESTION
PROOF_REF
PACKET_H256
~~~

## Source identity

The Brotoculateur adapter records:

~~~text
SYSTEM = BROTOCULATEUR
ADAPTER = BROTOCULATEUR_INPUT_ADAPTER
ADAPTER_VERSION = 0.1
SOURCE_RUN_ID
SOURCE_ENDPOINT = /api/status
ACCESS_MODE = READ_ONLY
SOURCE_STATE
~~~

The exact selected source snapshot is canonically SHA-256 hashed into:

~~~text
SOURCE_SNAPSHOT_H256
~~~

This allows two source observations to be distinguished even when they come from the same long-running run.

## Summary layer

The normalized summary currently records:

~~~text
CANONICAL_FORMULAS
AUTHENTICATED_FORMULAS
TESTING_FORMULAS
REJECTED_FORMULAS
CANDIDATE_FORMULAS

TRACES_TOTAL

PROOFS_TOTAL
PROOFS_VALID
PROOFS_INVALID

RECONSTRUCTED_SUPPORTS
FAILED_SUPPORTS

TRACKER_SOURCES
RECYCLE_EMITTED
~~~

These values are source-reported observations.

They are not independently promoted to Brutus proof claims.

## Math items

v0.1 supports bounded item kinds:

~~~text
FORMULA_OBSERVATION
FORMULA_CAPSULE
RELATION_OBSERVATION
~~~

Each item carries:

~~~text
ITEM_ID
KIND
EXPRESSION
SOURCE_STATUS
BINDINGS
EVIDENCE
PROVENANCE
~~~

## Brotoculateur sample formula

The current /api/status endpoint exposes one sample canonical formula.

The adapter records it as:

~~~text
KIND = FORMULA_OBSERVATION
SOURCE_STATUS = OBSERVED_CANONICAL_SAMPLE
~~~

Important boundary:

The endpoint also exposes a global last trace and global last proof.

Those records are not guaranteed to belong to sample_formula.

Therefore v0.1 intentionally does not attach them to the sample item.

For that item:

~~~text
SOURCE_TRACE_REF = null
SOURCE_PROOF_REF = null
SUPPORT_COUNT = 0
TEST_COUNT = 0
REPLAY_STATUS = NOT_ITEM_SCOPED
~~~

Global source counts remain available in packet SUMMARY / provenance.

This prevents false formula-to-proof associations.

## ZELSTEREOS capsule through Brotoculateur

The current live Brotoculateur also exposes its latest ZELSTEREOS PUBLIC_SAFE capsule.

That capsule is normalized as a distinct:

~~~text
FORMULA_CAPSULE
~~~

Source fields such as:

~~~text
formula_id
relation
source_commit
source_status
source_mode
source_read_only
test_count
global_error_exact
observed_parameter
observed_parameter_value
observed_value
provenance_hash
compiler_kind
executable
~~~

are preserved as bounded provenance/evidence where available.

An upstream source may report that its capsule is executable.

That does not make the Brutus packet executable.

Invariant:

~~~text
UPSTREAM_EXECUTABLE != BRUTUS_EXECUTABLE
~~~

## Authentication boundary

Brotoculateur currently reports statuses including authenticated, testing and rejected formulas.

Brutus preserves those source states.

It does not reinterpret:

~~~text
SOURCE_AUTHENTICATED
~~~

as:

~~~text
BRUTUS_PROOF
~~~

Every math input packet fixes:

~~~text
PROOF_REF = null
EXECUTABLE = false
AUTO_PROOF_PROMOTION = false
ROUTING_AUTHORIZATION = UNDECIDED
~~~

Therefore:

~~~text
SOURCE PASS != BRUTUS PROOF
SOURCE AUTHENTICATED != UNIVERSAL THEOREM
INPUT PACKET != EXECUTION AUTHORITY
~~~

## Queen clock boundary

A local external source snapshot has no right to invent a Brutus Queen tick.

Default ingestion is:

~~~text
BOUND_TO_QUEEN = false
QUEEN_TICK = null
CLOCK_AUTHORITY = null
~~~

A future Brutus runtime may explicitly bind an already-built packet at a real Queen tick.

Only then:

~~~text
BOUND_TO_QUEEN = true
CLOCK_AUTHORITY = QUEEN_SERVER_V0_2
QUEEN_TICK = authoritative tick
~~~

## Multiple future inputs

The common packet was tested with a synthetic second source.

A future adapter can therefore use the same packet for:

~~~text
ZELSTEREOS direct
another formula generator
counter-test engine
Pell/L8 engine
cube generator
future symbolic engine
~~~

without adding Brotoculateur-specific fields to Brutus core.

Conceptually:

~~~text
INPUT #1 BROTOCULATEUR --\
INPUT #2 ZEL DIRECT ------\
INPUT #3 FUTURE ENGINE ----> MATH INPUT BUS -> MATH CRYSTAL
INPUT #4 CUBE ENGINE -----/
...
~~~

## Current live limitation

The current Brotoculateur /api/status endpoint reports:

- total canonical formula count;
- total authenticated/testing/rejected counts;
- one sample canonical formula;
- one latest ZEL capsule;
- aggregate trace/proof/support data.

It does not expose the complete item-scoped records for every canonical formula in that endpoint.

Therefore v0.1 does not claim to ingest every canonical formula expression individually.

A future source-side read-only export endpoint can expose a bounded formula collection with item-scoped:

~~~text
canonical expression
formula hash
support refs/count
proof/replay refs
status
bindings
provenance
~~~

The Brutus common packet does not need to change for that extension.

## Live verification

The adapter was exercised against the actual local Brotoculateur on port 8778.

A live packet was successfully created with:

~~~text
SOURCE = BROTOCULATEUR
ACCESS_MODE = READ_ONLY
BOUND_TO_QUEEN = false
~~~

The live observation contained:

~~~text
34 canonical formulas
26 source-authenticated formulas
382155 traces
382155 source-valid proof replays
0 source-invalid proof replays
~~~

at that observation instant.

Two normalized items were present:

~~~text
FORMULA_OBSERVATION
  (2*A<INPUT>)=B<OUTPUT>

FORMULA_CAPSULE
  z_P(21^k)=4*21^(k-1)
  SOURCE_PASS
  18 source tests
  EXACT_WITNESS_REPLAY
~~~

These live counts are an observation of a running process, not constants in the contract.

## Security / CPU boundary

Core files:

~~~text
src/math-input-bus.mjs
src/brotoculateur-input-adapter.mjs
~~~

contain no:

- fetch/network call;
- WebSocket;
- timer loop;
- random sampling;
- process execution.

Network access is isolated to the explicit manual tool:

~~~text
tools/brotoculateur-input-probe.mjs
~~~

The probe accepts only:

~~~text
http://127.0.0.1/.../api/status
http://localhost/.../api/status
~~~

and performs GET only with redirects rejected.

## Files

~~~text
contracts/math-input-packet.v0.schema.json
src/math-input-bus.mjs
src/brotoculateur-input-adapter.mjs
tools/brotoculateur-input-probe.mjs
tests/math-input-bus.test.mjs
docs/MATH_INPUT_BUS_v0.1.md
~~~

## Next brick

Once this packet contract is merged, the next natural layer is:

~~~text
MATH_INPUT_PACKET
        |
        v
MATH_CRYSTAL_CANDIDATE
~~~

That layer should crystallize one item with exact source pedigree while preserving:

~~~text
SOURCE_STATUS
SOURCE_SNAPSHOT_H256
PACKET_H256
ITEM_ID
expression
bindings
evidence/provenance
PROOF_REF = null
~~~

Only after that should mathematical crystals enter Fourmi transport / wheel-body processing.
