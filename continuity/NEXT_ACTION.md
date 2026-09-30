# NEXT ACTION — VERIFY PR #2 FINAL HEAD, THEN HOLD MERGE BOUNDARY

## Candidate

Branch:
`astra/queen-observation-ingress-v01-20260930`

Draft PR:
`#2`

Implemented:
- QueenObservationIngress v0.1;
- source reuse audit;
- BRUTUS-CARD-QUEEN-CLOCK-0001;
- Verso Queen clock adapter;
- fail-closed FRESH / STALE / UNKNOWN handling;
- identity and integrity guards;
- bounded retry/backoff;
- DEFAULT_LOCKED restoration.

## Immediate gate

1. observe full Brutus CI on the final PR head;
2. verify PR remains mergeable and main has not drifted incompatibly;
3. keep live ANT routing closed;
4. do not merge this integration blindly.

## After candidate integration

The next construction step is a real read-only provider binding that feeds existing Antmux `X72ObservationAdapter` envelopes into this card path without copying the observer.

Required runtime path:

```text
Queen Server
  -> existing X72ObservationAdapter
  -> ObservationEnvelope
  -> QueenObservationIngress
  -> BRUTUS-CARD-QUEEN-CLOCK-0001
  -> result/proof
  -> DEFAULT_LOCKED
  -> ANCHOR-0001
```

Still forbidden:
- Queen mutation;
- local tick invention;
- automatic World Router invocation;
- ANT live routing without explicit authorization;
- code modification initiated by a card/entity.

Preserve:
`LIVE_ROUTING = DENIED`
