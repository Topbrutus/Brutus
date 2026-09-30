# NEXT ACTION — HARDEN VERSO WITH PREPARED CARD REGISTRY

## Proven before this step

Public Queen read proof:
`proofs/BRUTUS-PROOF-QUEEN-PUBLIC-READ-0001.json`

Run:
`36750712934 = SUCCESS`

The temporary proof workflow must not remain as a permanent runtime dependency.

## Guard gap to close

Current Guard behavior:
- validates card fields;
- validates read-only flags;
- validates mutable VALUES allow-list.

Missing invariant:
- a valid-looking but unknown CARD_ID can still pass shape validation.

Required rule:

```text
KNOWN PREPARED CARD -> MAY ENTER GUARD
UNKNOWN CARD_ID     -> STOP
KNOWN ID + ALTERED STATIC CONTRACT -> STOP
```

## Card Registry v0.1

Register at minimum:

1. `BRUTUS-CARD-0001`
   - ASTRA_STATION -> BRUTUS_REGISTRY
   - mutable: `query.organ_id`

2. `BRUTUS-CARD-QUEEN-CLOCK-0001`
   - ASTRA_STATION -> QUEEN_CLOCK
   - mutable: none

Registry policy must bind:
- VERSION;
- ANCHOR;
- SOURCE;
- TARGET;
- READ;
- MEASURE;
- RETURN_DATA;
- EXPECTED_OUTPUT;
- allowed mutable VALUES.

The entity/card cannot expand its own policy.

## Preserve

`LIVE_ROUTING = DENIED`

No World Router invocation is part of Card Registry hardening.
