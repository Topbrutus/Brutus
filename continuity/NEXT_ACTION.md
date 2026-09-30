# NEXT ACTION — INTAKE FIRST, EXPAND ONLY ON EVIDENCE

## Normal path for the next experiment

When a new external result arrives:

1. identify the existing ASTRA STATION prototype that owns it;
2. if needed, add a new data-only prototype manifest;
3. append a qualified ledger record with explicit SOURCE_REF and evidence label;
4. do not assign PROOF_REF unless a real proof artifact exists;
5. counter-test or independently rerun the claim when useful;
6. append a proof reference only after verification;
7. create a new Verso card only if the experiment demonstrates a missing **read** capability.

## Existing intake workspace

Use:

`BRUTUS-PROTOTYPE-EXPERIMENT-INTAKE-0001`

for incoming experimental material that does not yet deserve a dedicated prototype.

## Evidence labels

Keep distinctions explicit:

```text
SOURCE
MESURE
CALCUL
CANDIDAT
HYPOTHÈSE
INTERPRÉTATION
PROOF_REF
```

Incoming reports are not silently upgraded.

## Verso rule

Do not modify Verso Core to advance an experiment.

Use an existing prepared card if one fits.

If no prepared card fits:
`NO CARD -> STOP -> DESIGN REVIEW`

not:
`NO CARD -> EDIT ENGINE`

## Routing boundary

Preserve:

`LIVE_ROUTING = DENIED`

until a separate explicit authorization contract is specified and proven.
