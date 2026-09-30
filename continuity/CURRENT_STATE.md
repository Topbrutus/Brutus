# CURRENT STATE — BRUTUS BOOTSTRAP — 2026-09-30

## Repository

Repository: Topbrutus/Brutus
Branch: main
Visibility: private

## Phase

PHASE 0 — CONTRACT-FIRST BOOTSTRAP

Completed in this bootstrap:
- central repository created;
- source repositories verified and pinned in registry/sources.json;
- architecture boundary documented;
- proof policy documented;
- Verso card v0.1 schema created;
- data-only/read-only guard implemented;
- runtime reset invariant implemented;
- tests added for success, rejection, adapter failure and concurrent entry.

## Standing invariants

VERSO_DEFAULT = DEFAULT_LOCKED
CARD_REQUIRED = YES
ARBITRARY_CODE = NO
SOURCE_CODE_MUTATION_BY_ENTITY = NO
UNKNOWN_FIELD = STOP
WRITE = NO in v0.1
CREATE_ROUTE = NO in v0.1
AFTER_CARD = DEFAULT_LOCKED

## Unknowns preserved

- final universal crystal contract;
- exact Brutus event envelope;
- exact Horloge X72 <-> World Router adapter;
- resource governor / Chaudiere d'esprit;
- accumulator and movement dephaser;
- full EmojiLogic opcode bank;
- chakra crystallization levels;
- microphone and unified voice path.

These remain candidates until source audit and tests.
