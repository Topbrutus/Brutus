# BRUTUS — Reine vivante v0.3

Prototype local de l’univers Brutus. La règle reste: **1 module → 1 connexion → 1 mesure → 1 preuve**.

## Ce qui fonctionne maintenant

Brutus joue le rôle de **Reine / orchestrateur** autour d’un Brotoculateur réel en lecture seule.

- **Brotoculateur / Forge** — lit `127.0.0.1:8781` puis `8778`, normalise paquets, cristaux, Papillon, sentinelles, formules et petits échantillons d’observations.
- **Observer** — toutes les 30 s, conserve seulement les changements significatifs dans un ledger append-only à chaîne de hashes.
- **BrutoTableur / Fresque** — montre les formules visibles et les derniers cristaux avec leur classe de preuve/provenance.
- **Fourmis ↔ Reine** — bus de missions et de rapports. Les permissions autorisées au prototype sont `READ`, `COMPUTE`, `TEST`, `REPORT`.
- **Découverte bornée** — toutes les 60 s, cherche quelques relations simples entre sorties de formules sur des entrées partagées. Les motifs actuels sont volontairement limités à des relations affines entières et des carrés décalés.
- **Contre-test local** — une relation détectée est testée sur un sous-échantillon réservé par une fourmi locale (`ANT-COUNTERTEST-LOCAL-001`).
- **Reproduction** — la porte `REPRODUCED` ne monte que si la même relation réapparaît avec de nouveaux hashes de cristaux.
- **Boîte Astra** — le dernier sas avant toute décision de publication.
- **Atelier** — l’ancienne interface technique reste disponible avec le bouton `OUVRIR L’ATELIER`.

## Pipeline d’une formule candidate

```text
LIVE OBSERVATION
    ↓
BOUNDED PATTERN CANDIDATE
    ↓
OBSERVED + PROVENANCE
    ↓
FOURMI COUNTER_TEST (holdout local)
    ↓
REPRODUCED sur nouveaux cristaux
    ↓
PRIOR_ART_CHECKED
    ↓
NOVELTY_CLEARED
    ↓
ASTRA MAILBOX
    ↓
REVUE HUMAINE
```

Une relation détectée n’est **pas** automatiquement une nouvelle formule scientifique. Une identité triviale ou connue peut être utile pour tester le moteur, mais ne doit pas être publiée comme nouveauté.

## Frontières de preuve et sécurité

```text
VERSO = DEFAULT_LOCKED
UNKNOWN_CARD = STOP
LIVE_ROUTING = DENIED
AUTO_PROOF_PROMOTION = false
PROOF_REF = null tant qu’une vraie preuve n’existe pas
AUTO_PUBLICATION = false
PUBLICATION_REVIEW = ASTRA
```

Les écritures du prototype sont autorisées par défaut seulement lorsque le serveur écoute en local (`127.0.0.1`/`localhost`). Une exposition publique doit conserver la vitrine en lecture seule ou ajouter une authentification/capability layer réelle.

## Ledger Reine

Le ledger runtime est:

```text
prototype/brutus-v0/data/queen-ledger.jsonl
```

Chaque événement possède son propre SHA-256 et le hash de l’événement précédent. La lecture échoue si un événement ou la chaîne est altéré.

La mémoire opérateur historique reste:

```text
prototype/brutus-v0/data/memory.jsonl
```

Ces fichiers runtime sont ignorés par Git.

## Lancer

Depuis la racine du dépôt:

```powershell
node prototype/brutus-v0/server.mjs
```

Puis ouvrir:

```text
http://127.0.0.1:8811
```

Pour imposer une source Brotoculateur:

```powershell
$env:BRUTUS_BROTO_URL = 'http://127.0.0.1:8781/api/status'
node prototype/brutus-v0/server.mjs
```

## Tests

```powershell
node --test prototype/brutus-v0/test/*.test.mjs
```

Les tests couvrent notamment: source offline, normalisation Brotoculateur, mémoire append-only, hash chain fail-closed, missions Fourmis, portes de publication, contre-exemple, observer, découverte bornée, holdout et reproduction sur nouveaux cristaux.

## Ce que v0.3 n’est pas encore

Ce n’est pas un théorème-prover universel, un juge de nouveauté académique, ni un système autorisé à publier seul. Le moteur de découverte actuel est volontairement petit et auditable. La prochaine montée de capacité consiste à ajouter des familles de relations plus riches et à brancher les vrais modules Brutus–Pell et ZEL sans casser les frontières de preuve.

## Concurrence et récupération du ledger

Les écritures du ledger Reine utilisent un verrou exclusif de fichier, y compris entre processus, afin d’empêcher deux événements de partir du même `prev_hash`. La lecture reste fail-closed. Si un fork est détecté, la récupération doit d’abord archiver le ledger brut, ne relier que les événements affectés, puis ajouter un événement `LEDGER_RECOVERY` traçable.
