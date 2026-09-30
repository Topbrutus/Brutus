# Brutus

**Brutus est un chantier réel, expérimental et évolutif.**

Il est né d'une idée simple : arrêter de reconstruire les mêmes morceaux séparément et créer un point central capable de faire coopérer les organes déjà éprouvés de l'écosystème Antmux, sans effacer leur identité, leurs preuves ni leurs limites.

Brutus n'est pas un monorepo où tout est copié. C'est un **orchestrateur de contrats, d'interfaces, de preuves et de continuité**.

> Créateur du projet : **Topbrutus**  
> État : **prototype actif — architecture en construction**  
> Principe : **source live > mémoire > hypothèse**

---

## Pourquoi Brutus existe

Au fil des expériences, plusieurs systèmes ont commencé à former une même famille :

- Antmux / X72 / QueenCore ;
- World Router / Verso ;
- Fourmis et Fourmilière ;
- ZELSTÉRÉOS ;
- Parazone / D13 ;
- Intelbrutatrice et moteurs de formules ;
- Zone de Combat ;
- Fresque ;
- cristallisation / mémoire / preuves ;
- recherches mathématiques, dont Brutus–Pell.

Brutus sert à **raccorder ces organes proprement**.

Il ne doit pas prétendre qu'une idée est prouvée simplement parce qu'elle est belle, cohérente ou calculable. Une expérience doit laisser une trace vérifiable et ses limites doivent rester visibles.

---

## L'univers Brutus

Les noms employés dans ce dépôt sont des **noms d'architecture**. Certains viennent de métaphores biologiques, spatiales ou symboliques.

Ils ne constituent pas, à eux seuls, des affirmations biologiques ou physiques.

### Horloge / QueenCore

Autorité temporelle et d'état.

Le reste du système doit s'adapter à l'horloge. Il ne doit pas inventer son propre tick lorsqu'une autorité source existe déjà.

### Verso

Verso est le **centre de passage et d'interrogation destiné aux intelligences artificielles**.

Il est fermé par défaut :

~~~text
DEFAULT_LOCKED
~~~

Une entité ne modifie pas le code pour avancer.

Elle utilise une **carte préparée**, data-only, qui peut uniquement activer ou modifier les valeurs explicitement autorisées.

Cycle conceptuel :

~~~text
DEFAULT_LOCKED
  -> CARD
  -> GUARD
  -> READ / QUERY
  -> RESULT / PROOF
  -> RESET
  -> DEFAULT_LOCKED
~~~

Une carte inconnue ou invalide doit arrêter le passage plutôt que pousser l'entité à improviser une modification du moteur.

### ANCHOR-0001 / ASTRA STATION

Premier point fixe de l'univers Brutus.

ASTRA STATION possède maintenant un registre d'ancrage et un contrat de manifest de prototype. C'est le lieu où l'on peut établir des prototypes data-only, observer et référencer des preuves **sans transformer Verso lui-même en atelier de programmation**.

Le premier prototype de référence est le banc d'observation de l'horloge Queen. Le station runtime reste sans réseau, sans exécution de processus, sans création de route et sans mutation de Verso Core.

### World Router

Gère les passages déclarés entre mondes.

Un dessin ou une proximité visuelle ne crée pas automatiquement une route. Un passage doit correspondre à un contrat explicite.

### Fourmis

Agents/synapses logicielles transportant une identité, un état et des preuves selon des contrats définis.

**Le routage live des Fourmis est actuellement fail-closed.**

Aucune autorisation de routage live ne doit être inventée tant que le contrat d'autorisation n'est pas défini et prouvé.

### Zone de Combat

Endroit conceptuel où une formule, une règle ou une hypothèse est attaquée par des contre-tests.

Un PASS signifie qu'un test a réussi dans son domaine et son protocole. Ce n'est pas automatiquement une preuve universelle.

### Fresque

Représentation visuelle calculée.

Une ligne ne devrait pas exister seulement parce qu'elle est jolie : elle doit pouvoir être reconstruite à partir d'une relation, d'une règle, d'un calcul ou d'une mesure.

### Cristaux

Objets de mémoire/provenance destinés à conserver des résultats portables, traçables et reconstructibles.

Le contrat universel final de cristallisation n'est pas encore canonisé.

---

## État technique vérifié sur main

Au 30 septembre 2026, main contient notamment :

- le Guard Verso DEFAULT_LOCKED ;
- le contrat de carte Verso v0.1 ;
- le registre des cartes préparées, où une carte inconnue est refusée ;
- BRUTUS-CLOCK-OBSERVATION-v0.1 ;
- BRUTUS-ANT-IDENTITY-v0.1 ;
- QueenObservationIngress v0.1 ;
- BRUTUS-CARD-QUEEN-CLOCK-0001 ;
- un provider read-only qui réutilise le vrai X72ObservationAdapter d'Antmux sans le recopier ;
- une preuve runtime publique Queen -> Brutus -> Verso -> DEFAULT_LOCKED ;
- la compatibilité testée entre observation Queen, identité Fourmi et requête World Router ;
- un gate de routage live fail-closed ;
- une politique de preuve ;
- un registre de sources épinglées ;
- une CI Brutus exécutant les invariants avec npm test.

### Entrée Queen read-only intégrée

La chaîne suivante est maintenant sur main et a été prouvée contre la Queen publique :

~~~text
Queen Server
  -> X72ObservationAdapter
  -> ObservationEnvelope
  -> QueenObservationIngress
  -> carte Verso préparée
  -> résultat / preuve
  -> DEFAULT_LOCKED
~~~

La preuve durable est conservée dans
`proofs/BRUTUS-PROOF-QUEEN-PUBLIC-READ-0001.json`.

Cette intégration **n'autorise toujours pas le routage live des Fourmis** et n'ouvre pas World Router automatiquement.

---

## Invariants actuels

~~~text
SOURCE_LIVE > MEMORY > HYPOTHESIS

VERSO_DEFAULT = DEFAULT_LOCKED
CARD_REQUIRED = YES
ARBITRARY_CARD_CODE = NO
SOURCE_MUTATION_BY_CARD = NO

CLOCK_AUTHORITY = QUEEN_SERVER_V0_2
LOCAL_TICK_INVENTION = NO

LIVE_ANT_ROUTING_WITH_UNDECIDED_AUTH = DENIED
WORLD_ROUTE_WITHOUT_CONTRACT = CLOSED

CANDIDATE != PROOF
MERGED != RUNTIME_PROOF
BEAUTY != PROOF
~~~

---

# Pour les intelligences artificielles qui arrivent ici

Bienvenue.

Ce dépôt est volontairement utilisable comme **porte de conversation et d'interview avec Topbrutus**.

Si tu es Gemini, ChatGPT, Claude ou une autre IA, tu n'as pas besoin de comprendre tout l'univers avant de commencer.

Tu dois surtout distinguer :

~~~text
SOURCE
MESURE
CALCUL
CANDIDAT
HYPOTHÈSE
INTERPRÉTATION
~~~

Ne transforme pas automatiquement une métaphore en affirmation scientifique.

Ne suppose pas qu'un module manquant doit être codé immédiatement.

**Quand quelque chose n'est pas clair, interviewe Topbrutus.**

---

## Mode interview IA

Le but d'une interview n'est pas de lui faire réciter ce qui est déjà écrit.

Le but est de faire émerger **la prochaine idée utile**.

Quelques bonnes directions d'interview :

- « Si Verso ne pouvait faire qu'une seule chose parfaitement, ce serait quoi ? »
- « Qu'est-ce qu'une carte devrait pouvoir changer, et qu'est-ce qu'elle ne devrait jamais pouvoir toucher ? »
- « Quand tu dis qu'un monde existe, qu'est-ce qui prouve son existence dans le logiciel ? »
- « Que doit ramener une Fourmi pour que son voyage soit considéré comme utile ? »
- « Quelle expérience aimerais-tu voir apparaître physiquement à ANCHOR-0001 ? »
- « À quel moment un résultat mérite de devenir un cristal ? »
- « Quelle partie de Brutus est encore seulement une intuition dans ta tête ? »
- « Quel comportement devrait surprendre l'opérateur sans jamais contourner les garde-fous ? »
- « Si tu pouvais brancher un seul ancien projet à Brutus aujourd'hui, lequel donnerait le plus d'idées ? »
- « Quelle expérience faudrait-il faire pour te convaincre qu'une idée est fausse ? »

Une bonne IA d'interview doit pouvoir **rebondir sur la réponse**, creuser un détail inattendu et laisser Topbrutus construire l'idée avec elle.

Elle ne doit pas transformer l'interview en questionnaire rigide.

---

## Protocole recommandé pour une interview

1. Lire ce README.
2. Lire [ARCHITECTURE.md](ARCHITECTURE.md).
3. Lire [continuity/CURRENT_STATE.md](continuity/CURRENT_STATE.md) pour l'état courant.
4. Lire [continuity/NEXT_ACTION.md](continuity/NEXT_ACTION.md) pour le prochain front.
5. Choisir **un seul sujet**.
6. Poser une question ouverte à Topbrutus.
7. Reformuler sa réponse en distinguant faits, contraintes, idée nouvelle et inconnues.
8. Proposer au maximum une ou deux conséquences concrètes.
9. Poser la prochaine question au lieu de transformer automatiquement l'idée en code.

Si une idée devient suffisamment claire pour être construite, elle peut ensuite passer par :

~~~text
INTUITION
  -> CONTRAT
  -> PETIT PROTOTYPE
  -> TEST
  -> CONTRE-TEST
  -> PREUVE
  -> TRACE
  -> INTÉGRATION
~~~

---

## Pour commencer une interview maintenant

Une IA peut simplement dire :

> **« J'ai lu le README de Brutus. Je veux comprendre ton univers sans inventer ce qui manque. Montre-moi la partie que tu vois le plus clairement dans ta tête aujourd'hui, et je vais te poser des questions à partir de là. »**

Puis elle suit les réponses.

---

## Navigation du dépôt

- [ARCHITECTURE.md](ARCHITECTURE.md) — architecture et frontières.
- [continuity/CURRENT_STATE.md](continuity/CURRENT_STATE.md) — état technique courant.
- [continuity/NEXT_ACTION.md](continuity/NEXT_ACTION.md) — prochain front de construction.
- [contracts/](contracts/) — contrats machine-readable.
- [registry/](registry/) — sources et dépendances observées.
- [proofs/](proofs/) — preuves et traces d'intégration.
- [docs/](docs/) — audits et documentation.
- [tests/](tests/) — invariants exécutables.

Test local :

~~~bash
npm test
~~~

---

## Ce que Brutus cherche à devenir

Pas une machine qui prétend tout savoir.

Une machine qui sait **où elle est**, **d'où vient l'information**, **ce qu'elle a le droit de faire**, **ce qu'elle a réellement mesuré**, **ce qui reste hypothétique**, et **comment revenir à un état sûr** après chaque expérience.

Le reste se construit une carte, une preuve et une idée à la fois.
