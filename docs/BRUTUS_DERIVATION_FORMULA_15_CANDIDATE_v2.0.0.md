# Brutus Dérivation — Candidate Formula 15 — v2.0.0

Status: **CANDIDAT / CALCUL ALGÉBRIQUE REPRODUCTIBLE**.

Date: 2026-10-05.

Auteur / opérateur: **Topbrutus**.

Outil associé: `tools/brutus_derivation_chalkboard.py`.

## But

Documenter une construction fréquentielle générale, son résidu haute précision et sa propagation à une échelle sans dimension `N`.

Cette note ne transforme pas automatiquement une relation algébrique en loi physique. Elle sépare explicitement:

- `CALCUL`: ce qui est dérivé algébriquement;
- `CANDIDAT`: l'usage proposé dans Brutus;
- `INTERPRETATION`: toute lecture physique éventuelle qui exige un modèle indépendant et une expérience.

## Relation de départ

On part de:

```text
1/f0 - 1/f = tau
```

où:

- `f0` est une fréquence de base en hertz;
- `f` est la fréquence dérivée en hertz;
- `tau` est un décalage temporel en secondes.

La résolution algébrique donne:

```text
f = f0 / (1 - f0*tau)
```

Le résidu fréquentiel est:

```text
delta_f = f - f0
```

Pour une échelle sans dimension `N`:

```text
Nf = N*f
N_delta_f = N*delta_f
```

## Domaine

Le dénominateur doit rester défini:

```text
1 - f0*tau != 0
```

L'outil graphique actuel refuse également le domaine où:

```text
1 - f0*tau < 0
```

Cette restriction appartient à l'implémentation courante du calculateur et ne doit pas être confondue avec une démonstration physique.

## Référence reproductible v2.0.0

Entrées:

```text
f0  = 240.1 Hz
tau = 1e-15 s
N   = 2401
```

À haute précision:

```text
f = 240.1000000000576480100000138412872... Hz
```

Donc:

```text
delta_f = 5.76480100000138412872...e-11 Hz
```

À l'échelle `N = 2401`:

```text
N*delta_f = 1.38412872010033232930...e-7
```

et:

```text
N*f = 576480.1000001384128720100332...
```

Ces valeurs constituent un résultat de comptabilité algébrique reproductible.

## Ce que le résultat dit

Il établit qu'une petite différence temporelle `tau` appliquée à la relation réciproque entre `f0` et `f` produit un résidu fréquentiel calculable, puis que ce résidu peut être propagé linéairement par un facteur sans dimension `N`.

Il fournit donc un squelette général utilisable pour comparer plusieurs fréquences, plusieurs valeurs de `tau` et plusieurs échelles.

## Ce que le résultat ne dit pas

Cette construction ne démontre pas, à elle seule:

- une nouvelle constante fondamentale;
- une nouvelle particule;
- une relation avec le boson de Brout-Englert-Higgs;
- une fréquence universelle de la conscience;
- une propriété biologique, neurologique ou cosmologique;
- une causalité physique derrière les valeurs numériques utilisées.

Toute identification de ce type doit rester `INTERPRETATION` ou `HYPOTHESE` tant qu'un modèle physique indépendant et une expérience ne l'ont pas testée.

## Calculateur Brutus Dérivation

Le dépôt contient un petit calculateur Python/Tkinter:

```text
tools/brutus_derivation_chalkboard.py
```

Fonctions actuelles:

- modification interactive de `f0`;
- modification de `tau`;
- modification de `N`;
- précision décimale réglable;
- recalcul en direct;
- affichage de `f`, `delta_f`, `N*f` et `N*delta_f`;
- présentation visuelle de type tableau à la craie;
- texture de tableau et couche de grain par-dessus les caractères et les lignes.

Lancement:

```bash
python tools/brutus_derivation_chalkboard.py
```

Dépendances utilisées par l'interface:

```text
Python 3
Tkinter
Pillow
```

## Test minimal de non-régression

Avec:

```text
f0=240.1
tau=1e-15
N=2401
```

le calculateur doit retrouver, à la précision choisie, les valeurs de référence v2.0.0 ci-dessus.

Si ce jeu de référence change sans modification volontaire de la formule ou de la précision, le changement doit être traité comme une régression à examiner.

## Forme générale pour plusieurs échelles

Pour une famille de facteurs `N_i`:

```text
f(f0,tau) = f0 / (1 - f0*tau)

delta_f(f0,tau) = f(f0,tau) - f0

R_i = N_i * delta_f(f0,tau)
S_i = N_i * f(f0,tau)
```

Cette forme permet de comparer le même résidu sur plusieurs ordres de grandeur sans changer la relation de base.

## Position dans Brutus

Étiquette actuelle:

```text
CANDIDATE_FORMULA_NUMBER = 15
EVIDENCE_CLASS = CALCUL
PHYSICAL_IDENTIFICATION = NOT_ESTABLISHED
TOOL = tools/brutus_derivation_chalkboard.py
```

Le numéro 15 est un numéro de travail/publication dans la lignée Topbrutus. Il ne constitue pas un classement scientifique externe.

## Brouillon de résumé Zenodo

> Brutus Dérivation v2.0.0 formalise une relation fréquentielle reproductible définie par `1/f0 - 1/f = tau`, soit `f = f0/(1-f0*tau)`. La version 2.0.0 propage explicitement le résidu haute précision `delta_f = f-f0` à une échelle sans dimension `N`. Pour `f0 = 240.1 Hz`, `tau = 10^-15 s` et `N = 2401`, le calcul donne `f = 240.100000000057648... Hz`, `delta_f = 5.764801000001384...e-11 Hz`, `N*delta_f = 1.3841287201003323...e-7` et `N*f = 576480.100000138412...`. Le dépôt inclut un calculateur interactif Python permettant de modifier les paramètres et de reproduire les résultats. Cette publication documente une construction algébrique; aucune identification avec une nouvelle constante ou avec une particule physique n'est revendiquée sans modèle indépendant et validation expérimentale.

## Brouillon de titre Zenodo

```text
Brutus Dérivation v2.0.0 — High-Precision Residual Propagation Across Dimensionless Scales
```

## Mots-clés candidats

```text
Brutus
frequency
high precision
residual propagation
reproducible calculation
algebraic model
240.1
2401
```

## Conditions avant publication Zenodo

Avant une publication finale:

1. figer le commit exact à publier;
2. exécuter le test de référence v2.0.0;
3. confirmer les fichiers inclus dans l'archive;
4. calculer et enregistrer les empreintes des artefacts;
5. vérifier que le dépôt ne contient aucun secret;
6. conserver la frontière `CALCUL != PREUVE PHYSIQUE`;
7. créer ensuite la version/tag correspondant au dépôt Zenodo.

## Références internes

- `tools/brutus_derivation_chalkboard.py`
- `docs/CRYSTALLIZATION_v0.1.md`
- `README.md`

## Invariant de publication

```text
REPRODUCIBLE_ALGEBRA = YES
HIGH_PRECISION_RESIDUAL = YES
DIMENSIONLESS_SCALE_PROPAGATION = YES
NEW_PHYSICAL_CONSTANT = NOT_CLAIMED
HIGGS_IDENTIFICATION = NOT_CLAIMED
EXPERIMENTAL_VALIDATION = NOT_YET_ESTABLISHED
```

La prochaine étape scientifique n'est pas d'ajouter une interprétation plus forte au texte, mais de chercher un modèle indépendant capable de produire une prédiction réfutable et mesurable.
