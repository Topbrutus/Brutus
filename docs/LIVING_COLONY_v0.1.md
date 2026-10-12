# BRUTUS Living Colony v0.1

## But

Faire fonctionner Brutus comme une colonie autonome bornée : la Reine observe, crée des quêtes, pond des fourmis spécialisées, reçoit leurs rapports, amplifie les motifs intéressants et écrit une lettre à Astra lorsqu'un candidat a franchi les portes prévues.

Astra reste la revue finale. Une réponse Astra ne devient jamais automatiquement une preuve mathématique.

## Boucle

```text
Brotoculateur principal 8781 (lecture seule)
        +
Brutotableur / Fresque sanitée
        ↓
BRUTUS Queen 8812
        ↓
quêtes → fourmis spécialisées → rapports
        ↓
worker Brotoculateur isolé 8782
        +
contre-tests Fresque
        +
provenance
        ↓
candidat READY_FOR_ASTRA
        ↓
lettre Astra
        ↓
APPROVE / RETURN_TO_COLONY / REJECT
```

## Isolation

- `8781` reste le Brotoculateur principal. La colonie n'envoie aucun POST sur ce port.
- `8782` est un worker dédié. Il démarre en pause et n'avance que par `/api/step` à la demande d'une fourmi.
- `8811` reste le Brutus existant.
- `8812` est la nouvelle Reine de colonie, liée uniquement à loopback.
- La vitrine publique lit `public-state.json` et `colony-state.json`; elle n'expose aucune route d'écriture Astra.

## Crystal Watch

Les niveaux sont découverts dynamiquement (`L1 → Ln`). Aucun `L4` n'est codé comme plafond. Un nouveau sommet crée un événement mesuré puis une quête de vérification.

## Entretien L1

Quand la pression disque dépasse la porte configurée, la Reine peut créer une quête `COMPACT_L1`.

La compactrice v0.1 :

- ne supprime aucun cristal ;
- ne change aucun champ JSON ;
- préserve `CRYSTAL_H256` ;
- calcule un hash sémantique avant/après ;
- remplace le fichier atomiquement seulement après vérification ;
- enlève uniquement l'indentation et les espaces JSON inutiles ;
- parcourt le répertoire en streaming, par lots bornés.

Mesure de référence du 2026-10-11 sur 30 vrais L1 : économie moyenne `22.90 %`, environ `8 205 octets` par cristal.

## Fresque

Feed : `data/brutotableur-fresque-public.json`.

Source : `Topbrutus/Brutotableur`, commit `a8a3230c5f814b366a525077f59f19ff2515afca`.

Le feed contient 567 segments : lignées canoniques et fenêtres bornées du moteur virtuel base 7. Le curseur boucle du dernier segment vers le premier. Les motifs triviaux d'opérateurs restent des observations de fond et ne deviennent pas des candidats Astra.

## Règle de preuve

`OBSERVATION ≠ CANDIDAT ≠ CONTRE-TEST PASS ≠ PREUVE`.

La colonie conserve les contrats Brutus existants : pas d'auto-promotion de preuve, pas d'autorité de routage inventée, provenance explicite et état persistant hash-chaîné.
