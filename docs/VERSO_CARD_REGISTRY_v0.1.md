# Verso Card Registry v0.1

Verso accepts **prepared cards only**.

The registry is the source of truth for the static contract of every card known to Brutus.

File:
`registry/verso-cards.v0.json`

Runtime loader:
`src/verso-card-registry.mjs`

## Core rule

```text
KNOWN CARD_ID + MATCHING PREPARED CONTRACT
  -> Guard may evaluate VALUES

UNKNOWN CARD_ID
  -> STOP

KNOWN CARD_ID + ALTERED STATIC CONTRACT
  -> STOP
```

## Static fields bound by the registry

- VERSION
- ANCHOR
- SOURCE
- TARGET
- VERSO
- READ
- MEASURE
- RETURN_DATA
- WRITE
- CODE_CHANGE
- CREATE_ROUTE
- EXPECTED_OUTPUT
- PROOF_REQUIRED
- AFTER

An entity cannot alter those fields and keep the same CARD_ID.

## Mutable values

Only keys listed in `MUTABLE_VALUES` for that registered card may change.

Runtime configuration may **narrow** this list, but may never expand it.

## Registered cards

### BRUTUS-CARD-0001

Purpose:
read the Brutus source registry.

Mutable:
`query.organ_id`

### BRUTUS-CARD-QUEEN-CLOCK-0001

Purpose:
read one verified Queen clock observation through the read-only X72 chain.

Mutable:
none.

## Security consequence

A model connected to Verso is not asked to invent the next API call or edit code to proceed.

It must possess/use a card already present in the registry.

The absence of a prepared card is a valid terminal result:

`UNKNOWN_CARD => STOP`
