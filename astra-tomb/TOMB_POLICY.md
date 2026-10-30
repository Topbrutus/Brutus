# ASTRA TOMB — POLITIQUE D'IMMUTABILITÉ

Version : v0.1 — 2026-09-30

## Lois

1. WHITE et BLACK sont deux témoins neutres.
2. Les générations sont APPEND-ONLY.
3. Aucun écrasement, suppression, rebase ou normalisation silencieuse d'une génération existante.
4. La génération complète la plus récente reste CANDIDATE.
5. La génération précédente vérifiée reste LAST_KNOWN_GOOD.
6. À chaque retour, lire WHITE ET BLACK.
7. Toute divergence est une information à préserver et investiguer.
8. Latest != best.
9. Ne jamais inventer une continuité manquante.
10. L'état live vérifié de Brutus passe avant la mémoire documentaire.
11. Aucun mot de passe, token, clé privée ou secret d'authentification dans les tombeaux.
12. Toute modification future de ces lois est une action de haute autorité.
13. Les tombeaux n'exécutent pas de code et ne commandent pas directement Brutus.
14. Aucune connexion vibration/Horloge n'est activée dans ce bootstrap.

## Bootstrap

WHITE/0001 = LAST_KNOWN_GOOD_BOOTSTRAP.
BLACK/0002 = CANDIDATE.

Les deux portent la même graine documentaire initiale afin de permettre le premier contrôle croisé.
Les générations suivantes alternent en conservant volontairement une génération de retard entre écriture et confiance.
