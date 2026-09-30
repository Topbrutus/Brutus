# Experiment Intake Bench v0.1

Status: candidate.

## Purpose

Give ASTRA STATION a place to receive results from external experiments without immediately changing Verso, creating a new route, or promoting claims to proof.

Prototype:

`BRUTUS-PROTOTYPE-EXPERIMENT-INTAKE-0001`

Mode:

`PASSIVE_INTAKE`

## Core rule

```text
INCOMING RESULT
  -> qualify source
  -> preserve evidence level
  -> append trace to ASTRA STATION ledger
  -> later counter-test / proof linkage
```

Not:

```text
INCOMING RESULT
  -> assume true
  -> edit Verso
  -> create route
  -> canonize law
```

## First intake records

### ZELSTEREOS 369 / 396

Stored as:

`BRUTUS-RECORD-ZELSTEREOS-369-396-0001`

Evidence label:

`USER_REPORTED_NOT_REVERIFIED_BY_BRUTUS`

The record preserves the reported exact determinants and the reported 0/1296 branch equality result, but does not create a Brutus proof.

### Brutus-Pell L7 / L8

Stored as:

`BRUTUS-RECORD-BRUTUS-PELL-L7-L8-0001`

Evidence label:

`EXTERNAL_DERIVED_RELATIONS_NOT_REVERIFIED_BY_BRUTUS`

It preserves:
- the reported 47 / 71 / 83 machine result;
- the bounded 4,853-candidate scan with zero exact witnesses;
- L7 and L8 as derived-relation candidates;
- the explicit novelty/proof boundary.

## Why no new card

The Experiment Intake Bench itself does not need a new Verso capability.

It uses:
- the existing prototype manifest contract;
- the existing append-only ledger;
- existing read-only station/ledger status cards.

New Verso cards should be created only when a real experiment demonstrates a missing read capability.
