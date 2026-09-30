# Audit — réutilisation X72ObservationAdapter pour l'entrée Queen de Brutus

Date: 2026-09-30

## Source pin

Repository source: `Topbrutus/Antmux`

HEAD audité:
`bed68dbf0b8061b92ef15a9a9c5ae96d6cfc2e6b`

Source existante:
`deploy/x72-shared-queen/observation_adapter/adapter.py`

Documentation:
`deploy/x72-shared-queen/docs/OBSERVATION-ADAPTER-v1.md`

## Constat

Antmux possède déjà `X72ObservationAdapter`.

Il est explicitement construit comme consommateur read-only de Queen Server et expose des observations issues de:

- `GET /api/health`
- `GET /api/telemetry`
- `GET /api/state`
- `GET /api/events`
- `GET /api/report`
- `WS /ws`

Il ne contient pas de transport de mutation Queen.

Il conserve une identité Queen unique par instance, produit les statuts `FRESH | STALE | UNKNOWN`, et transporte le dernier état réel lors d'une déconnexion WebSocket au lieu d'inventer un état zéro.

## Décision

Brutus ne crée PAS un deuxième observateur réseau Queen.

La frontière Brutus reçoit seulement les `ObservationEnvelope` déjà produits par l'adaptateur Antmux.

Chaîne retenue:

```text
QueenCore
  -> persistence
  -> API / WebSocket
  -> X72ObservationAdapter        [Antmux]
  -> ObservationEnvelope
  -> QueenObservationIngress      [Brutus]
  -> consommateur read-only
```

Aucun appel World Router n'est inclus dans cette frontière.

## Invariants Brutus

`BRUTUS-QUEEN-INGRESS-v0.1` impose:

- source Queen = `QUEEN_SERVER_V0_2`;
- endpoints d'état seulement: `/api/state` ou `/ws`;
- continuité stricte de `entity_id`;
- `FRESH + integrity_match=true` requis pour `USABLE=true`;
- `STALE` conservé mais jamais utilisable en aval;
- `UNKNOWN` explicite et sans synthèse de clock;
- mismatch d'intégrité = fail-closed immédiat;
- retry borné seulement pour `STALE / UNKNOWN` ou erreur de lecture;
- maximum absolu de 10 tentatives;
- aucun tick local;
- aucun HTTP de mutation;
- aucun déclenchement automatique de World Router.

## Retry / backoff

Valeurs par défaut:

```text
maxAttempts = 3
baseDelayMs = 50
maxDelayMs = 250
```

Le backoff double jusqu'à la limite.

Le lecteur réel est injecté comme fonction read-only. Brutus ne choisit pas lui-même le transport réseau.

## Preuve locale candidate

Nouveaux tests:
`tests/queen-observation-ingress.test.mjs`

Résultat avant commit:
`9 PASS / 0 FAIL`

Ce résultat est un test local ciblé, pas encore la preuve CI complète du dépôt.

## Boundary

`LIVE ANT ROUTING = DENIED` reste inchangé.

Ce module ouvre une entrée d'observation Queen contrôlée.
Il n'ouvre aucun transport inter-mondes.
