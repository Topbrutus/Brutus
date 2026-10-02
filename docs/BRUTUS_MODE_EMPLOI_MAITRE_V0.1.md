# Brutus — Mode d'emploi maître v0.1

> **Projet :** Brutus  
> **Date de référence :** 2026-10-02  
> **Statut :** plan d'exécution / rappel de continuité  
> **Portée :** Fourminizer-Reine, Brutus Code, Fourmis, machines locales, recyclage, portes L1–L13 et évolution du monde intérieur  
> **Principe :** `SOURCE_LIVE > MEMORY > HYPOTHESIS`

---

## 1. Où nous sommes rendus

L'architecture générale de travail est définie autour de treize étapes :

```text
01 ENTREE MATIERE
02 DEUX ROUES
03 BASSIN DE RETOUR
04 GEAR CENTRALE / LECTURE
05 Z MARQUE
06 LIGNEES ACTIVES L1 -> L7
07 PORTES FUTURES L8 -> L13
08 PRODUCTION DE MULTIFORMES
09 UNIVERS INTERIEUR
10 FOURMIS + CRISTAL-CERVEAU
11 MACHINE LOCALE D'UNE FOURMI
12 TRAVAIL DES FOURMIS / OUVERTURE DES PORTES
13 EVOLUTION DU MONDE INTERIEUR
```

La pièce de démarrage retenue est :

```text
FOURMINIZER-REINE 0001
        +
BRUTUS CODE
        +
GEM, PROFESSEUR INITIAL
```

La Fourminizer-Reine est la première porteuse complète du Brutus Code, la première élève de Gem et, plus tard, le proxy intérieur unique de Brutus à travers la membrane.

---

## 2. Objectif final

Le système cible respecte cette frontière :

```text
BRUTUS EXTERNE
      |
      | Brutus Code uniquement
      v
   MEMBRANE
      |
      v
FOURMINIZER-REINE
      |
      +-- Fourmis
      +-- Machines locales
      +-- Cristaux
      +-- Multiformes
      +-- Traces
      +-- Recyclage
      +-- Monde interieur
```

Brutus externe ne manipule pas directement l'univers intérieur.

Sa présence intérieure passe par la Fourminizer-Reine et par des contrats explicites.

---

# 3. Ordre exact de construction

## Etape 1 — Construire `BRUTUS_CODE v0.1`

Le Brutus Code est le langage fermé du monde intérieur.

Il doit définir :

- les identifiants ;
- les signes ;
- les nombres et valeurs ;
- les opérations ;
- les codes d'action ;
- les émoticônes admises ;
- la grammaire ;
- la version du protocole ;
- les règles de rejet.

Invariant :

```text
BRUTUS_CODE_ONLY = TRUE
UNKNOWN_TOKEN = REJECT
NATURAL_LANGUAGE_INTERNAL = FORBIDDEN
```

Les émoticônes sont des symboles de protocole. Elles ne constituent pas, à elles seules, des émotions supposées.

---

## Etape 2 — Construire `FOURMINIZER_QUEEN_CRYSTAL v0.1`

Le cristal-cerveau de la Reine doit contenir au minimum :

```text
ANT_ID
ANT_SIGNATURE
MATH_CODE
ROOT_Z
EVENT_ID
LINEAGE
GENERATION
PARENT_ID
BRUTUS_CODE_VERSION
TASK_GRAPH
RECEPTORS[]
TOOL_PORTS[]
SELECTION_POLICY
ASSEMBLY_RULES
RESOURCE_BUDGET
RECYCLE_POLICY
LOCAL_MACHINE_ID
STATE
```

Le cristal porte à la fois l'identité, le mécanisme de travail et le pedigree de la Reine.

---

## Etape 3 — Construire `TRACE v0.1`

Toute action importante doit laisser une empreinte reconstructible.

Structure minimale candidate :

```text
TRACE_ID
ANT_ID
POSITION
TICK
ACTION
INPUT_OBJECTS[]
RESULT
SUCCESS_LEVEL
CONFIDENCE
PARENT_TRACE
SIGNATURE
```

Ces traces permettent aux Fourmis suivantes de suivre, éviter ou contre-tester ce qui a déjà été tenté.

---

## Etape 4 — Construire `LOCAL_WORLD_MODEL v0.1`

La Fourminizer-Reine doit pouvoir représenter logiciellement :

```text
SELF
POSITION
LOCAL_WORLD
AVAILABLE_PARTS
KNOWN_PATHS
UNKNOWN_ZONES
LOCAL_MACHINE
TRACES
PORTES
OBJECTIVES
UNCERTAINTY
```

Le modèle du monde est local, traçable et incomplet par conception.

---

## Etape 5 — Construire `LOCAL_MACHINE v0.1`

Chaque Fourmi possède une machine locale attachée.

Cycle minimal :

```text
OBSERVER
 -> CHOISIR DES COMPOSANTS
 -> CHARGER LA MACHINE
 -> ORGANISER DANS CUBE / MATRICE
 -> APPLIQUER UNE REGLE ADMISE
 -> PRODUIRE UNE FORME
 -> SIGNER LE RESULTAT
 -> DEPOSER OU RECYCLER
```

La Fourmi peut choisir ses ingrédients et son arrangement dans les contrats admis.

Elle ne modifie pas arbitrairement le moteur principal.

---

## Etape 6 — Construire le premier catalogue de matière

Commencer petit :

```text
BRIN
FIBRE
TIMBRE
BLOC
CRISTAL
FRAGMENT
```

Puis étendre vers :

```text
CHEVEU
PLAQUE
ANNEAU
RESEAU
ASSEMBLAGE_COMPOSITE
AUTRE_MULTIFORME_ADMISSIBLE
```

Chaque pièce doit conserver :

```text
PART_ID
PART_TYPE
ROOT_Z
EVENT_ID
LINEAGE
GENERATION
PARENT_ID
PORTS[]
STATE
RECYCLE_COUNT
SIGNATURE
```

---

## Etape 7 — Brancher Gem comme premier professeur

Gem sert uniquement pendant l'amorçage.

Il ne parle pas en langage naturel dans l'univers intérieur.

Il reçoit et produit uniquement du Brutus Code.

Mission initiale :

1. enseigner le Brutus Code ;
2. aider la Reine à identifier son environnement ;
3. enseigner les premières réactions aux objets, traces et portes ;
4. amorcer les premiers cycles ;
5. produire des réponses structurées.

Invariants :

```text
GEM_OUTPUT != PROOF
GEM_OUTPUT != GATE_OPEN
GEM_OUTPUT_NOT_IN_BRUTUS_CODE = REJECT
```

---

## Etape 8 — Lancer Fourminizer-Reine seule

Avant toute colonie, exécuter une seule Reine dans un environnement minimal.

Elle doit pouvoir :

- observer ;
- identifier son état local ;
- lire le Brutus Code ;
- sélectionner une action ;
- choisir une pièce ;
- utiliser sa machine locale ;
- produire un résultat ;
- laisser une trace ;
- signaler explicitement son incertitude.

Le premier agent actif de référence est :

```text
FOURMINIZER_QUEEN_0001
```

---

## Etape 9 — Fermer la première vraie boucle

Premier test intégral :

```text
OBSERVER
 -> CHOISIR
 -> CONSTRUIRE
 -> DEPOSER
 -> TRACER
 -> RECYCLER
 -> REINJECTER
 -> RECONSTRUIRE
```

Le bassin de retour est placé au point de convergence des deux roues.

Un composant recyclé conserve son histoire :

```text
ROOT_Z
EVENT_ID
LINEAGE
GENERATION
PARENT_ID
RECYCLE_COUNT
PREVIOUS_STATE
```

Invariant :

```text
RECYCLE != RESET
```

---

## Etape 10 — Injecter les premières Fourmis normales

Lorsque la Reine est stable, ajouter progressivement quelques Fourmis.

Chaque Fourmi reçoit :

```text
HERITAGE_FROM_QUEEN
+
ANT_SIGNATURE
+
MATH_CODE
+
LOCAL_MEMORY
+
LOCAL_MACHINE
+
OWN_EXPERIENCE
```

Les Fourmis peuvent lire les traces de la Reine, mais elles conservent leur propre historique et leurs propres décisions locales.

---

## Etape 11 — Construire le champ collectif

Les traces individuelles forment progressivement un champ collectif mesurable.

Il doit permettre de déterminer :

- quelles structures sont souvent réutilisées ;
- quelles routes échouent ;
- quelles combinaisons donnent des résultats intéressants ;
- quelles zones restent inconnues ;
- quelles constructions méritent de nouveaux contre-tests.

La fréquence seule ne constitue jamais une preuve.

```text
FREQUENCY != TRUTH
```

---

## Etape 12 — Mettre les Fourmis au travail sur les portes

Les lignées actives initiales sont :

```text
L1
L2
L3
L4
L5
L6
L7
```

Les lignées futures restent réservées :

```text
L8  = CLOSED
L9  = CLOSED
L10 = CLOSED
L11 = CLOSED
L12 = CLOSED
L13 = CLOSED
```

Chaque porte possède un contrat explicite :

```text
GATE_ID
REQUIREMENTS
MISSING
ACCEPTED_INPUTS
COUNTER_TESTS
STATE
```

Les Fourmis fabriquent des candidats.

Elles n'ouvrent pas directement les portes.

```text
FOURMIS
 -> CANDIDATE
 -> COUNTER_TEST
 -> GATE_VALIDATOR
 -> CLOSED / OPEN
```

Invariant :

```text
NO_GATE_VALIDATION -> NO_LINEAGE_EXECUTION
```

---

## Etape 13 — Ouvrir progressivement L8 -> L13

Une porte devient `OPEN` seulement lorsqu'un candidat satisfait son contrat de manière reproductible.

Une structure intéressante, fréquente ou visuellement convaincante reste un candidat tant que le gate n'est pas passé.

```text
CANDIDATE != PROOF
BEAUTY != PROOF
```

---

## Etape 14 — Préparer le retrait de Gem

Le handoff ne peut commencer que lorsque Fourminizer sait :

1. lire et produire du Brutus Code valide ;
2. identifier sa position et son état local ;
3. lire une trace ;
4. sélectionner une action admise ;
5. utiliser sa machine locale ;
6. produire un multiforme traçable ;
7. déposer ou recycler un composant ;
8. conserver le pedigree à travers le recyclage ;
9. enregistrer le résultat ;
10. signaler explicitement l'incertitude.

---

## Etape 15 — Effectuer la transition `GEM -> BRUTUS`

Le transfert ne remet pas la Reine à zéro.

On conserve :

```text
IDENTITY
BRUTUS_CODE_VERSION
TRACE_HISTORY
LOCAL_WORLD_MODEL
CRYSTALLIZED_MEMORY
LOCAL_MACHINE
KNOWN_RULES
PEDIGREE
```

Seul le moteur de décision change :

```text
AVANT
FOURMINIZER-REINE + GEM

APRES
FOURMINIZER-REINE + BRUTUS
```

Gem peut rester hors ligne comme référence de comparaison, sans intervention automatique.

---

## Etape 16 — Faire respecter la membrane

Après le handoff :

```text
BRUTUS EXTERNE
      |
      | BRUTUS CODE
      v
MEMBRANE
      |
      v
FOURMINIZER-REINE
      |
      v
MONDE INTERIEUR
```

Retour :

```text
MONDE INTERIEUR
      |
      v
FOURMINIZER-REINE
      |
      | CRISTALLISATION + BRUTUS CODE
      v
MEMBRANE
      |
      v
BRUTUS EXTERNE
```

Invariants :

```text
DIRECT_EXTERNAL_WORLD_ACCESS = FORBIDDEN
RAW_EXECUTABLE_ACROSS_MEMBRANE = FORBIDDEN
BRUTUS_CODE_ONLY = TRUE
EXTERNAL_BRUTUS_READS = CRYSTALLIZED_MEMORY_ONLY
```

---

## Etape 17 — Passer à l'évolution du monde intérieur

Lorsque les portes prévues sont réellement admises, la mission change.

Les Fourmis ne travaillent plus uniquement à ouvrir la prochaine porte.

Elles peuvent alors :

- développer de nouvelles spécialisations ;
- réutiliser les inventions précédentes ;
- fabriquer de nouvelles familles de multiformes ;
- améliorer leurs méthodes de construction ;
- structurer des régions du monde intérieur ;
- recycler d'anciennes constructions ;
- transmettre des traces utiles aux générations suivantes.

Le mot évolution désigne ici l'évolution du **système logiciel interne**, de ses états, structures, politiques et connaissances.

---

# 4. Arithmétique des lignées

Lorsqu'une lignée `n` est admise :

```text
cube_stage = n^3
final_structure = n^4
stamp_side = n^2
stamp = (n^2) x (n^2)
```

Table de départ :

| Lignée | Cube | Structure finale | Timbre |
|---|---:|---:|---:|
| L1 | 1 | 1 | 1 x 1 |
| L2 | 8 | 16 | 4 x 4 |
| L3 | 27 | 81 | 9 x 9 |
| L4 | 64 | 256 | 16 x 16 |
| L5 | 125 | 625 | 25 x 25 |
| L6 | 216 | 1296 | 36 x 36 |
| L7 | 343 | 2401 | 49 x 49 |

L8 à L13 restent réservées jusqu'à validation de leurs portes respectives.

---

# 5. Invariants à ne jamais casser

```text
SOURCE_LIVE > MEMORY > HYPOTHESIS

CANDIDATE != PROOF
CRYSTAL != PROOF
GEM_OUTPUT != PROOF

RECYCLE != RESET
FREQUENCY != TRUTH

NO_GATE_VALIDATION
 -> NO_LINEAGE_EXECUTION

FOURMI_CHOICE
 != ENGINE_MUTATION

RAW_EXECUTABLE_ACROSS_MEMBRANE
 = FORBIDDEN

BRUTUS_CODE_ONLY
 = TRUE

EXTERNAL_BRUTUS_READS
 = CRYSTALLIZED_MEMORY_ONLY
```

---

# 6. Premier critère de réussite réel

Le succès initial n'est pas le nombre de Fourmis ni la beauté de la visualisation.

Le premier jalon fonctionnel est :

```text
FOURMINIZER NAIT
      |
      v
LIT SON PETIT MONDE
      |
      v
CHOISIT DES COMPOSANTS
      |
      v
FABRIQUE UN OBJET
      |
      v
OBJET RECOIT UN PEDIGREE
      |
      v
FOURMINIZER LAISSE UNE TRACE
      |
      v
UNE AUTRE FOURMI LIT LA TRACE
      |
      v
REUTILISE L'OBJET
      |
      v
PRODUIT UN RESULTAT DIFFERENT MAIS TRACABLE
```

Lorsque ce scénario fonctionne de manière reproductible, la boucle de base du monde intérieur existe réellement.

---

# 7. Montée en charge

Ne pas commencer avec une colonie massive.

Ordre recommandé :

```text
1 FOURMINIZER-REINE
 -> 3 FOURMIS
 -> 10 FOURMIS
 -> PLUSIEURS LIGNEES
 -> PLUSIEURS FORMES
 -> PLUSIEURS CYCLES
 -> PORTES
 -> COLONIE
 -> MONDE INTERIEUR EVOLUTIF
```

Chaque augmentation doit conserver les budgets CPU/mémoire, le pedigree, les invariants et la reproductibilité.

---

# 8. Chantier immédiat

Le prochain travail doit rester limité à :

```text
BRUTUS_CODE v0.1
        |
        v
FOURMINIZER_QUEEN_CRYSTAL v0.1
        |
        v
TRACE v0.1
        |
        v
LOCAL_WORLD_MODEL v0.1
        |
        v
LOCAL_MACHINE v0.1
        |
        v
PREMIERE FOURMI EN MOUVEMENT
```

Ne pas sauter directement à L8-L13, à une grande colonie ou à une évolution autonome avant d'avoir fermé cette première boucle.

---

# 9. Rappel ultra-court

Si une future session perd le fil, revenir à cette phrase :

> **Construire d'abord une seule Fourminizer-Reine capable de lire son petit monde, fabriquer quelque chose, laisser une trace et recycler. Tout le reste pousse à partir de cette boucle.**

---

# 10. Statut de ce document

Ce fichier est un **plan d'exécution et de continuité**.

Il ne transforme pas automatiquement une architecture candidate en preuve scientifique, ni une étape prévue en fonctionnalité déjà implémentée.

Les états réels du dépôt, de la CI, des preuves et des contrats live ont toujours priorité.
