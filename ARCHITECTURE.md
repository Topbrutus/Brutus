# BRUTUS — architecture de départ

## Principe

Brutus traite le raccordement comme le problème principal.

Les organes existants restent dans leurs dépôts sources. Brutus porte les contrats, adaptateurs, registres, preuves d'intégration et checkpoints nécessaires pour les faire coopérer.

## Boucle cible

    PERCEPTION
      -> HORLOGE / QUEENCORE
      -> HEMISPHERES + C1/C2/C3
      -> WORLD ROUTER
      -> MONDES / FOURMIS / FORMULES
      -> TURBULENCE MESUREE
      -> ZONE DE COMBAT
      -> PREUVE
      -> FRESQUE + LIVRE DE BORD
      -> CRISTALLISATION
      -> MEMOIRE / PROTOTYPES
      -> RETOUR HORLOGE

## Frontières absolues

### Horloge

L'Horloge est l'autorité temporelle. Les agents adaptent leur travail à sa cadence; ils ne modifient pas le tick maître.

### Fresque

Aucune ligne décorative. Une ligne doit être reconstructible depuis une règle, un calcul, une relation et des coordonnées.

### Zone de Combat

Une formule testée ne devient pas vraie parce qu'elle a été exécutée. PASS, FAIL, DOMAIN et ERROR sont des résultats d'exécution à interpréter avec leur protocole et leur preuve.

### Cristallisation

Un cristal doit être portable, traçable, reconstructible et relié à une provenance. Le contrat universel final reste à auditer avant canonisation.

### Verso

Verso est fermé par défaut. Le prototype v0.1 accepte uniquement une carte de données connue, valide ses champs et ses valeurs autorisées, exécute une lecture via un adaptateur, puis restaure DEFAULT_LOCKED dans tous les cas.

## Stratégie d'intégration

Pour chaque interface :

1. relever le HEAD source;
2. identifier l'API ou le contrat réellement utilisé;
3. relever les tests/proofs existants;
4. définir un adaptateur minimal;
5. tester aller, erreur et reprise;
6. enregistrer la preuve;
7. seulement ensuite étendre.

Premier trou à auditer : Horloge X72 <-> World Router.

## Ce que Brutus n'est pas

- pas un monorepo obtenu par copie;
- pas une preuve de conscience;
- pas une preuve biologique des métaphores utilisées;
- pas un endroit où contourner les garde-fous des dépôts sources;
- pas un réceptacle de secrets.
