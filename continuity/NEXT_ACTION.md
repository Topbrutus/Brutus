# NEXT ACTION — VERIFY QUEEN INGRESS, THEN CONNECT ONE READ-ONLY VERSO CARD

## Current candidate

Branch:
`astra/queen-observation-ingress-v01-20260930`

Purpose:
consume Antmux `X72ObservationAdapter` ObservationEnvelope frames without duplicating Queen network observation.

## Immediate gate

1. open a draft PR;
2. observe full Brutus CI on the branch head;
3. keep the PR unmerged until the candidate is reviewed;
4. do not open live ANT routing.

## After CI PASS

Build one minimal data-only Verso card whose only job is to request a Queen clock observation through the ingress.

Required lifecycle:

```text
DEFAULT_LOCKED
  -> CARD_APPLIED
  -> QueenObservationIngress
  -> verified read-only result
  -> RESULT_READY
  -> DEFAULT_LOCKED
  -> ANCHOR-0001
```

The card must not:
- call World Router;
- create or authorize an ANT;
- modify Queen;
- invent a tick;
- retry forever;
- use STALE / UNKNOWN / integrity mismatch as valid clock input.

## Preserve

`LIVE_ROUTING = DENIED`

until a separate explicit routing authorization contract exists.

Rule:
reuse proven source before inventing a second observer.
