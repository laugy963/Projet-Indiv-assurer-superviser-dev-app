# 0012 — Socle technique commun aux deux services

- Statut : acceptée
- Date : 13 novembre 2026

## Contexte

- Les deux services ont besoin du même code technique : vérifier le jeton, contrôler le rôle, traduire les erreurs, valider les entrées, lire les réglages, démarrer et s'arrêter proprement.
- La fiche 0009 impose que chaque service vérifie lui-même le jeton : ce code de sécurité existe donc deux fois, ou une fois à un endroit partagé.
- Le quality gate de SonarQube Cloud limite la duplication à 3 % du nouveau code (fiche 0004).
- L'équipe compte deux développeurs juniors : une faille dans le contrôle d'accès doit se corriger à un seul endroit.
- Le cadrage a retenu un seul dépôt pour les deux services.

## Décision

Le code technique commun vit dans un paquet interne du dépôt, `@epouvante/socle`, dossier `libs/socle/`. Le dépôt utilise les « workspaces » de npm : plusieurs paquets dans un dépôt, installés ensemble, avec un seul fichier de verrou.

| Le socle contient | Le socle ne contient pas |
|---|---|
| La garde d'accès (composant NestJS exécuté avant chaque route) et la vérification du jeton | Aucune règle métier |
| Le filtre d'erreurs et la validation des entrées | Aucun type du contrat de l'événement |
| La lecture des réglages, le démarrage du service, la route interne `/sante` | La liste des catégories : chaque service en garde sa copie |
| Les outils des tests : émetteur de jetons, sonde du broker, banc d'intégration | — |

Les outils de test ne sont pas compilés dans les images.

## Pourquoi ce choix

- Une seule garde à écrire, à tester et à corriger. Ses 70 tests unitaires valent pour les deux services.
- Les deux services ont réellement la même structure : c'est le socle qui applique la garde, le filtre et la validation à toutes leurs routes.
- Aucune duplication à justifier devant le quality gate.
- Le partage reste technique. Les deux services n'ont aucun import l'un vers l'autre, et le contrat de l'événement n'est pas un code partagé : le découpage métier est intact.

## Alternatives écartées

| Alternative | Raison du rejet |
|---|---|
| Deux projets indépendants, le code technique copié dans chacun | Services totalement autonomes. Mais plusieurs centaines de lignes en double, dont le contrôle d'accès : une correction de sécurité serait à faire deux fois, avec le risque d'en oublier une |
| Un paquet publié dans un registre, avec un numéro de version | Chaque service choisit sa version du socle : c'est la cible quand plusieurs équipes livrent à des rythmes différents. Trop lourd pour une personne : un registre, une publication et une montée de version à chaque changement |

## Conséquences

- Couplage technique à assumer devant le jury : un changement du socle touche les deux services. Les deux suites de tests sont rejouées à chaque changement.
- Un seul `package-lock.json`, à la racine. Les versions des dépendances sont les mêmes dans les deux services.
- Les images se construisent depuis la racine du dépôt, avec un seul `services/Dockerfile` paramétré par le nom du service. Un fichier `.dockerignore` limite ce qui entre dans la construction.
- La règle « aucune règle métier dans le socle » n'est contrôlée par aucun outil : elle relève de la relecture.
- Cette fiche complète les fiches 0002 et 0009, qu'elle ne remplace pas.
