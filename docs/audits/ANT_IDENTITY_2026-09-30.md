# Audit — identité Fourmi / ANT_ID

Date: 2026-09-30

## Source pin

Repository: Topbrutus/Antmux
HEAD audité: d9b1ebd4f0184caa9f537ed64b2bf5ff0e4eba5e

Fichiers:
- deploy/x72-shared-queen/app/ant_birth.py
  blob 451736f40ae2e8e5a92a98861b5885ae678629e5
- deploy/x72-shared-queen/app/public_journal.py
  blob 9b82a912d96c86c2bda9d5d43f7f8c75f4eaff08
- deploy/x72-shared-queen/tests/test_public_journal.py
  blob 3ca2ed5a925c6d93d769d4e31280974c74df8855

## SOURCE — génération de l'identité

Le chemin de naissance public actuellement implémenté fait:

    post_id = "ANT-" + uuid.uuid4().hex[:12].upper()
    ant_receipt = build_ant_birth(post_id, title, body, now)

Le même identifiant est ensuite:
- retourné comme id de la soumission;
- écrit dans ants.id;
- écrit dans ants.post_id;
- écrit dans le reçu comme ant_id;
- placé dans project_soul.lineage[0].

Le contrat source de naissance est:
ANTMUX-ANT-BIRTH-v1.

## SOURCE — état de la Fourmi à la naissance

Le reçu produit:
- role = SYNAPSE;
- state = SINGING_TO_MEET;
- form = DUMPTY_EGG;
- project_soul.memory_id;
- project_soul.birth_tick_ms;
- project_soul.lineage;
- lifecycle.

Le lifecycle marque déjà DONE:
1. ANT_BIRTH
2. CONDITIONAL_ROUTING
3. BAGGAGE_ATTACHED
4. LIFE_CLOCK_ASSIGNMENT
5. DUMPTY_EGG
6. BECOME_SYNAPSE

Puis:
7. SINGING_TO_MEET = ACTIVE
8. MEETING = WAITING
9. RECOMBINATION = WAITING
10. EXPERIENCE = WAITING

## MESURE — test source réexécuté

Le test public_journal du SHA épinglé a été relancé dans un harness temporaire.

Résultat:
- PUBLIC_JOURNAL_RATE_LIMIT=PASS
- PUBLIC_JOURNAL_PRIVACY=PASS
- PUBLIC_JOURNAL_MODERATION=PASS
- PUBLIC_JOURNAL_ADMIN_GATE=PASS
- PUBLIC_JOURNAL_EMOJI_FRAMING=PASS
- PUBLIC_JOURNAL_ANT_BIRTH=PASS
- PUBLIC_JOURNAL_DUMPTY_BEFORE_SONG=PASS
- PUBLIC_JOURNAL_SONG_BEFORE_MEETING=PASS
- PUBLIC_JOURNAL_ANT_SYNAPSE=PASS
- exit code 0.

Aucun fichier source Antmux n'a été modifié.

## DÉCISION — identité canonique observée

Pour le chemin de naissance public audité:

    ANT_ID = ant_receipt.ant_id = post_id = ants.id

Format actuel:

    ANT-[0-9A-F]{12}

Ce format est un contrat Brutus audité à ce SHA, pas une promesse que tous les futurs producteurs de Fourmis utiliseront éternellement le même format.

## Frontière temporelle critique

public_journal.py calcule:

    now = time.time()

puis ant_birth.py calcule:

    birth_tick_ms = int(created_at * 1000)

Donc birth_tick_ms est un timestamp mural en millisecondes issu de time.time().

Il n'est PAS le tick maître QueenCore.

Brutus le renomme explicitement BIRTH_WALLCLOCK_MS afin d'empêcher toute confusion.

Le tick utilisé pour World Router doit continuer à venir de BRUTUS-CLOCK-OBSERVATION-v0.1 / Queen tick_count.

## Frontière de routage

Le reçu prouve qu'une identité existe et que BECOME_SYNAPSE est DONE.

Il ne prouve pas à lui seul qu'une politique de routage production autorise automatiquement toute Fourmi SINGING_TO_MEET à traverser un monde.

Brutus conserve donc:

    ROUTING_AUTHORIZATION = UNDECIDED

jusqu'à ce qu'un contrat de politique explicite soit trouvé ou créé et testé.
