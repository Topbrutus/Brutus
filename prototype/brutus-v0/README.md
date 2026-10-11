# BRUTUS — premier prototype vivant v0.1

Ce prototype est volontairement petit: **1 module → 1 connexion → 1 mesure → 1 preuve**.

Il fournit:

- un cockpit Brutus avec cartes Brotoculateur, Brutus–Pell, Zelstéréos et Fourmis;
- une lecture **read-only** du Brotoculateur (essaie `127.0.0.1:8781`, puis `8778`);
- une mémoire persistante append-only en JSONL;
- un apprentissage supervisé par l'opérateur: `FACT`, `HYPOTHESIS`, `DECISION`, `FEEDBACK`;
- un hash SHA-256 par événement de mémoire;
- aucune auto-promotion de preuve;
- aucune exécution ou route live depuis l'interface.

## Frontière d'apprentissage

`ready to learn` signifie ici que Brutus peut **retenir durablement ce que l'opérateur lui enseigne et le rattacher à un module**, sans réécrire son propre code et sans confondre mémoire, hypothèse et preuve.

Invariants:

```text
VERSO = DEFAULT_LOCKED
UNKNOWN_CARD = STOP
LIVE_ROUTING = DENIED
AUTO_PROOF_PROMOTION = false
PROOF_REF = null
EXECUTABLE = false
```

## Lancer sous Windows / PowerShell

Depuis la racine du dépôt:

```powershell
node prototype/brutus-v0/server.mjs
```

Puis ouvrir:

```text
http://127.0.0.1:8811
```

Pour imposer une autre source Brotoculateur:

```powershell
$env:BRUTUS_BROTO_URL = 'http://127.0.0.1:8781/api/status'
node prototype/brutus-v0/server.mjs
```

La mémoire est écrite par défaut dans:

```text
prototype/brutus-v0/data/memory.jsonl
```

Elle n'est pas destinée à être commitée: c'est une mémoire runtime locale.

## Tests

```powershell
node --test prototype/brutus-v0/test/*.test.mjs
```

## Étape suivante, seulement après validation

Brancher une deuxième carte réelle (Brutus–Pell ou ZEL) via une frontière read-only documentée. Ne pas modifier le cœur mathématique pour le prototype visuel.
