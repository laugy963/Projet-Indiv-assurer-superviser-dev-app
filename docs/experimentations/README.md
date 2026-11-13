# Étape 4 — Bac à sable : synthèse

- Date : 13 novembre 2026
- Statut : validé le 13 novembre 2026
- Code : [sandbox/](../../sandbox/README.md) ; cluster local : [deploy/k3d/](../../deploy/k3d/README.md)

## 1. Objet

Éprouver les technologies critiques de l'architecture avant de développer. Chaque expérimentation est rejouable par un script, et chaque résultat cité vient d'une exécution réelle du 13 novembre 2026.

## 2. Les trois expérimentations

| # | Expérimentation | Interactions testées | Contrôles réussis | Décision |
|---|---|---|---|---|
| 1 | [RabbitMQ sur Kubernetes](01-broker-rabbitmq.md) | Broker et stockage Kubernetes ; producteur, broker et consommateur | 10 sur 10 | Adopter |
| 2 | [Ingress HTTPS : Traefik et cert-manager](02-ingress-https.md) | cert-manager et Ingress ; Traefik et Secret du certificat | 12 sur 12 | Adopter |
| 3 | [Keycloak : jeton, rôles, vérification](03-keycloak-jeton.md) | Keycloak et PostgreSQL ; Keycloak et Ingress HTTPS ; service et clés de Keycloak | 18 sur 18 | Adopter |

Chaque protocole suit le même plan : objectif, environnement, étapes pour reproduire, résultats, difficultés, limites, décision.

## 3. Hypothèses de l'architecture

Le [document d'architecture](../03-architecture.md) listait cinq hypothèses à vérifier.

| Hypothèse | Résultat | Preuve |
|---|---|---|
| Les composants tiennent ensemble sur un poste de 8 Go | Confirmée pour RabbitMQ, cert-manager, Keycloak et PostgreSQL. Non mesurée pour Prometheus et Grafana | Paragraphe 4 |
| Un message publié est remis après l'arrêt puis le redémarrage du consommateur | Confirmée, y compris après le redémarrage du broker | Expérimentation 1, tests 2 et 3 |
| cert-manager émet un certificat pour l'Ingress Traefik | Confirmée en local, avec une autorité de certification locale. Non exécutée avec une autorité publique | Expérimentation 2 |
| Un certificat d'une autorité publique demande un nom de domaine | Non vérifiée : impossible en local. Reste une contrainte de l'étape 7 | — |
| Un service vérifie un jeton de Keycloak et y lit les rôles | Confirmée avec un service en Node.js. La garde NestJS reste à écrire | Expérimentation 3, test 3 |

## 4. Mémoire consommée

Mesure du 13 novembre 2026 à 12 h 28, les composants des trois expérimentations en marche ensemble. Script : [sandbox/memoire.sh](../../sandbox/memoire.sh) ; sortie brute : [resultats-memoire.txt](../../sandbox/resultats-memoire.txt).

| Mesure | Valeur |
|---|---|
| Mémoire physique du poste | 8 Go |
| Mémoire allouée au moteur Docker | 3 918 Mio |
| Mémoire du nœud du cluster (`kubectl top node`) | 2 043 Mio, soit 52 % |
| Somme de la mémoire des pods | 921 Mio |
| Mémoire encore disponible dans le moteur Docker | 1 300 Mio |

| Composant | Mémoire |
|---|---|
| Keycloak | 501 Mio |
| RabbitMQ | 104 Mio |
| cert-manager, trois pods | 97 Mio |
| Composants de k3s : Traefik, metrics-server, CoreDNS, stockage | 105 Mio |
| Service de vérification, consommateur, service de démonstration | 86 Mio |
| PostgreSQL | 28 Mio |

Lecture :

- Le nœud consomme 2 043 Mio alors que les pods n'en totalisent que 921 : l'écart est le coût de Kubernetes lui-même.
- Keycloak pèse à lui seul plus que tous les autres pods réunis.
- Il reste 1 300 Mio pour les deux services NestJS et pour Prometheus et Grafana. Cette pile n'a pas été installée : rien ne permet d'affirmer qu'elle tient. La fiche 0011 prévoyait ce cas : elle ne tournera peut-être que sur l'environnement distant. À mesurer à l'étape 7.
- Quatre conteneurs étrangers au projet tournaient sur le poste pendant la mesure. Sous la pression, le système a déplacé une partie de leur mémoire vers l'espace d'échange (86 Mio). Aucun n'a redémarré.

## 5. Ce que les difficultés ont appris

Sept difficultés réelles, toutes résolues. Les quatre premières auraient cassé le prototype à l'étape 5 ou 7.

| Difficulté | Règle pour la suite | Étape concernée |
|---|---|---|
| Un conteneur « non root » refuse de démarrer si l'image désigne son utilisateur par un nom | `USER 1000` dans chaque Dockerfile | 5 |
| RabbitMQ ne redémarre pas : Kubernetes a retouché les droits de son volume | `fsGroupChangePolicy: OnRootMismatch` pour RabbitMQ et PostgreSQL | 7 |
| Un pod Node.js met 30 s à s'arrêter et continue de consommer | Traiter le signal `SIGTERM` dans chaque service | 5 |
| Un test de falsification de jeton réussissait ou échouait au hasard | Vérifier que la donnée falsifiée diffère vraiment de l'originale | 5 |
| Un compte Keycloak incomplet n'obtient pas de jeton | Comptes de test avec courriel, prénom et nom | 5, 6 |
| Une version de bibliothèque notée de mémoire était périmée | Vérifier la version courante avant de la figer | 5 |
| Retirer une durée de certificat ne le réémet pas | Supprimer le Secret pour forcer la réémission | 7 |

Ces règles servent aussi la cartographie des compétences : elles sont la matière des ateliers internes prévus sur la messagerie (C6) et l'authentification (C5).

## 6. Ce qui n'a pas été exécuté

| Sujet | Raison | Quand |
|---|---|---|
| Certificat d'une autorité publique (Let's Encrypt) | Le poste n'est pas joignable depuis Internet | Étape 7 |
| Prometheus et Grafana | Expérimentation non retenue | Étape 7 |
| Transport RabbitMQ et garde d'authentification de NestJS | Les consignes excluent du bac à sable un composant écrit avec un framework | Étape 5 |
| Charge : débit du broker, temps de réponse | Hors du but d'un bac à sable | Étape 7 |
| Environnement distant | Pas encore commandé | Étape 7 |
| Construction des images pour amd64 | Le poste est en arm64 ; les images n'ont été construites que pour lui | Étape 6 |

## 7. Suite

Les trois technologies sont adoptées et les fiches 0007, 0009 et 0010 sont maintenues sans changement. L'étape 5 développe le prototype, tests d'abord, en appliquant les règles du paragraphe 5.
