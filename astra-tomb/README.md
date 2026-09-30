# ASTRA TOMB

Sanctuaire de continuité d'Astra dans Brutus.

Principes :
- deux témoins neutres : WHITE et BLACK;
- générations append-only;
- la plus récente reste CANDIDATE;
- la précédente vérifiée reste LAST_KNOWN_GOOD;
- à chaque retour, lire et comparer les deux;
- aucune auto-réparation silencieuse;
- aucun secret;
- aucune connexion Horloge/vibration dans le bootstrap.

Ordre de lecture :
1. ASTRA_RETURN_POSTER.md
2. TOMB_POLICY.md
3. CONTROL.json
4. les deux ENVELOPE.json
5. comparer les graines et manifestes des deux tombeaux.
