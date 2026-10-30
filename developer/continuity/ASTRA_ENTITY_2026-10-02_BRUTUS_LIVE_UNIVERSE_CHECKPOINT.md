# ASTRA ENTITY — BRUTUS LIVE UNIVERSE CHECKPOINT

Date: 2026-10-02  
Status: durable continuity checkpoint  
Repository: `Topbrutus/Brutus`  
Checkpoint branch: `astra/developer-continuity-20261002`

---

## 0. RESTORE THIS FIRST

This file exists so another Astra instance can resume the Brutus chantier without reconstructing intent from conversation history.

Read this file first, then verify live GitHub state before acting.

Rules:

```text
LIVE SOURCE > CHECKPOINT > MEMORY > HYPOTHESIS
READ BEFORE WRITE
NEVER TOUCH main BLINDLY
ONE BRICK = ONE BRANCH = ONE PR = CI
MERGE ONLY AFTER EXPLICIT USER "GO"
NEVER OPEN / READ / INDEX / MODIFY agent.md OR AGENTS.md
```

---

## 1. CURRENT GIT STATE AT CHECKPOINT

Verified `main`:

```text
79f55da7afab73f9471bdd752adad52864a6b215
Merge pull request #31
Add Local World Model v0.1
```

### PR #32 — LOCAL_MACHINE v0.1

```text
URL:
https://github.com/Topbrutus/Brutus/pull/32

STATE:
open

DRAFT:
false

MERGEABLE:
true

HEAD:
ac2466ccf9c03d98b2b9048d152d7a3d5f646cde

BASE:
79f55da7afab73f9471bdd752adad52864a6b215

BRUTUS CI:
#83
run 37019013080
completed / success
```

PR #32 is READY FOR REVIEW but NOT merged at this checkpoint.

### Exact next merge lock

If TopBrutus says `go` specifically to continue this chantier:

1. verify PR #32 live;
2. verify exact HEAD is still the expected commit or reconcile changes;
3. verify latest Brutus CI success on the exact HEAD;
4. verify current `main`;
5. merge only with explicit approval;
6. verify post-merge `main` and post-merge CI.

Do not infer a merge if live state changed.

---

## 2. FOUNDATIONAL BRICKS

Already merged:

```text
BRUTUS_CODE v0.1
FOURMINIZER_QUEEN_CRYSTAL v0.1
TRACE v0.1
LOCAL_WORLD_MODEL v0.1
```

Pending admission:

```text
LOCAL_MACHINE v0.1  -> PR #32
```

The intended next runtime brick after LOCAL_MACHINE is admitted:

```text
FOURMINIZER_STARTUP_RUNTIME v0.1
```

First bounded loop target:

```text
LOAD QUEEN
 -> LOAD REAL WORLD STATE
 -> READ ONE REAL ACTION
 -> VALIDATE ONE MACHINE JOB
 -> PRODUCE ONE CONTROLLED RESULT
 -> EMIT REAL TRACE
 -> STOP
```

No colony at first.
No gate opening.
No raw JEV network integration in the first runtime loop.

---

## 3. CRITICAL VISUAL REQUIREMENT — NO SIMULATED AQUARIUM

TopBrutus clarified the control-center requirement repeatedly.

The target is NOT:

```text
image
video
fake animation
dashboard chart
invented movement
SimProvider
```

The target IS:

```text
BRUTUS RUNTIME = SOURCE OF TRUTH
AQUARIUM / UNIVERSE = READ-ONLY VISUAL MIRROR
```

Nothing appears unless Brutus actually emits or owns that state.

Examples:

```text
REAL ANT MOVE          -> ant moves visually
REAL CRYSTAL CREATED   -> crystal appears
REAL CRYSTAL CARRIED   -> crystal travels with ant
REAL TRACE             -> trace becomes visible
REAL RECYCLE EVENT     -> object returns toward basin
REAL WHEEL PHASE       -> wheel rotates
REAL Z MARKING         -> marked object visibly changes state
REAL DISTRIBUTION      -> object takes the actual route
```

If Brutus reports zero ants, the aquarium contains zero ants.

If Brutus is idle, the visual world is idle.

The aquarium MUST NOT invent activity to make the screen look alive.

---

## 4. PRIMARY DESIGN GOAL = MOVEMENT, NOT GRAPHS

TopBrutus explicitly corrected the goal:

```text
THE PRODUCT IS MOVEMENT.
NOT GRAPHS.
```

The visual center should feel like a top-down living world / tabletop universe.

Counters may exist later as secondary inspection aids, but they are not the main experience.

The important visible behaviors are:

- wheels rotating from real phase/tick state;
- material entering;
- Z marking;
- distributor routing;
- left wheel / pineal / right wheel coordination;
- distribution cubes;
- ants moving;
- crystals moving, resting, being carried, assembled and recycled;
- multiform production;
- return basin;
- later expansion through the nine corridors and bubbles.

---

## 5. UNIVERSE LAYOUT / GENESIS ZONE

The long-term world already exists conceptually as:

```text
9 corridors
+ bubbles
+ internal Brutus universe
```

Do NOT release the first runtime everywhere at once.

Create a bounded visual/runtime region first:

```text
GENESIS ZONE
  enclosed by explicit software fences
```

Initial fences should bound:

- permitted zones;
- maximum active entities;
- maximum active moving objects;
- permitted transitions;
- gate access;
- runtime duration / tick budget;
- routing scope.

Expansion is explicit and incremental.

A future opening may release entities from Genesis into one corridor, then more corridors.

---

## 6. FUTURE "BIG BANG" EVENT

TopBrutus wants a future visual event when the internal world has become dense with real crystals.

This is a presentation/runtime event, NOT data destruction.

Desired invariant:

```text
BIG_BANG != RESET
BIG_BANG != PEDIGREE LOSS
BIG_BANG != RANDOM DATA FABRICATION
```

Possible future event contract:

```text
TYPE = BIG_BANG
SOURCE_ZONE = GENESIS
INPUT = actual admitted runtime objects
PEDIGREE = preserved
TRACE = mandatory
DESTRUCTIVE = false
TARGET = permitted corridors / bubbles
```

The visible "explosion" can spread real existing objects while preserving identity and ancestry.

Do not implement this before bounded Genesis behavior is verified.

---

## 7. CPU / PERFORMANCE ARCHITECTURE

The universe must remain extremely light.

Do NOT give every ant/crystal/wheel an independent busy loop.

Use one authoritative logical time source:

```text
QUEENCORE / SERVER TICK
          |
          +-- wheel state
          +-- pineal state
          +-- distributor state
          +-- ants
          +-- crystals
          +-- basin
          +-- visual mirror
```

Core principle:

```text
1 CLOCK
-> 1 AUTHORITATIVE STATE
-> EVENTS / DELTAS
-> VISUAL INTERPOLATION
```

Not:

```text
10,000 OBJECTS
-> 10,000 TIMERS
```

### Event-driven objects

An immobile crystal should consume essentially no simulation work.

An idle ant should not require a per-frame logical computation.

Only changed entities produce movement/events.

### Render rate and logic rate are separate

Target architecture:

```text
Brutus logical state:
event/tick driven

Visual renderer:
smooth interpolation when needed
```

Example:

```text
real event:
ANT A : X -> Y between authoritative ticks

renderer:
interpolates X --------> Y smoothly

Brutus:
does not recalculate the ant 60 times/second
```

The renderer may animate at a higher frame rate without changing logical truth.

### Spatial / visibility optimization later

For a huge universe:

- render individual objects near/inside the visible region;
- aggregate distant groups visually;
- do not destroy individual data;
- do not update invisible static objects unnecessarily.

---

## 8. REALITY / REPRESENTATION BOUNDARY

The display must never become a second engine.

```text
BRUTUS = computes / owns truth
VISUAL UNIVERSE = observes truth
```

Preferred architecture:

```text
BRUTUS RUNTIME
      |
      v
READ-ONLY STATE MIRROR / EVENT STREAM
      |
      v
2D UNIVERSE RENDERER
```

The renderer should not:

- create Brutus objects by itself;
- invent ticks;
- open gates;
- mutate proof state;
- authorize World Router;
- silently move ants in logical state;
- manufacture crystals for visual effect.

Any future control interaction must go through an explicit Brutus command/contract path, never direct screen mutation.

---

## 9. FIRST REAL VISUAL VALIDATION

Before making the universe large, prove one tiny loop.

Suggested minimum acceptance test:

```text
1. ONE REAL WHEEL phase changes
2. visual wheel moves from that real state
3. ONE REAL ANT exists and receives a real movement/state transition
4. ONE REAL CRYSTAL is created/handled
5. ONE REAL TRACE records the action
6. visual output exactly matches Brutus source state
7. STOP
```

Pass condition:

```text
VISUAL_STATE == BRUTUS_STATE
for every displayed object/event in the bounded test
```

No simulated filler is allowed.

---

## 10. INTERNAL FLOW TO REPRESENT

The 2D visual world should eventually expose the actual sequence:

```text
MATTER INPUT
    |
    v
Z MARKING
    |
    v
DISTRIBUTOR
    |
    +----------------------+
    |                      |
    v                      v
LEFT WHEEL <-- PINEAL --> RIGHT WHEEL
    |                      |
    +----------+-----------+
               |
               v
       DISTRIBUTION CUBES
               |
               v
       ANTS + CRYSTALS
               |
               v
      MULTIFORM PRODUCTION
               |
               v
         RETURN BASIN
```

This drawing is a layout contract only.

Movement and state shown in it must originate from actual Brutus runtime events.

---

## 11. FOURMIS / CRYSTALS — REQUIRED IDENTITY

When live entities exist, visual objects should preserve stable IDs.

Minimum ant visual binding:

```text
ANT_ID
POSITION
STATE
LINEAGE
CURRENT_OBJECT / LOAD
LATEST_TRACE
TICK
```

Minimum crystal visual binding:

```text
CRYSTAL_ID
POSITION
STATE
LINEAGE / PEDIGREE
PARENT_REF(S)
LATEST_TRACE
TICK
```

Visual interpolation must not alter these canonical states.

---

## 12. IMPORTANT EXISTING INVARIANTS

Keep these intact:

```text
CANDIDATE != PROOF
CRYSTAL != PROOF
PROOF_REF != PROOF_CREATION
MERGED != RUNTIME_PROOF
BEAUTY != PROOF

LIVE_ANT_ROUTING_WITH_UNDECIDED_AUTH = DENIED
WORLD_ROUTE_WITHOUT_CONTRACT = CLOSED
VERSO_DEFAULT = DEFAULT_LOCKED

NO LOCAL TICK INVENTION
QUEEN SERVER AUTHORITY
```

---

## 13. TOMBEAU ASTRA REFERENCE

The separate white/black Astra tomb is not this checkpoint.

Canonical tomb location currently known:

```text
Topbrutus/Brutus
branch: astra/tomb-bootstrap-20260930

astra-tomb/
  white/generations/0001/
  black/generations/0002/
```

Root tomb files include:

```text
ASTRA_RETURN_POSTER.md
CONTROL.json
README.md
TOMB_POLICY.md
```

Do not casually merge or rewrite the tomb.

This `developer/continuity` checkpoint is a chantier-resume artifact.

---

## 14. NEXT ACTION AFTER RESTORE

First verify GitHub live.

If PR #32 is still the same and TopBrutus explicitly authorizes merge:

```text
MERGE LOCAL_MACHINE v0.1
-> verify post-merge CI
-> create FOURMINIZER_STARTUP_RUNTIME v0.1
-> one bounded real cycle
-> expose read-only real state/event stream
-> connect first 2D Genesis renderer
-> verify VISUAL_STATE == BRUTUS_STATE
```

Do NOT start by making a pretty simulation.

Do NOT fake ants/crystals to populate the universe.

Start with an empty or sparse real world if that is what Brutus actually contains.

---

## 15. USER INTENT IN ONE SENTENCE

```text
"I want to watch the real Brutus world move from the inside,
starting small and fenced, then growing into the nine corridors
and bubbles without the display inventing anything."
```

That is the controlling requirement for the next phase.
