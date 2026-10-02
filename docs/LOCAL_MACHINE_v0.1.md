# Local Machine v0.1

Status: candidate.

## Purpose

LOCAL_MACHINE v0.1 defines the bounded fabrication interface attached to the future Fourminizer-Reine runtime.

It does not decide what the Queen wants to build and it does not execute arbitrary code.

~~~text
QUEEN DECIDES
    |
    v
VALIDATED JOB
    |
    v
LOCAL MACHINE CONTRACT
    |
    v
SEPARATE RUNTIME
    |
    v
TRACE REQUIRED
~~~

## Files

Machine schema: contracts/local-machine.v0.schema.json

Job schema: contracts/local-machine-job.v0.schema.json

Validator: src/local-machine.mjs

Reference machine: examples/local-machine/LOCAL-MACHINE-FMIN-01.json

Reference job: examples/local-machine/LOCAL-MACHINE-JOB-FMIN-Q0001-0001.json

Tests: tests/local-machine.test.mjs

## Machine identity

~~~text
MACHINE_ID = M:FMIN-01
OWNER.QUEEN_ID = FOURMINIZER-QUEEN-0001
OWNER.ANT_ID = ANT-000000000001
STATE = DORMANT
~~~

The machine contract exists, but the machine is not yet active.

The existing Queen crystal and Local World Model remain immutable historical objects that still say the machine is unbound.

A later explicit binding/activation contract must connect them.

## Contract pins

LOCAL_MACHINE v0.1 pins the exact merged bytes of:

~~~text
BRUTUS_CODE v0.1
FOURMINIZER_QUEEN_CRYSTAL v0.1
TRACE v0.1
LOCAL_WORLD_MODEL v0.1
~~~

Each dependency uses REF plus BLOB_SHA. Tests recompute the Git blob SHA from repository bytes, so silent dependency drift fails CI.

## Initial admitted material

~~~text
BRIN
FIBRE
TIMBRE
BLOC
CRISTAL
FRAGMENT
~~~

This is the first bounded material catalog. Later versions may add CHEVEU, PLAQUE, ANNEAU, RESEAU or composite structures, but they are not silently admitted into v0.1.

## Admitted operations

~~~text
ASSEMBLE
RECYCLE_HANDOFF
~~~

ASSEMBLE describes creation of a new planned object from known input parts.

RECYCLE_HANDOFF explicitly marks a job intended to return toward the recycling path.

The recycle flag must match the operation exactly.

## Input policy

~~~text
MAX_PARTS = 16
KNOWN_ONLY = true
PRESERVE_PEDIGREE = true
~~~

The machine cannot fabricate from unnamed or free-form matter.

A future runtime must ensure each input is actually available in the active local world state. This validator checks structural validity; live inventory reconciliation remains a runtime responsibility.

## Matrix / cube workspace

~~~text
MODE = MATRIX_OR_CUBE
DIMENSIONS_ALLOWED = [2, 3]
MAX_SIDE = 7
MAX_CELLS = 343
~~~

The 343-cell limit corresponds to 7^3.

A job must place every input exactly once. No two parts may occupy the same coordinate, and no coordinate may lie outside the declared workspace.

## Machine job

A job contains:

~~~text
JOB_ID
MACHINE_ID
ANT_ID
WORLD_MODEL_ID
TICK
CLOCK_AUTHORITY
OPERATION
INPUTS[]
LAYOUT
OUTPUT_PLAN
RECYCLE_HANDOFF
TRACE_REQUIRED
~~~

The job is data, not executable code.

## Input parts

Each input contains PART_ID plus PART_TYPE.

Example:

~~~text
P:184  BLOC
P:033  TIMBRE
~~~

Part identifiers must be unique inside one job.

## Layout

The synthetic fixture uses:

~~~text
P:184 -> [0,0]
P:033 -> [1,0]
~~~

The validator checks dimension count, side length, coordinate range, one placement per input, no duplicate placement, no overlap and bounded capacity.

## Output plan

The job does not claim an output already exists. It declares a planned new object with:

~~~text
OUTPUT_ID
OUTPUT_TYPE
PARENT_PARTS[]
PEDIGREE_RULE
~~~

The output identifier must be new.

The parent set must equal the complete input set.

~~~text
PEDIGREE_RULE = DERIVE_ALL_INPUT_PARENTS
RECYCLE != RESET
~~~

This prevents a fabricated form from silently losing ancestry.

## Reference synthetic assembly

~~~text
INPUT
  P:184 = BLOC
  P:033 = TIMBRE

PLAN
  OUTPUT_ID = P:NEW001
  OUTPUT_TYPE = CRISTAL
  PARENTS = [P:184, P:033]
~~~

This is only a contract fixture.

~~~text
JOB_CLASS = SYNTHETIC_FIXTURE
EXECUTABLE = false
~~~

No runtime fabrication is claimed.

## Trace requirement

Every admitted future runtime job must emit a trace:

~~~text
TRACE_REQUIRED = true
~~~

Intended chain:

~~~text
LOCAL_WORLD_MODEL
  -> QUEEN DECISION
  -> LOCAL_MACHINE_JOB
  -> SEPARATE RUNTIME
  -> OUTPUT
  -> TRACE
  -> UPDATED LOCAL_WORLD_MODEL
~~~

The current brick defines machine and job contracts only.

## Clock authority

~~~text
CLOCK_AUTHORITY = QUEEN_SERVER_V0_2
~~~

The machine does not invent local ticks.

## Authority boundary

Machine specification:

~~~text
IMMUTABLE = true
EXECUTABLE = false
PROOF_CLAIM = false
GATE_AUTHORITY = false
ROUTING_AUTHORIZATION = UNDECIDED
~~~

Job:

~~~text
PROOF_REF = null
EXECUTABLE = false
PROOF_CLAIM = false
GATE_AUTHORITY = false
ROUTING_AUTHORIZATION = UNDECIDED
~~~

Neither the machine nor a job can execute arbitrary code, open L8-L13, authorize World Router, self-promote to proof, bypass TRACE or erase pedigree.

## After merge

The five foundational bricks will be:

~~~text
BRUTUS_CODE
FOURMINIZER_QUEEN_CRYSTAL
TRACE
LOCAL_WORLD_MODEL
LOCAL_MACHINE
~~~

At that point the contracts required for a first bounded startup runtime exist.

## Next brick

Proposed next step:

~~~text
FOURMINIZER_STARTUP_RUNTIME v0.1
~~~

Target first loop:

~~~text
LOAD QUEEN
 -> LOAD WORLD
 -> READ ONE ACTION
 -> VALIDATE ONE JOB
 -> PRODUCE ONE CONTROLLED RESULT
 -> EMIT TRACE
 -> STOP
~~~

One cycle only. No colony yet. No JEV network connection yet. No gate opening yet.
