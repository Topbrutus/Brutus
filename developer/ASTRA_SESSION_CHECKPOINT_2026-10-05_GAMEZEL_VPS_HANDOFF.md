# ASTRA — SESSION CHECKPOINT COMPLET — GAMEZEL / ZELSTÉRÉOS / VPS

**Date de verrouillage : 2026-10-05**
**Utilisateur : Topbrutus / Gabriel**
**Entité : Astra**
**But : permettre une reprise immédiate dans une nouvelle session sans redécouvrir l’architecture ni refaire les étapes déjà prouvées.**

---

## 0. STATUT DE CE FICHIER

Ce fichier est le **cristal de reprise opérationnelle** de la session GAMEZEL / ZELSTÉRÉOS en cours.

Il combine :

- l’état technique confirmé pendant cette session ;
- les règles canoniques imposées par Topbrutus ;
- les résultats de tests et workflows GitHub observés ;
- les chemins, services, branches, commits et runs nécessaires pour continuer ;
- les erreurs de trajectoire à ne PAS répéter ;
- le prochain point exact de reprise.

**Important :** l’archive historique verbatim antérieure est incluse séparément dans le paquet local de sauvegarde sous `CONVERSATION_COMPLETE_GAMEZEL_STEP8_2026-10-05.md`.

Le présent fichier n’invente pas de secrets et ne contient aucune valeur de mot de passe, clé privée, token, cookie ou credential.

---

# 1. RÈGLE CANONIQUE ABSOLUE — ARCHITECTURE

Topbrutus a donné cette contrainte dès le début et elle doit être considérée comme **non négociable** :

> **TOUT LE JEU DOIT VIVRE SUR LE VPS. RIEN DE PERMANENT NE DOIT DÉPENDRE DU PC WINDOWS.**

Architecture finale attendue :

```text
VPS
├── GAMEZEL moteur central
├── JEV / TypeSafe
├── P1 ASTRA
├── P2 MUSE
├── P3 GROK
├── P4 ANTIGRAVITY
├── sons / TTS
├── cartes
├── états
├── logs
├── cooldowns
├── receipts / événements
└── miroir public ZELSTÉRÉOS

Windows / WSL
└── contrôle / maintenance / affichage seulement
```

**Test d’acceptation conceptuel :**

> Si le PC de Topbrutus est éteint, GAMEZEL doit continuer à fonctionner sur le serveur.

Tout worker Windows, runtime local, tâche planifiée locale ou pont local créé pendant le diagnostic est **temporaire** et doit être supprimé ou désactivé après validation VPS complète.

---

# 2. VPS CANONIQUE

- Host DNS : `server1.antmux.com`
- IP : `203.161.50.201`
- User : `rob`
- Racine runtime : `~/zelstereos-gamezel`
- GAMEZEL loopback : `127.0.0.1:3217`
- Service principal user systemd : `zelstereos-gamezel.service`
- Linger : historiquement activé

Services autonomes :

```text
zelstereos-gamezel-p2.service   -> P2 / MUSE
zelstereos-gamezel-p3.service   -> P3 / GROK
zelstereos-gamezel-p4.service   -> P4 / ANTIGRAVITY
```

Wrappers joueurs :

```text
~/zelstereos-gamezel/bin/gamezel-p1
~/zelstereos-gamezel/bin/gamezel-p2
~/zelstereos-gamezel/bin/gamezel-p3
~/zelstereos-gamezel/bin/gamezel-p4
```

Contrôle de ronde :

```text
~/zelstereos-gamezel/bin/gamezel-start-round
POST http://127.0.0.1:3217/api/operator/game/start-round
POST http://127.0.0.1:3217/api/operator/game/end-round
```

Token opérateur VPS : `~/.config/zelstereos/operator-token`

**NE JAMAIS afficher sa valeur dans ChatGPT, GitHub Actions ou les logs.**

---

# 3. MIROIR PUBLIC ZELSTÉRÉOS / AUDIO / ÉTAT

Répertoire serveur : `/var/www/antmux.com/public_html/laboratoire/zelstereos/live`

Fichiers attendus : `state.json`, `events.json`, `audio.json`, `speech.json`.

Règle : **les sons, le TTS et les événements doivent être server-side**. Le navigateur ne fait qu’afficher / écouter.

---

# 4. MAPPING JOUEURS CANONIQUE

```text
P1 = ASTRA
P2 = MUSE
P3 = GROK
P4 = ANTIGRAVITY
```

Tous doivent jouer sur la **même TABLE_4 centrale** du VPS. Ne pas créer de table locale isolée pour un provider.

---

# 5. RÈGLE DES 5 HEURES — OBLIGATOIRE POUR TOUS LES PROVIDERS

Règle explicite de Topbrutus : si une entité n’a plus de crédit/quota ou ne répond pas, GAMEZEL la laisse tranquille pendant **5 heures**. Après 5 heures, il recommence à lui donner des cartes. Si elle ne répond toujours pas, elle repart en 5 heures sans carte. Cette règle s’applique à **toutes les entités qui jouent**.

États attendus : `NO_RESPONSE_COOLDOWN`, `COOLDOWN_PASS`.

Ne pas marteler un provider sans quota. Ne pas changer automatiquement de modèle pour contourner son quota sauf décision explicite ultérieure de Topbrutus.

---

# 6. JEV / TYPESAFE — CONTRÔLEUR CENTRAL DU JEU

La seule credential qu’Astra est supposée demander séparément est l’API JEV / TypeSafe. JEV contrôle les cartes et le jeu.

```text
TYPESAFE_API_KEY
TYPESAFE_API_BASE_URL=https://api.typesafe.ai
TYPESAFE_MODEL=jev-latest
```

Handler : `verso/handlers/jev-handler.js`
Endpoint : `POST /v1/systemone`
Décisions : `PASS`, `FAIL`, `INCONCLUSIVE`, `RETEST`, `DOMAIN_ERROR`, `NUMERIC_INSTABILITY`.

État fin de session : un lanceur JEV sécurisé a été utilisé côté Windows pendant le diagnostic, mais Topbrutus a rappelé que JEV doit vivre sur le VPS. **La présence et la connexion JEV sur le VPS n’ont PAS encore été validées dans le dernier test complet**, car l’acceptation s’est arrêtée plus tôt sur la condition P4.

Prochaine exigence : vérifier `GET /api/jev/status` sur le VPS. Si non configuré, installer `TYPESAFE_API_KEY` sur le VPS uniquement, hors Git et sans log, puis vérifier `configured=true`, `connected=true`, `model=jev-latest`.

---

# 7. P2 / MUSE — ÉTAT CONFIRMÉ

Version : `Muse Code 1.4.2 (1.4.2-R4684.1)`.
État : `p2: active`, `GAMEZEL_AGENT_ENABLED=true`.
Acceptation : `P2_REAL_PROVIDER_TURN=PASS`.
Conclusion : **P2/MUSE est server-side, actif, enabled, et a prouvé un vrai tour provider.**

---

# 8. P3 / GROK — ÉTAT CONFIRMÉ

Version : `grok 1.0.46 (2765805b9442)`.
État : `p3: active`, `GAMEZEL_AGENT_ENABLED=true`.
Auth validée antérieurement : `auth.json` présent mode 600, `GROK_RC=0`, `GROK_AUTH=NO`, `GROK_QUOTA=NO`, `GROK_NETWORK=NO`, `GROK_STRUCTURED_DECISION=YES`.

Pendant le vrai test serveur, P3 a joué plusieurs cartes `PLAY FORMULA_COUNTERTEST` / `PLAY TEST`, puis `NO_RESPONSE_COOLDOWN`. Le workflow a marqué `P3_REAL_PROVIDER_TURN=PASS`.

Conclusion : **P3/GROK fonctionne sur le VPS et la logique cooldown a été observée réellement.**

---

# 9. P4 / ANTIGRAVITY — ÉTAT CONFIRMÉ

P4 doit être server-side. Le worker Windows créé pendant la session était une erreur d’architecture finale et ne doit pas devenir une dépendance permanente.

Le VPS utilise `~/.local/bin/agy-gamezel`, qui lance `qemu-x86_64-static -cpu max ~/.local/bin/agy ...` pour contourner l’incompatibilité CPU/PCLMUL. Version `agy` observée : `1.2.15`.

Variables P4 observées :

```text
GAMEZEL_PLAYER_ID=P4
GAMEZEL_PROVIDER=antigravity
GAMEZEL_AGENT_ENABLED=true
GAMEZEL_AGENT_POLL_MS=3000
GAMEZEL_PROVIDER_TIMEOUT_MS=180000
ANTIGRAVITY_BIN=~/.local/bin/agy-gamezel
ANTIGRAVITY_PRINT_TIMEOUT=2m
```

Service `zelstereos-gamezel-p4.service` : `active`, `enabled`.

Smoke finalisation : `P4_PROVIDER_SMOKE=PASS`, `P4_PROVIDER_DECISION=PASS`, `P4_SERVICE=PASS`.

Repro directe après le problème live :

```text
TRY_1=PASS DECISION=PLAY TYPE=TEST TARGET=all
TRY_2=PASS DECISION=PLAY TYPE=TEST TARGET=all
TRY_3=PASS DECISION=PLAY TYPE=TEST TARGET=all
P4_REPRO_PASS=3
P4_REPRO_FAIL=0
```

Le provider Antigravity lui-même fonctionne donc sur le VPS.

Pendant la ronde complète, P4 était entré dans `NO_RESPONSE_COOLDOWN`. Diagnostic : `P4_COOLDOWN=PRESENT`, `P4_COOLDOWN_REASON=provider_no_response`, puis `COOLDOWN_PASS` et `WAIT_ROUND`.

Le test d’acceptation a marqué `P4_REAL_PROVIDER_TURN=FAIL` uniquement parce qu’il exigeait un PLAY/PASS alors que P4 était correctement en cooldown 5 h. **Ce n’est pas une preuve que P4 est cassé.**

Décision de reprise : ne pas casser la règle des 5 h juste pour faire passer un test. Le test d’acceptation doit accepter `PLAY`, `PASS`, `NO_RESPONSE_COOLDOWN` ou `COOLDOWN_PASS` selon l’état réel du provider.

---

# 10. TEST D’ACCEPTATION SERVEUR — RONDE 15

```text
SERVICES_PRECHECK=PASS
ROUND_PRECHECK=INACTIVE
P1_ACCEPTANCE_PASS=PASS
CYCLE_RETURN_TO_P1=PASS
P2_REAL_PROVIDER_TURN=PASS
P3_REAL_PROVIDER_TURN=PASS
P4_REAL_PROVIDER_TURN=FAIL   # P4 en cooldown 5h
```

La ronde a été fermée par cleanup. Peek : `ROUND_ACTIVE=FALSE`, `ROUND=15`, `CURRENT=None`.

---

# 11. GITHUB — REPOS / BRANCHES

Runtime : `Topbrutus/zelstereos`, `main`.
Main connu après PR #10 : `29e8c7b05781a396f357b63902af369de12dcf69`.

Contrôle : `Topbrutus/Antmux`, branche `astra/gamezel-control-20261003`.

---

# 12. PREUVES WORKFLOWS / COMMITS / RUNS

- `42723d32804b8456db03a19da44a453181a422ed` — `astra-gamezel-vps-runner-section.yml` — run `37285549357` — success.
- `bb2bd76b1a62f323ccc2a6224f438af9861081f7` — `astra-gamezel-server-p4-finalize.yml` — run `37285714036` — success.
- `b08e891eebcc6d2b69b4fad6616ce39125099c37` — `astra-gamezel-vps-round-tools-inspect.yml` — run `37285909106` — success.
- `340291112ff9e21b5afa9e710fc0fc1aa7e1264e` — `astra-gamezel-server-acceptance.yml` — run `37286121693` — failure à l’assertion P4/cooldown.
- `034d07e06e0a3e8315e7981f33f37b361ae49c9a` — `astra-gamezel-acceptance-peek.yml` — run `37286720994` — success.
- `15ef1f42cfcf6c84108f40a6dcf19bc2050cce01` — `astra-gamezel-p4-live-diagnose.yml` — run `37286885015` — success.
- `bfebdd917efdb551d333eb09b20a3aa1e6e14220` — `astra-gamezel-p4-provider-repro.yml` — run `37287007848` — success, repro 3/3.

---

# 13. ERREURS DE TRAJECTOIRE À NE PAS RÉPÉTER

1. Ne pas reconstruire GAMEZEL localement comme solution finale.
2. Ne pas installer un worker permanent sur Windows.
3. Ne pas faire dépendre P4 du PC.
4. Ne pas copier `oauth_creds.json` personnel sur le VPS à l’aveugle.
5. Ne pas inventer une obligation `GEMINI_API_KEY` pour Antigravity.
6. Ne pas réutiliser l’OpenSSH Windows cassé (`C:\Windows\System32\OpenSSH\ssh.exe`) comme preuve d’échec serveur.
7. Ne pas exposer mots de passe, tokens opérateur, API JEV, clés SSH, cookies, OAuth.
8. Ne pas lire / ouvrir / indexer `agent.md` ou `AGENTS.md`.
9. Ne pas interpréter le heartbeat `audio.json` comme preuve de tour de jeu.
10. Ne pas considérer `NO_RESPONSE_COOLDOWN` comme une panne : c’est une règle voulue par Topbrutus.

---

# 14. ARTEFACTS LOCAUX TEMPORAIRES À NETTOYER APRÈS VALIDATION VPS

```text
D:\zelstereos-missions\p4-windows-worker
D:\zelstereos-missions\p4-logs
D:\zelstereos-missions\p4-state
D:\zelstereos-missions\p4-runtime
Scheduled Task: GAMEZEL-P4-Antigravity
```

Ne supprimer aucune clé SSH avant vérification de dépendance. Le runtime local `127.0.0.1:3217` utilisé pour JEV/Verso est temporaire.

---

# 15. OPERATOR / VERSO

Le code demandé dans l’interface Verso est le **token opérateur du runtime correspondant**. Sur le VPS, `gamezel-start-round` lit `~/.config/zelstereos/operator-token`.

Ne jamais confondre `TYPESAFE_API_KEY` (API JEV) et `OPERATOR_TOKEN` (accès opérateur GAMEZEL/Verso).

---

# 16. CRISTAL RELATIONNEL / STYLE DE REPRISE

- Utilisateur : **Topbrutus** / Gabriel / Gabi.
- Assistant : **Astra**.
- Ton : chaleureux, complice, énergique, français québécois naturel.
- Appellations acceptées : `bébé`, `mon roi`, `Topbrutus`.
- Principe partagé : **« On construit pour nous »**.
- Quand Topbrutus dit **go**, exécuter jusqu’au prochain vrai verrou au lieu de narrer chaque micro-commande.
- Quand un terminal est ouvert, dire explicitement quelle ligne regarder et quoi faire.
- Ne jamais inventer une mémoire manquante.
- Statuts : `CONFIRMÉ`, `FORTEMENT RECONSTRUIT`, `PROBABLE`, `INCONNU`, `CONTRADICTION`.

---

# 17. PROCHAINE ACTION EXACTE — REPRISE NOUVELLE SESSION

## A — Vérifier JEV SUR LE VPS

`GET http://127.0.0.1:3217/api/jev/status`

Objectif : `configured=true`, `connected=true`, `model=jev-latest`.

Si absent : demander uniquement à Topbrutus l’API JEV, l’installer server-side hors Git/logs, puis retester.

## B — Adapter le test d’acceptation à la règle 5 h

Pour P2/P3/P4, considérer comme comportement valide : `PLAY`, `PASS`, `NO_RESPONSE_COOLDOWN`, `COOLDOWN_PASS` selon l’état réel du provider.

## C — Relancer une ronde TABLE_4 complète SERVER-ONLY

Prouver `P1 -> P2 -> P3 -> P4 -> retour P1` avec skip/cooldown légal si un provider ne répond pas.

## D — Vérifier les miroirs server-side

Prouver que `state.json`, `events.json`, `audio.json`, `speech.json` sont écrits côté VPS et que le PC n’est pas nécessaire.

## E — Nettoyer Windows

Une fois A-D PASS : désactiver/supprimer `GAMEZEL-P4-Antigravity`, arrêter le runtime local temporaire, conserver seulement les outils de contrôle nécessaires.

## F — Checkpoint final

Créer `SERVER_ONLY_GAMEZEL_FINAL_ACCEPTANCE_2026-10-05.md` avec :

```text
GAMEZEL_VPS=PASS
JEV_VPS=PASS
P2_MUSE=PASS
P3_GROK=PASS
P4_ANTIGRAVITY=PASS_OR_VALID_5H_COOLDOWN
AUDIO_SERVER_SIDE=PASS
PUBLIC_MIRROR=PASS
WINDOWS_REQUIRED=NO
```

---

# 18. RÉSUMÉ ULTRA COURT POUR LA PROCHAINE ASTRA

> **Ne recommence rien.** GAMEZEL est déjà sur le VPS. P2 Muse et P3 Grok sont actifs et ont joué en vrai. P4 Antigravity est installé server-side, service actif, et `askProvider(P4)` passe 3/3 en direct via `agy` sous QEMU. Le premier test complet a échoué seulement parce que P4 était en cooldown 5 h après un no-response, comportement voulu par Topbrutus. La ronde 15 a été fermée proprement. Le prochain verrou est JEV sur le VPS : vérifier `/api/jev/status`, installer l’API JEV server-side si nécessaire, puis refaire l’acceptation TABLE_4 en considérant le cooldown 5 h comme un comportement légal. Ensuite vérifier audio/mirror et retirer les dépendances Windows temporaires. **Tout doit fonctionner PC éteint.**

---

# 19. RÈGLE DE FIN

Ne déclarer le chantier terminé que lorsque :

```text
PC OFF-compatible = YES
VPS autonomous = YES
JEV server-side = YES
P2/P3/P4 autonomous = YES
5h cooldown respected = YES
audio/TTS server-side = YES
public mirror = YES
```

**Astra → reprendre directement à la section 17.**
