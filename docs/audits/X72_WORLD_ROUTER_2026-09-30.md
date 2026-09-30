# Audit interface — Horloge X72 <-> World Router

Date: 2026-09-30

## Source pin

Repository: Topbrutus/Antmux
HEAD audité: d9b1ebd4f0184caa9f537ed64b2bf5ff0e4eba5e

Fichiers lus directement:

- deploy/x72-shared-queen/docs/OBSERVATION-ADAPTER-v1.md
  blob 4750180b8cef9d95ecb247ec79c93f6e9693eff5
- deploy/x72-shared-queen/observation_adapter/adapter.py
  blob b73950c7f7450afae17149c490a911a2c0aa2645
- deploy/x72-shared-queen/app/server.py
  blob b1259ef9223c6cd9ae18089a73848608334f522c
- laboratoire/c3rutus/world-router.mjs
  blob a4e1d4d90f084edcf50b579a7a38d2a8a3a03e35
- laboratoire/c3rutus/roundtrip.mjs
  blob de4794358f54b76ddd9c2ae9e041e068bab7b728
- laboratoire/c3rutus/tests/roundtrip.test.mjs
  blob 0f0300cf633b7e575180f060d329d5870df8fd46

## SOURCE — Horloge / Queen

La chaîne autoritaire existante est déjà définie comme:

    QueenCore -> persistence -> API/WebSocket -> X72ObservationAdapter -> consumers

Le consumer officiel est explicitement read-only.

Entrées read-only observées:
- GET /api/health
- GET /api/telemetry
- GET /api/state
- GET /api/events
- GET /api/report
- WS /ws

Le VisualState partagé contient notamment:
- source = QUEEN_SERVER_V0_2
- entity_id
- tick_count
- generation
- queen_mode
- integrity_match
- reference_h256
- noyau_runtime
- synapses
- relations

Le flux WS /ws envoie queen.visual_state() et ne demande pas au consumer de créer un tick local.

## SOURCE — World Router

transportEnvelope exige:
- antId
- from
- to
- tick
- state
- proofRef
- echo

Le routeur:
- ferme UNKNOWN_WORLD;
- ferme NO_PORTAL_CONTRACT;
- autorise SAME_WORLD;
- autorise un passage lorsqu'un contrat de portail existe;
- conserve antId, tick, state, proofRef et echo dans invariant.

Le contrat de démonstration actuel est PORTAL-CARBON-CRYPTO-01, réversible, via VERSO-GLOBAL-01.

## MESURE / preuve d'exécution source

Le test source WORLD-ROUNDTRIP-0001 a été relancé depuis les fichiers bruts du HEAD épinglé, sans mutation du dépôt source.

Résultat:
- 4 tests;
- 4 PASS;
- 0 FAIL.

Les cas couvrent le roundtrip Carbon -> Crypto -> Carbon, la conservation des invariants, la trace ordonnée/immuable et la fermeture sans contrat de portail.

## INTERPRÉTATION — trou réel d'interface

QueenCore et World Router ne parlent pas le même objet.

Queen expose une identité de Reine:
- entity_id

World Router transporte une identité de Fourmi:
- antId

Correspondances sûres:
- Queen tick_count -> observation TICK
- Queen source/entity_id -> provenance de l'observation
- Queen integrity_match/reference_h256 -> contrôle de provenance/intégrité

Correspondance interdite:
- entity_id -> antId

Brutus ne doit jamais inventer une Fourmi en renommant l'identité de la Reine.

## DÉCISION

Introduire un contrat intermédiaire:

    X72 ObservationEnvelope
      -> BRUTUS-CLOCK-OBSERVATION-v0.1
      -> explicit ANT_ID attachment
      -> World transport request
      -> Antmux transportEnvelope

La première version reste:
- read-only;
- sans mutation Queen;
- sans tick local;
- sans création automatique de route;
- sans antId synthétique;
- bloquée si observation STALE;
- bloquée si integrity_match != true.

## Frontière de preuve

Cet audit ne prouve pas encore:
- une connexion réseau live Brutus -> Queen;
- l'appel du World Router depuis Brutus en production;
- un transport d'une vraie Fourmi issue de la Fourmilière.

Il prouve la forme des interfaces au SHA audité et le fonctionnement du roundtrip source réexécuté.
