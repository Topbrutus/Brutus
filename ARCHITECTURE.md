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

### Entrée Queen read-only

Brutus ne duplique pas l'observateur Queen déjà éprouvé dans Antmux.

Chaîne autorisée:

    QueenCore
      -> persistence
      -> API/WebSocket
      -> X72ObservationAdapter [Antmux]
      -> ObservationEnvelope
      -> QueenObservationIngress [Brutus]
      -> consommateur read-only

La frontière Brutus n'ouvre aucun transport réseau Queen elle-même. Elle accepte les enveloppes de l'adaptateur source, impose la continuité d'identité, conserve FRESH/STALE/UNKNOWN sans synthèse, exige integrity_match=true avant utilisation aval et borne les reprises.

Aucun appel World Router n'est automatique depuis cette frontière.

### ANCHOR-0001 / ASTRA STATION

ASTRA STATION est le premier point fixe de prototypage autour de Verso.

Il porte des manifests de prototypes data-only et un ledger append-only de traces chaînées par SHA-256. Le ledger n'exécute pas les expériences : il conserve des observations, résultats, notes et références de preuve avec leur niveau d'évidence.

Les résultats externes entrent d'abord comme traces qualifiées. Ils ne deviennent pas automatiquement des preuves, des lois, des routes ou de nouvelles capacités Verso.

### Counter-Test Bench

Les traces qualifiées peuvent être transformées en plans de contre-test immuables à ASTRA STATION.

Un plan fixe la question, les contrôles à refaire, les critères de confirmation et surtout les critères de contradiction. Le bench n'exécute rien et ne promeut aucun résultat en preuve automatiquement.

Chemin :

    TRACE QUALIFIEE
      -> PLAN DE CONTRE-TEST
      -> EXECUTION SEPAREE
      -> RESULTAT
      -> REVUE
      -> PROOF_REF SI MERITE

### Counter-Test Result Gate

Les résultats d'un plan exécuté ailleurs reviennent par un gate de qualification.

Le gate exige le résultat de chaque check, impose la cohérence du verdict global et produit un enregistrement RESULT. Il n'append pas lui-même et force PROOF_REF=null.

Ainsi, PASS reste un résultat expérimental jusqu'à une étape de preuve séparée.

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

Premiers raccordements audités et intégrés :
- Horloge X72 / Queen read-only ;
- Verso prepared cards / DEFAULT_LOCKED ;
- ANCHOR-0001 / ASTRA STATION ;
- ledger append-only de traces.

Front actuel : faire entrer les nouvelles expériences comme prototypes et traces qualifiées à ASTRA STATION avant d'ajouter de nouvelles capacités à Verso.

## Ce que Brutus n'est pas

- pas un monorepo obtenu par copie;
- pas une preuve de conscience;
- pas une preuve biologique des métaphores utilisées;
- pas un endroit où contourner les garde-fous des dépôts sources;
- pas un réceptacle de secrets.
