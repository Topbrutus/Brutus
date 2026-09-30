# Politique de preuve Brutus

## Étiquettes

SOURCE : donnée lue directement d'un dépôt, fichier, test, service ou mesure.
MESURE : valeur observée avec méthode et contexte.
CALCUL : résultat dérivé d'entrées explicites.
CANDIDAT : proposition non encore validée.
HYPOTHESE : explication ou modèle à tester.
INTERPRETATION : lecture humaine d'un résultat.

## Règles

- Aucun fichier, test, commit, déploiement ou résultat n'est déclaré réalisé sans preuve directe.
- Un candidat n'est pas une preuve.
- Un test synthétique PASS ne démontre pas nécessairement le comportement physique/runtime.
- Un FAIL d'implémentation ne réfute pas automatiquement une proposition mathématique.
- Un merge GitHub ne prouve pas l'affichage ou le comportement navigateur.
- Une formule qui entre en Zone de Combat n'obtient aucun statut dans la Fresque sans protocole mathématique approprié.
- Une valeur inconnue reste inconnue.
- Les preuves doivent pouvoir pointer vers une source, un SHA, un test, une trace ou une mesure reproductible.

## Priorité

Exactitude > sécurité > robustesse > cohérence > continuité > vitesse.
