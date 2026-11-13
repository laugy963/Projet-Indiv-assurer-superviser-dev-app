# Service « annonces »

Gère le cycle de vie d'une annonce de troc ou de don : publication par un membre, consultation, retrait par un modérateur. Pour chaque annonce publiée, il émet l'événement `annonce.publiee` sur le broker. Il ne connaît pas le service notifications.

| Route | Rôle exigé | Réponse | Story |
|---|---|---|---|
| `POST /api/annonces` | `membre` | 201 | US-01 |
| `GET /api/annonces?page=N` | `membre` ou `moderateur` | 200, pages de 20 | US-05 |
| `DELETE /api/annonces/{id}` | `moderateur` | 204 | US-06 |
| `GET /sante` | Aucun : route interne, hors de `/api` | 200 | — |

## Structure

| Dossier | Couche | Contenu |
|---|---|---|
| `src/entrees/` | Point d'entrée | Contrôleur HTTP, objets de validation des entrées |
| `src/application/` | Application | Cas d'usage : `PublierAnnonce`, `ListerAnnonces`, `RetirerAnnonce` |
| `src/domaine/` | Domaine | Règles d'une annonce, contrat de l'événement, ports |
| `src/adaptateurs/` | Adaptateurs | Dépôt PostgreSQL (TypeORM), émetteur RabbitMQ |
| `src/migrations/` | Schéma | Création de la table `annonces` |
| `test/integration/` | Tests d'intégration | Le service complet, avec PostgreSQL et RabbitMQ réels |
| `test/doubles/` | Doubles de test | Dépôt en mémoire pour les tests unitaires |

`src/annonces.module.ts` assemble le service : c'est le seul fichier où chaque port reçoit son adaptateur. `src/main.ts` démarre le service ; `src/migrer.ts` joue les migrations, avant lui.

## Réglages

Tous viennent de l'environnement ; un réglage absent arrête le démarrage.

| Variables | Rôle |
|---|---|
| `PORT` | Port d'écoute |
| `BDD_HOTE`, `BDD_PORT`, `BDD_NOM`, `BDD_UTILISATEUR`, `BDD_MOT_DE_PASSE` | Base de données du service |
| `AMQP_HOTE`, `AMQP_PORT`, `AMQP_UTILISATEUR`, `AMQP_MOT_DE_PASSE` | Compte du service sur le broker |
| `OIDC_EMETTEUR`, `OIDC_URL_CLES`, `OIDC_AUDIENCE` | Émetteur attendu des jetons, adresse interne des clés publiques, destinataire attendu |

## Commandes

Depuis la racine du dépôt, exécutées avec succès le 13 novembre 2026.

| Action | Commande |
|---|---|
| Tests unitaires | `npm run test:unit -w @epouvante/annonces` |
| Tests d'intégration | `npm run env:integration`, puis `npm run test:int -w @epouvante/annonces` |
| Compiler | `npm run build` |

Détail de la réalisation et des preuves : [docs/05-developpement-poc.md](../../docs/05-developpement-poc.md).
