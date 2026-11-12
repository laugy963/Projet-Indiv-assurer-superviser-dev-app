# 0008 — Persistance des données

- Statut : acceptée
- Date : 12 novembre 2026

## Contexte

- Les deux services stockent des données simples et structurées : annonces, centres d'intérêt, notifications.
- Dans une architecture en services, chaque service possède ses données : aucun ne lit la base d'un autre.
- Le traitement des événements doit être idempotent (fiche 0007) : il faut une contrainte d'unicité fiable.
- Le poste de développement a 8 Go de mémoire.
- Les développeurs juniors connaissent les bases relationnelles (compétence C7).
- Keycloak a lui aussi besoin d'une base de données.

## Décision

| Sujet | Choix |
|---|---|
| Système de gestion de base de données | PostgreSQL |
| Répartition | Une seule instance. Une base et un compte par usage : `annonces`, `notifications`, `keycloak` |
| Accès depuis le code | TypeORM. Un ORM est une bibliothèque qui fait le lien entre les objets du code et les tables |
| Évolution du schéma | Migrations versionnées dans le dépôt. La synchronisation automatique du schéma est désactivée |

## Pourquoi ce choix

- PostgreSQL est relationnel : contraintes d'unicité et transactions, dont le traitement idempotent a besoin.
- Il est libre et s'héberge partout : aucun lien avec un fournisseur, ce qui sert l'exigence d'hébergement en Europe.
- Une base et un compte par service : le compte du service annonces ne peut pas ouvrir la base du service notifications. La règle « chaque service possède ses données » est tenue.
- Une seule instance tient dans la mémoire du poste.
- TypeORM a un module officiel dans NestJS et s'écrit dans le même style : décorateurs, injection de dépendances. Ses dépôts se remplacent par des doubles dans les tests unitaires.
- Les requêtes de l'ORM sont paramétrées : c'est la protection de base contre l'injection SQL.

## Alternatives écartées

| Alternative | Raison du rejet |
|---|---|
| Une instance PostgreSQL par service | Isolation complète : une panne ne touche qu'un service. Mais la mémoire consommée double, pour un gain invisible dans un prototype. C'est la cible de production |
| Une base commune aux deux services | Couplage par les données : un service pourrait lire ou casser les tables de l'autre |
| MongoDB | Son schéma souple n'apporte rien à des données aussi structurées, et l'équipe connaît SQL |
| Prisma comme ORM | Typage plus strict et bon outil de migration. Mais une étape de génération de plus dans le build et dans l'image, et un style d'écriture différent de celui de NestJS |

## Conséquences

- L'instance est partagée : sa panne arrête les deux services et Keycloak. Limite du prototype, à dire au jury.
- Pas de réplication ni de sauvegarde dans le prototype. Sur k3s, le stockage par défaut est le disque du nœud, sans réplication.
- En production : une instance par service, répliquée et sauvegardée, par exemple avec un opérateur comme CloudNativePG, cité dans le cours Kubernetes.
- Les migrations sont à jouer à chaque déploiement, avant le démarrage de la nouvelle version.
- Le typage des requêtes de TypeORM est moins strict que celui de Prisma : les tests d'intégration, joués sur une vraie base, compensent.
