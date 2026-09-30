# ANCHOR-0001 / ASTRA STATION v0.1

Status: candidate implementation.

## Purpose

ASTRA STATION is Brutus's first fixed construction point around the locked Verso center.

It is **not Verso Core**.

It is the place where prototypes may be described, grouped and observed without turning navigation into source-code editing.

## Fixed identity

```text
ANCHOR_ID = ANCHOR-0001
NAME = ASTRA STATION
KIND = FIXED_PROTOTYPE_STATION
STATUS = ESTABLISHED
RETURN_POINT = YES
```

Relation:

```text
                  [ VERSO CORE ]
                DEFAULT_LOCKED
                      |
                 prepared card
                      |
                      v
                [ RESULT ]
                      |
                      v
            [ ANCHOR-0001 ]
             ASTRA STATION
             /     |      \
        prototype proof observation
```

## Safety boundary

At the anchor:

```text
VERSO_CORE_MUTATION = NO
WORLD_ROUTER_INVOCATION = NO
SOURCE_CODE_EXECUTION = NO
CREDENTIAL_STORAGE = NO
ROUTE_CREATION = NO
```

Prototype manifests are data-only.

A manifest may reference only CARD_ID values already registered in the prepared Verso Card Registry.

Unknown card:
`STOP`

Unknown manifest field:
`STOP`

## First established prototype

`BRUTUS-PROTOTYPE-QUEEN-CLOCK-BENCH-0001`

It references:

`BRUTUS-CARD-QUEEN-CLOCK-0001`

and the existing live proof:

`proofs/BRUTUS-PROOF-QUEEN-PUBLIC-READ-0001.json`

It is an observation bench only.

It does not invoke World Router and it does not authorize live ANT routing.

## Current persistence boundary

The v0.1 runtime keeps session prototype registrations in memory.

Durable prototype manifests live as data files in the repository.

This deliberately avoids inventing a mutable database before the storage/provenance contract is designed.
