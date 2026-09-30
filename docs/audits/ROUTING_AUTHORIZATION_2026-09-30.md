# Audit — autorisation de routage Fourmi

Date: 2026-09-30

## Source pin

Repository: Topbrutus/Antmux
HEAD audité: d9b1ebd4f0184caa9f537ed64b2bf5ff0e4eba5e

## Question

Une Fourmi née avec:
- schema ANTMUX-ANT-BIRTH-v1;
- role SYNAPSE;
- BECOME_SYNAPSE = DONE;
- state SINGING_TO_MEET;

est-elle déjà autorisée par une règle existante à entrer dans World Router?

## SOURCE — public_journal.py

Le fichier complet audité expose ces routes:

- GET /api/journal/config
- GET /api/journal/public
- POST /api/journal/submit
- POST /api/journal/admin/publish
- POST /api/journal/admin/moderate/{post_id}

Le chemin POST /submit retourne le reçu de naissance au moment de la création et l'enregistre dans la table ants.

Aucune route GET dédiée à:
- /ants
- /ant/{id}
- /receipts

n'est exposée dans ce router au SHA audité.

Conclusion locale:
un reçu de naissance est observable au moment de POST /submit et persistant dans SQLite, mais public_journal.py ne fournit pas encore une API read-only de récupération des reçus existants.

## SOURCE — recherche de politique de routage

Recherches ciblées dans le dépôt:
- SINGING_TO_MEET + route
- ANT_READY_TO_SING + route
- ant_id + world
- transportEnvelope + ant identity

Résultat:
aucun contrat trouvé qui relie l'état de naissance SINGING_TO_MEET à une autorisation opérationnelle World Router.

Les références World Router existantes exigent et conservent ANT_ID, TICK, STATE, PROOF_REF et ECHO, mais le routeur lui-même ne valide pas le lifecycle de naissance d'une Fourmi.

## INTERPRÉTATION

Deux choses sont séparées:

1. Compatibilité de transport
   Brutus sait produire un envelope compatible avec le routeur épinglé.

2. Autorisation opérationnelle
   Aucune politique source auditée ne dit encore quelle Fourmi née peut être envoyée en production.

La première est PROUVÉE.
La seconde reste INCONNUE / NON SPÉCIFIÉE.

## DÉCISION

Brutus doit rester fail-closed:

    ROUTING_AUTHORIZATION = UNDECIDED
    => LIVE ROUTING = DENIED

Les harnesses de compatibilité peuvent continuer avec des identités déterministes de test.

Aucune identité de test ne doit être promue silencieusement en identité de déploiement.

## Prochaine ouverture nécessaire

Pour autoriser le routage live, il faudra un contrat séparé et explicite définissant au minimum:
- ANT_ID;
- autorité émettrice;
- état/lifecycle admissible;
- TICK Queen associé;
- PROOF_REF;
- scope/route autorisés;
- expiration ou révocation si nécessaire.

Ce contrat n'est pas inventé dans cet audit.
