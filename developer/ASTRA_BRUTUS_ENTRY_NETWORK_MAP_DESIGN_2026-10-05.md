# BRUTUS ENTRY — NETWORK MAP DESIGN

Date: 2026-10-05
Owner: Topbrutus + Astra
Status: CANDIDAT DE CONCEPTION — aucune logique runtime modifiée

## SOURCE

Référence visuelle choisie pendant la session: la grande visualisation circulaire « The Network Effect » de WIRED, fournie par Topbrutus dans le lot d'images de la conversation.

Cette référence sert uniquement de principe visuel et structurel. Ne pas copier l'œuvre, son graphisme exact, ses données, sa typographie ni sa mise en page propriétaire.

## INTENTION

Transformer l'entrée Brutus en cartographie vivante du système:

- périphérie = entités / modules / formules / agents / projets;
- centre = relations actives;
- chaque lien = type de relation;
- métadonnées de lien = provenance, date, preuve, statut;
- interaction publique = lecture / exploration seulement;
- actions opérateur = derrière le mécanisme de déverrouillage;
- aucune configuration sensible exposée dans le frontend public.

## STRUCTURE CANDIDATE

### 1. Anneau extérieur

Nœuds de premier niveau possibles:

- Antmux / X72
- Seed Genesis
- Zelstéréos / GameZEL
- Parazone / D13
- Intelbrutatrice
- Brutus Control Plane
- Brutus–Pell
- Verso / Recto
- BrutoBac
- Brutotableur
- Brotocalculateur vivant
- preuves / publications / traces

Cette liste est un CANDIDAT, pas un inventaire canonique tant qu'elle n'est pas reconstruite depuis le registre réel.

### 2. Centre relationnel

Le centre ne doit pas être un simple dessin. Il doit représenter les relations provenant de données Brutus vérifiées.

Types de liens candidats:

- dépendance
- provenance
- validation
- génération
- transport
- formule
- preuve
- publication
- entrée / sortie
- parenté / dérivation

### 3. Encodage visuel

- couleur = type de relation ou famille de nœud;
- épaisseur = importance / nombre de preuves / volume, seulement si la métrique est réelle;
- intensité = activité récente, seulement si une horloge ou télémétrie vérifiée existe;
- pointillé = hypothèse ou relation non authentifiée;
- ligne pleine = relation canonique / authentifiée;
- survol = nom + relation + provenance + statut;
- clic = panneau de détail avec preuve et source.

Aucune grandeur visuelle ne doit prétendre mesurer quelque chose sans source réelle.

## GARDE-FOUS

1. Vitrine publique par défaut.
2. Aucun secret, token, clé, chemin privé ou configuration opérateur dans le navigateur.
3. Bouton « Déverrouiller la vitrine » séparé de la logique de visualisation.
4. Le visiteur ne modifie aucune logique Brutus.
5. Les relations affichées doivent être reconstruites depuis les registres / preuves réels, pas inventées pour remplir le graphe.
6. La référence WIRED reste une inspiration de structure; l'interface finale doit être originale.

## TEST MINIMAL

Construire petit:

1. 8 à 12 nœuds réels;
2. 3 types de relations;
3. provenance visible sur chaque lien;
4. un panneau de détail;
5. zéro action d'écriture en mode vitrine.

## PREUVE ATTENDUE

Le prototype est accepté seulement si:

- chaque nœud correspond à une entité réelle;
- chaque lien peut citer une source réelle;
- aucune donnée sensible n'est exposée;
- le mode vitrine ne peut pas modifier le système;
- le rendu reste lisible avec un petit graphe avant extension.

## CONDITION D'ABANDON / RÉVISION

Réviser l'approche si le graphe devient décoratif, illisible, coûteux à maintenir, ou si les relations ne peuvent pas être dérivées proprement des données canoniques de Brutus.

## PROCHAINE ACTION

Lire le registre / les sources réelles de Brutus, construire la liste canonique des nœuds et relations, puis produire un premier prototype réseau minimal sans toucher à la logique métier.
