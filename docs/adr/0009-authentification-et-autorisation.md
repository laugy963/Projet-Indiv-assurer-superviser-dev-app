# 0009 — Authentification et autorisation

- Statut : acceptée
- Date : 12 novembre 2026

## Contexte

- Les consignes demandent une solution de sécurité, et citent l'authentification et l'autorisation « via un serveur type Keycloak ».
- L'espace communautaire est réservé aux utilisateurs authentifiés. Deux rôles sont à distinguer : membre et modérateur (fiche 0001).
- La sécurité est une contrainte forte, et l'équipe compte deux développeurs juniors : stocker et vérifier des mots de passe soi-même est un risque.
- Une interface web viendra plus tard ; le prototype est une API, appelée par des tests.

## Décision

| Sujet | Choix |
|---|---|
| Serveur d'identité | Keycloak |
| Protocole | OpenID Connect (OIDC) : protocole d'authentification bâti sur OAuth 2.0 |
| Rôles | Deux rôles de royaume : `membre` et `moderateur`. Un royaume est l'espace de Keycloak qui regroupe les utilisateurs et les rôles d'une application |
| Jeton | Jeton d'accès au format JWT : signé par Keycloak, à durée de vie courte |
| Vérification | Chaque service vérifie lui-même le jeton : signature (clés publiques du royaume), émetteur, expiration, puis rôle exigé par la route |
| Identité du membre | Lue dans le jeton, jamais dans un paramètre de la requête |

Obtention du jeton :

| Cas | Flux |
|---|---|
| Cible, avec l'interface web | « Authorization Code » : l'utilisateur saisit son mot de passe sur la page de Keycloak, jamais dans l'application |
| Prototype, sans interface | Un client Keycloak réservé aux tests obtient des jetons pour des comptes de test, par connexion directe |

## Pourquoi ce choix

- Keycloak est le serveur nommé par les consignes. Il gère les comptes, les mots de passe et les rôles : les services n'en voient aucun.
- OpenID Connect est un standard : l'interface web et une future application mobile s'y brancheront sans changer les services.
- La vérification locale est celle que recommande la documentation de Keycloak (consultée le 12 novembre 2026) : les jetons étant des JWT, ils se vérifient avec la clé publique du royaume, sans appel réseau. Les services répondent vite, et continuent de vérifier les jetons si Keycloak est brièvement indisponible.
- La vérification dans chaque service est une défense en profondeur : une requête qui atteindrait un service sans passer par le point d'entrée est refusée aussi.

## Alternatives écartées

| Alternative | Raison du rejet |
|---|---|
| Authentification écrite dans les services | Il faudrait stocker, hacher et vérifier les mots de passe, gérer leur renouvellement : autant de failles possibles pour une équipe junior |
| Vérification du jeton au point d'entrée seulement | Un seul contrôle à maintenir. Mais un service joint directement depuis le cluster ne vérifierait rien |
| Interrogation de Keycloak à chaque requête (introspection) | Un jeton révoqué est refusé tout de suite. Mais chaque requête coûte un appel réseau, et une panne de Keycloak arrête tous les services |
| Flux « Authorization Code » rejoué par les tests | Conforme aux recommandations. Mais il oblige les tests à simuler un navigateur sur la page de connexion : fragile et coûteux |

## Conséquences

- Compromis à assumer devant le jury : la documentation de Keycloak écrit que la connexion directe « ne doit pas être utilisée » par une application, parce que le mot de passe lui est confié. Dans le prototype, elle est limitée à un client de test et à des comptes de test. Le point est repris dans l'audit de l'étape 8.
- Un jeton volé reste valable jusqu'à son expiration : sa durée de vie doit rester courte.
- NestJS ne fournit pas la vérification OpenID Connect d'office (fiche 0002) : la garde qui vérifie le jeton et le rôle est à écrire, et à tester.
- Keycloak tourne sur une machine virtuelle Java : c'est le composant le plus gourmand en mémoire. À mesurer à l'étape 4.
- La configuration du royaume est versionnée dans le dépôt, sans aucun mot de passe.
