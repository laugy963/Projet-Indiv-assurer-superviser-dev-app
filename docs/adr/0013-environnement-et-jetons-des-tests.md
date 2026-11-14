# 0013 — Environnement et jetons des tests

- Statut : acceptée
- Date : 13 novembre 2026

## Contexte

- Les tests sont écrits avant le code (étape 5). Ils ont besoin tout de suite d'une base de données, d'un broker et de jetons.
- Le processus de développement prévoit des tests d'intégration avec « base de données et broker lancés en conteneurs », et des tests d'acceptation dans un environnement éphémère. Il renvoyait le choix de l'outil de lancement à l'étape 6 : ce choix est avancé.
- Le poste a 8 Go de mémoire, dont 3,83 Gio pour le moteur Docker. Le cluster k3d en occupe environ 2 Gio et met 4 à 5 minutes à être prêt après un démarrage (mesures de l'étape 4).
- Le critère CA-01 demande de refuser un jeton expiré ou falsifié, sur chaque route. Les jetons de Keycloak vivent 120 secondes : le bac à sable a dû attendre 98 secondes pour en obtenir un expiré.
- La fiche 0003 écarte Docker Compose pour l'hébergement.

## Décision

L'environnement des tests est lancé par Docker Compose (`tests/environnement/`). Il est éphémère : aucun volume conservé, mots de passe tirés au hasard à chaque création.

| Niveau de test | Ce qui est lancé | Dépendances | Jetons |
|---|---|---|---|
| Unitaire | Une règle, un cas d'usage, la garde | Doubles de test (objets qui remplacent une dépendance) | — |
| Intégration | Un service complet, dans le processus du test | PostgreSQL et RabbitMQ réels | Émetteur de test local |
| Acceptation | Les deux services, en conteneurs, à partir de leurs images | PostgreSQL, RabbitMQ et Keycloak réels | Keycloak, client `tests` |

L'émetteur de test tient le rôle de Keycloak dans les tests d'intégration. Il crée une paire de clés RSA à chaque exécution et sert la clé publique en HTTP, au format que publie un royaume Keycloak. Le service vérifie ses jetons avec le même code qu'en exploitation.

## Pourquoi ce choix

- Mémoire et délai. L'environnement d'intégration est prêt en 14 secondes (mesuré). Le cluster k3d reste arrêté pendant le développement.
- Tous les cas de refus se fabriquent sans attente : jeton expiré, signature modifiée, contenu modifié, clé inconnue, autre audience.
- La garde est tout de même prouvée face au vrai Keycloak : les tests d'acceptation demandent leurs jetons au serveur d'identité.
- Le critère CA-15 demande d'arrêter puis de relancer le service notifications : une commande suffit avec des conteneurs.
- Le même fichier servira d'environnement éphémère au pipeline de l'étape 6.

## Alternatives écartées

| Alternative | Raison du rejet |
|---|---|
| Lancer les tests sur le cluster k3d | Plus proche de la cible. Mais 2 Gio de mémoire, 4 à 5 minutes d'attente, les manifestes des deux services à écrire dès maintenant (c'est l'étape 7) et k3d à installer dans le pipeline |
| Demander tous les jetons au vrai Keycloak, y compris en intégration | Plus réaliste. Mais environ 500 Mio et 30 secondes de plus à chaque exécution, et une attente de la durée de vie du jeton pour tester l'expiration |
| Remplacer la base et le broker par des doubles dans les tests d'intégration | Les critères CA-06 et CA-14 demandent un broker réel. La fiche 0008 compte sur des tests joués sur une vraie base |
| Testcontainers (bibliothèque qui lance les conteneurs depuis le code du test) | Chaque exécution a ses conteneurs. Mais elle ne lance pas les deux services pour l'acceptation : il faudrait un second outil |

## Conséquences

- À justifier devant le jury : Docker Compose sert aux tests, pas à l'hébergement. La fiche 0003 est inchangée ; le déploiement sur Kubernetes est l'étape 7.
- Limite : les tests d'intégration prouvent la garde face au standard (un JWT signé en RS256, des clés publiées en HTTP), pas face à Keycloak lui-même. Les tests d'acceptation comblent cet écart.
- Dans cet environnement, Keycloak tourne en mode développement, sans HTTPS. Le mode production derrière HTTPS a été éprouvé au bac à sable et revient à l'étape 7.
- Un fichier de plus à tenir cohérent avec les manifestes de l'étape 7 : mêmes variables d'environnement, mêmes comptes.
- Les deux niveaux partagent la base et le broker. Les conteneurs des services doivent être arrêtés pendant les tests d'intégration, sinon ils consomment les événements à la place du service testé. Le script de démarrage les arrête, et le banc de test refuse de démarrer s'il les détecte.
- Aucun mot de passe n'est versionné : le script les écrit dans un fichier `.env` ignoré par Git.
