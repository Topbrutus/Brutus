# ASTRA CONTINUITY — 2026-10-02

Repository: Topbrutus/Brutus

Working directory:
`D:\Brutus-Aquarium-Live`

Branch:
`main`

Verified main HEAD before this continuity update:
`a6e05bf20fed1bd866d61359b99afdac6cc3cad6`

Verified `origin/main`:
`a6e05bf20fed1bd866d61359b99afdac6cc3cad6`

Working tree was clean before writing this checkpoint.

## Integrated through PR #48

The current main line now includes:

- PR #43 — Add Math Input Bus and Brotoculateur adapter v0.1
  - PR head: `ce9db1896b5c7a301d808c8f7d683a2a8fc3a780`
  - merge commit: `019cfc6868ae58d4812325d92bef81809930a0c2`
- PR #44 — Add Math Crystal Candidate v0.1
  - PR head: `36df424bf549e62eaad7074c4b22be20784fcfbb`
  - merge commit: `30def121bc32a345040dd2b660ca33c92f947b04`
- PR #45 — Add Fourmi math material admission v0.1
  - PR head: `de9beeb35cac3ddb4122b8cd3b7ba1f905c493c3`
  - merge commit: `5a3f1d0ced00fedc8ec1ca9064860c8e8869c758`
- PR #46 — Add fail-closed Fourmi math material move binding v0.1
  - PR head: `f8dafb8001c969d621e246a42e72fd321e45b74e`
  - merge commit: `818181df9f02f3de1bfcd8c3db70bfdc66a1fb39`
- PR #47 — Add live Fourmi transport authorization v0.1
  - PR head: `ab6a7281879f47223df96722b3e57572e6125ae8`
  - merge commit: `28c088f2d2bc3a6fb36b8e066ed7990ff8e92cfc`
- PR #48 — Add one-step live transport runtime v0.1
  - PR head: `cf00b3fa90d1f71733267e3957b22cf00fcc8457`
  - merge commit / current main: `a6e05bf20fed1bd866d61359b99afdac6cc3cad6`

## Math Input Bus / Brotoculateur boundary

PR #43 established the first external math input bus.

Live source path:

```text
Brotoculateur
  -> GET http://127.0.0.1:8778/api/status
  -> BROTOCULATEUR_INPUT_ADAPTER
  -> BRUTUS-MATH-INPUT-PACKET-v0.1
  -> Brutus
```

Core invariants:

```text
SOURCE_PASS != BRUTUS_PROOF
SOURCE_AUTHENTICATED != UNIVERSAL_THEOREM
INPUT_PACKET != EXECUTION_AUTHORITY
PROOF_REF = null
EXECUTABLE = false
AUTO_PROOF_PROMOTION = false
ROUTING_AUTHORIZATION = UNDECIDED
ACCESS_MODE = READ_ONLY
```

No Queen tick is invented for a local source snapshot.

Default ingestion remains:

```text
BOUND_TO_QUEEN = false
QUEEN_TICK = null
CLOCK_AUTHORITY = null
```

The common packet is already generic enough for future INPUT #2, #3, #4 without changing the Brutus core contract.

## Current Math Input Bus limitation

The current Brotoculateur `/api/status` source exposes aggregate formula/proof counts, one sample canonical formula and the latest ZEL capsule.

It does not expose every canonical formula as a complete item-scoped record through that endpoint.

Therefore:

```text
34 CANONICAL FORMULAS REPORTED
!=
34 ITEM-SCOPED FORMULAS INGESTED INTO BRUTUS
```

The natural extension is a bounded read-only full formula export carrying, per item:

```text
canonical expression
formula hash
source status
support count / refs
counter-test count / refs
replay status
bindings
provenance
```

The Brutus common packet should not need a core redesign for that extension.

## One-step live Fourmi transport runtime

PR #48 added a fail-closed one-step transport runtime.

Core safety rule:

```text
UNKNOWN ACTION OUTCOME != SAFE TO RETRY
```

The runtime becomes permanently spent before calling the external authorized move adapter.

An adapter `ACCEPTED` result does not prove movement.

A movement is only admitted after observing:

- a strictly later Queen tick;
- the same source;
- the same ANT/material;
- attachment still present;
- exact observed position equal to the authorized destination.

After success the grant is consumed:

```text
SINGLE_USE = true
CONSUMED = true
ROUTING_AUTHORIZATION = CONSUMED
```

Evidence boundary remains:

```text
MOVED != MATH_PROOF
MATERIAL_MOVE != LEFT_WHEEL_INGRESS
PROOF_REF = null
WHEEL_INGRESS_AUTHORIZATION = false
```

No production movement is claimed at this checkpoint.

The real source/actuator adapter is not yet connected, and the observed X72 source still does not provide the complete ANT position + attachment + move-action contract required for production transport.

## Live Brotoculateur observation at checkpoint

Observed at:
`2026-10-02T20:13:21-04:00`

Run:
`run-20261002T194025-561792Z-continuity`

State:
`RUNNING`

Live counters:

- processed packets: 305,990
- round: 78
- canonical formulas: 34
- authenticated formula scopes: 26
- authenticated relation expressions: 27
- testing formulas: 4
- candidate formulas: 0
- rejected formulas: 3
- proof replays: 644,217
- invalid proofs: 0

ZEL bridge:

- registered formulas: 1
- status: `EXACT_WITNESS_REPLAY`
- latest formula id: `F1`
- relation: `z_P(21^k)=4*21^(k-1)`
- provenance hash: `8999c203856cc171821fd59adc0a42db40a667d5acd7b39b37278accf9ea8045`

At this checkpoint no new ZEL formula beyond F1 had crossed the bridge.

The four ZEL->ZEL degenerate relations were in TESTING, not authenticated, because only one independent compositional counter-test was available.

## Brotoculateur authentication gate state

The Brotoculateur now separates:

```text
CANDIDATE -> TESTING -> AUTHENTICATED
                     -> REJECTED
```

The discovery bell is tied to authenticated semantic formula scopes, not raw canonical candidate creation.

Known rejected local DIGIT_SUM fits remain evidence that the gate is eliminating local overfit.

Current proof replay invariant at checkpoint:

```text
PROOFS_INVALID = 0
```

## Persistent architectural boundaries

Do not collapse source evidence into Brutus proof.

Do not invent Queen ticks.

Do not make external input packets executable.

Do not auto-promote proof references.

Do not retry an unknown external movement outcome automatically.

Do not claim live Fourmi movement until exact before/after observations satisfy the runtime contract.

Do not treat source-authenticated formula counts as universal mathematical proof.

## Workstream ownership

This Astra instance owns Brutus architecture, contracts, provenance, continuity, integration and invariant enforcement.

Separate research/runtime workstreams may produce math or ZEL material, but Brutus must receive those results through explicit provenance boundaries.

The completed q=47 L8 campaign should not be repeated by default.
