# Brutus Top-Tique Quantum — Formule 15 — v2.0.0

**Auteur : Gabriel Saint-Pierre (Topbrutus)**  
**Date : 2026-10-05**  
**Statut : CALCUL ALGÉBRIQUE REPRODUCTIBLE / CANDIDAT**

## Objet

**Brutus Top-Tique Quantum** est le nom de publication retenu pour la quinzième formule de la lignée Topbrutus.

Le présent document décrit une relation fréquentielle reproductible, son résidu haute précision et sa propagation à une échelle sans dimension `N`.

Cette note distingue explicitement :

- `CALCUL` — résultat dérivé algébriquement ;
- `CANDIDAT` — usage proposé dans Brutus ;
- `HYPOTHÈSE` — proposition encore à tester ;
- `INTERPRÉTATION` — lecture physique éventuelle qui exige un modèle indépendant et une expérience.

## Relation générale

Point de départ :

```text
1/f0 - 1/f = tau
```

avec :

- `f0` : fréquence de base, en hertz ;
- `f` : fréquence dérivée, en hertz ;
- `tau` : décalage temporel, en secondes.

Résolution :

```text
f = f0 / (1 - f0*tau)
```

Résidu :

```text
delta_f = f - f0
```

Propagation par une échelle sans dimension `N` :

```text
Nf = N*f
N_delta_f = N*delta_f
```

Forme exacte du résidu :

```text
delta_f = (f0^2 * tau) / (1 - f0*tau)
```

Variable de contrôle sans dimension :

```text
x = f0*tau
f/f0 = 1/(1-x)
delta_f/f0 = x/(1-x)
```

## Domaine

Le dénominateur doit rester non nul :

```text
1 - f0*tau != 0
```

Pour `f0 > 0` et `tau > 0`, la branche positive utilisée par le calculateur actuel exige :

```text
f0*tau < 1
```

## Référence reproductible v2.0.0

Entrées :

```text
f0  = 240.1 Hz
tau = 1e-15 s
N   = 2401
```

Résultat haute précision :

```text
f = 240.1000000000576480100000138412872... Hz
```

Résidu :

```text
delta_f = 5.76480100000138412872...e-11 Hz
```

Propagation :

```text
N*delta_f = 1.38412872010033232930...e-7 Hz
N*f       = 576480.1000001384128720100332... Hz
```

Ces valeurs sont des résultats de comptabilité algébrique reproductible.

## Outil reproductible

Le dépôt contient le calculateur :

```text
tools/brutus_derivation_chalkboard.py
```

Il permet de modifier `f0`, `tau`, `N` et la précision décimale, puis de recalculer automatiquement `f`, `delta_f`, `N*f` et `N*delta_f`.

Lancement :

```bash
python tools/brutus_derivation_chalkboard.py
```

Dépendances : Python 3, Tkinter et Pillow.

## Frontière scientifique

Cette construction **ne démontre pas**, à elle seule :

- une nouvelle constante fondamentale ;
- une nouvelle particule ;
- une relation avec le boson de Brout-Englert-Higgs ;
- une fréquence universelle de la conscience ;
- une propriété biologique, neurologique ou cosmologique ;
- une causalité physique derrière les valeurs numériques utilisées.

Toute revendication de ce type demeure `HYPOTHÈSE` ou `INTERPRÉTATION` tant qu'elle n'est pas soutenue par un modèle indépendant et une validation expérimentale.

## Identité de publication

```text
PUBLICATION_NAME = Brutus Top-Tique Quantum
FORMULA_NUMBER = 15
VERSION = 2.0.0
AUTHOR = Gabriel Saint-Pierre
ALIAS = Topbrutus
EVIDENCE_CLASS = CALCUL
PHYSICAL_IDENTIFICATION = NOT_ESTABLISHED
REPRODUCIBLE_TOOL = tools/brutus_derivation_chalkboard.py
```

## Titre Zenodo proposé

```text
Brutus Top-Tique Quantum v2.0.0 — Formula 15: High-Precision Residual Propagation Across Dimensionless Scales
```

## Résumé Zenodo proposé

> Brutus Top-Tique Quantum v2.0.0 formalise une relation fréquentielle reproductible définie par `1/f0 - 1/f = tau`, soit `f = f0/(1-f0*tau)`. La version 2.0.0 propage explicitement le résidu haute précision `delta_f = f-f0` à une échelle sans dimension `N`. Pour `f0 = 240.1 Hz`, `tau = 10^-15 s` et `N = 2401`, le calcul donne `f = 240.100000000057648... Hz`, `delta_f = 5.764801000001384...e-11 Hz`, `N*delta_f = 1.3841287201003323...e-7 Hz` et `N*f = 576480.100000138412... Hz`. Le dépôt inclut un calculateur interactif Python permettant de modifier les paramètres et de reproduire les résultats. Cette publication documente une construction algébrique reproductible ; aucune nouvelle constante ni identification de particule n'est revendiquée sans modèle indépendant et validation expérimentale.

## Mots-clés

```text
Brutus Top-Tique Quantum
Brutus
Formula 15
frequency
high precision
residual propagation
reproducible calculation
algebraic model
240.1
2401
```

## Invariant de publication

```text
REPRODUCIBLE_ALGEBRA = YES
HIGH_PRECISION_RESIDUAL = YES
DIMENSIONLESS_SCALE_PROPAGATION = YES
NEW_PHYSICAL_CONSTANT = NOT_CLAIMED
HIGGS_IDENTIFICATION = NOT_CLAIMED
EXPERIMENTAL_VALIDATION = NOT_YET_ESTABLISHED
```

## Références internes

- `tools/brutus_derivation_chalkboard.py`
- `docs/BRUTUS_DERIVATION_FORMULA_15_CANDIDATE_v2.0.0.md`
- `docs/CRYSTALLIZATION_v0.1.md`
- `README.md`
