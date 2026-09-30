# Brutus

Brutus est notre dépôt central d'orchestration.

Il ne remplace pas Antmux, antmux-lab, Intelbrutatrice ou les autres organes déjà éprouvés. Il définit les contrats qui permettent de les raccorder sans perdre leur identité, leurs preuves, leur cadence ni leur continuité.

## Mission

Construire une écologie computationnelle interface-first :

- Horloge / QueenCore : autorité temporelle et d'état.
- World Router / Verso : routage contrôlé entre mondes.
- Fourmis : agents/synapses logicielles mobiles.
- Zone de Combat : qualification et contre-test des formules.
- Fresque : géométrie produite uniquement par des relations calculées.
- Cristaux : mémoire informationnelle traçable.
- Verseau / Astra Station : atelier de contrôle et de prototypage.

Les termes biologiques ou symboliques sont des noms d'architecture. Ils ne constituent pas des revendications biologiques ou physiques.

## Invariants de bootstrap

1. Source live > mémoire > hypothèse.
2. L'Horloge maître ne ralentit pas pour la colonie.
3. Aucun organe existant n'est copié ici sans audit d'interface.
4. Verso reste DEFAULT_LOCKED hors exécution d'une carte valide.
5. Une carte est data-only, read-only dans v0.1, sans code arbitraire ni création de route.
6. Toute exécution retourne à DEFAULT_LOCKED, succès ou erreur.
7. Candidat != preuve. Merge != preuve runtime. Beauté != preuve.
8. Aucun secret dans le dépôt.
9. Construire petit, vérifier, cloner, étendre.

## Premier prototype

Le bootstrap implémente le cycle :

    ENTITY -> CARD -> GUARD -> QUERY -> RESULT -> RESET -> ANCHOR-0001

Test local :

    npm test

Voir ARCHITECTURE.md, contracts/verso-card.v0.schema.json et registry/sources.json.
