# Service « notifications »

Gère les centres d'intérêt des membres et leurs notifications. Il consomme l'événement `annonce.publiee` et crée une notification pour chaque membre qui a choisi la catégorie de l'annonce, sauf son auteur. Il n'appelle jamais le service annonces : l'événement porte tout ce dont il a besoin.

| Entrée | Rôle exigé | Réponse | Story |
|---|---|---|---|
| `PUT /api/centres-interet` | `membre` | 200 | US-02 |
| `GET /api/centres-interet` | `membre` | 200 | US-02 |
| `GET /api/notifications` | `membre` | 200, les 100 plus récentes | US-03 |
| Événement `annonce.publiee`, file `notifications.annonce-publiee` | Compte du service sur le broker | Accusé de réception après l'enregistrement | US-04 |
| `GET /sante` | Aucun : route interne, hors de `/api` | 200 | — |

Le membre concerné est toujours celui du jeton : aucune route ne lit un identifiant de membre dans la requête.

## Structure

| Dossier | Couche | Contenu |
|---|---|---|
| `src/entrees/` | Point d'entrée | Deux contrôleurs HTTP, le consommateur de l'événement |
| `src/application/` | Application | Cas d'usage : `DefinirCentresInteret`, `LireCentresInteret`, `ListerNotifications`, `NotifierMembresInteresses` |
| `src/domaine/` | Domaine | Centres d'intérêt, choix des destinataires, lecture et validation de l'événement, ports |
| `src/adaptateurs/` | Adaptateurs | Deux dépôts PostgreSQL (TypeORM) |
| `src/migrations/` | Schéma | Tables `centres_interet` et `notifications`, contrainte d'unicité (membre, annonce) |
| `test/integration/` | Tests d'intégration | Le service complet, avec PostgreSQL et RabbitMQ réels |
| `test/doubles/` | Doubles de test | Dépôts en mémoire pour les tests unitaires |

`src/consommation.ts` règle la lecture de la file : file durable, accusé de réception manuel, dix messages en cours au plus. Un seul processus sert l'API HTTP et les messages du broker.

## Réglages et commandes

Les mêmes variables que le [service annonces](../annonces/README.md), avec la base et le compte `notifications`.

| Action | Commande |
|---|---|
| Tests unitaires | `npm run test:unit -w @epouvante/notifications` |
| Tests d'intégration | `npm run env:integration`, puis `npm run test:int -w @epouvante/notifications` |

Détail de la réalisation et des preuves : [docs/05-developpement-poc.md](../../docs/05-developpement-poc.md).
