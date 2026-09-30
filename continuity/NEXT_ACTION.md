# NEXT ACTION — VERIFY ASTRA STATION, THEN ADD A READ-ONLY STATION CARD

## Candidate branch

`astra/anchor-0001-station-v01-20260930`

## Immediate gate

Run full Brutus CI.

Must prove:
- ANCHOR-0001 is established;
- it is a fixed return point;
- Verso Core mutation is false;
- World Router invocation is false;
- first Queen clock bench registers;
- unknown card references are rejected;
- wrong anchor is rejected;
- executable/non-data manifest content is rejected;
- duplicate prototype IDs are rejected;
- no network/process execution exists in the station runtime.

## After CI

Add one prepared read-only card:

`BRUTUS-CARD-ASTRA-STATION-STATUS-0001`

Purpose:
allow an AI at Verso to ask only:

- where is my fixed return point?
- which prototypes are registered?
- what is their status?

The card must not register, modify or execute a prototype.

Cycle:

```text
DEFAULT_LOCKED
  -> prepared station-status card
  -> read ASTRA STATION snapshot
  -> result
  -> DEFAULT_LOCKED
  -> ANCHOR-0001
```

Preserve:
`LIVE_ROUTING = DENIED`
