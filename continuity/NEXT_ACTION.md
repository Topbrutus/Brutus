# NEXT ACTION — VERIFY REAL X72 PROVIDER CANDIDATE

## Branch

`astra/queen-observation-ingress-v01-20260930`

Draft PR:
`#2`

## Immediate verification

Observe Brutus CI on the provider commit.

Required checks:
- full `npm test` passes;
- provider tests pass;
- Verso returns DEFAULT_LOCKED;
- provider remains STATE_ONLY;
- no World Router invocation;
- no shell execution;
- no embedded credentials;
- main is not overwritten.

## Runtime proof still required later

CI proves the provider contract with injected process output.

It does **not** prove a physical Queen endpoint is reachable from the deployment environment.

A later runtime proof must use:

```text
existing Antmux checkout
+ existing X72ObservationAdapter
+ authorized/readable Queen base URL
+ BRUTUS-CARD-QUEEN-CLOCK-0001
```

and record:
- Antmux source HEAD;
- Queen entity_id;
- Queen tick;
- FRESH status;
- integrity_match;
- Verso trace ending DEFAULT_LOCKED.

## Preserve

`LIVE_ROUTING = DENIED`

No ANT route is opened by this work.
