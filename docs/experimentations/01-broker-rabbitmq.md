# Expérimentation 1 — RabbitMQ sur Kubernetes

- Date : 13 novembre 2026
- Décision : adopter
- Code : [sandbox/01-broker-rabbitmq/](../../sandbox/01-broker-rabbitmq/)
- Preuve : [resultats/execution.txt](../../sandbox/01-broker-rabbitmq/resultats/execution.txt)

## 1. Objectif

Vérifier, par une exécution réelle, les garanties sur lesquelles repose la communication entre les deux services (fiche 0007, architecture paragraphe 6.3).

| # | Hypothèse à vérifier |
|---|---|
| H1 | Un message publié et confirmé par le broker est remis au consommateur |
| H2 | Les messages publiés pendant l'arrêt du consommateur l'attendent dans la file (critère CA-15) |
| H3 | Les messages en attente survivent au redémarrage du broker |
| H4 | Un message reçu mais pas encore accusé est remis après une panne du consommateur |
| H5 | Un message refusé part vers la file des messages en échec |
| H6 | RabbitMQ tient dans la mémoire du poste |

Ce qui est testé est la plateforme : un broker sur Kubernetes, avec un test de publication-consommation, cas cité par les consignes. Les deux petits programmes Node.js ne sont que des outils de test.

## 2. Environnement

| Élément | Valeur |
|---|---|
| Poste | MacBook Pro M1, 8 Go, arm64 |
| Moteur de conteneurs | Docker Desktop 29.4.3, 3,83 Gio alloués |
| Cluster | k3d 5.9.0, k3s 1.35.5, un nœud ([deploy/k3d/](../../deploy/k3d/README.md)) |
| Broker | RabbitMQ 4.4.0, image `rabbitmq:4.4.0-management-alpine` |
| Programmes de test | Node.js 24.22.3, bibliothèque amqplib 2.3.1 |
| Espace de noms | `bac-a-sable-broker` |

| Objet déployé | Rôle |
|---|---|
| StatefulSet `rabbitmq`, un pod, volume de 1 Gio | Le broker. Un StatefulSet garde le même nom de pod et le même volume d'un redémarrage à l'autre |
| Deployment `consommateur` | Joue le service notifications : lit la file, accuse réception après traitement |
| Job `producteur-…` | Joue le service annonces : publie des événements `annonce.publiee`, attend la confirmation du broker |
| Secret `rabbitmq-compte` | Compte du broker, mot de passe aléatoire créé par le script |

Topologie, celle de la fiche 0007 : exchange `annonces` de type topic, clé de routage `annonce.publiee`, file durable `notifications.annonce-publiee`, file des messages en échec `notifications.annonce-publiee.echecs`.

## 3. Reproduire

```bash
k3d cluster create --config deploy/k3d/cluster.yaml   # si le cluster n'existe pas encore
sandbox/01-broker-rabbitmq/run.sh
```

Durée mesurée : 2 min 35 s. Le script repart de zéro à chaque exécution.

| Étape du script | Action |
|---|---|
| Préparation | Construit l'image des programmes de test, l'importe dans le cluster, déploie RabbitMQ, pose la règle des messages en échec, lance le consommateur |
| Test 1 | Publie 100 messages, consommateur en marche |
| Test 2 | Arrête le consommateur, publie 100 messages, relance le consommateur |
| Test 3 | Arrête le consommateur, publie 50 messages, supprime le pod du broker, attend son retour, relance le consommateur |
| Test 4 | Met le consommateur en mode « panne avant l'accusé de réception », publie 1 message |
| Test 5 | Publie 1 message marqué défectueux, que le consommateur refuse |
| Mesure | `kubectl top pod` |

## 4. Résultats

Exécution du 13 novembre 2026 à 12 h 02 : 10 contrôles, 10 réussis.

| Hypothèse | Contrôle | Attendu | Obtenu |
|---|---|---|---|
| H1 | Messages traités, sur 100 publiés et confirmés | 100 | 100 |
| H2 | Messages en attente dans la file, consommateur arrêté | 100 | 100 |
| H2 | Messages traités après le retour du consommateur | 100 | 100 |
| H3 | Messages en attente avant l'arrêt du broker | 50 | 50 |
| H3 | Messages toujours en attente après le redémarrage du broker | 50 | 50 |
| H3 | Messages traités ensuite | 50 | 50 |
| H4 | Redémarrages du conteneur du consommateur | 1 | 1 |
| H4 | Message remis par le broker, puis traité | 1 | 1 |
| H5 | Messages dans la file des messages en échec | 1 | 1 |
| H5 | Messages restés dans la file principale | 0 | 0 |

Journal du test 4. Le champ `dejaRemis` vient du broker : il vaut `true` quand le message est remis une seconde fois.

```
Avant la panne :        {"etat":"recu","id":"t4-001","dejaRemis":false}
                        {"etat":"panne-simulee","id":"t4-001"}
Après le redémarrage :  {"etat":"recu","id":"t4-001","dejaRemis":true}
                        {"etat":"traite","id":"t4-001","dejaRemis":true}
```

| Mesure | Valeur |
|---|---|
| RabbitMQ prêt, image déjà présente | 18 s (25 s à la toute première exécution, téléchargement compris) |
| Broker de nouveau prêt après la suppression de son pod | 13 s |
| Arrêt du consommateur | 1 s (30 s avant correction, voir difficulté 3) |
| Mémoire de RabbitMQ (H6) | 90 Mio à la fin du script ; 104 Mio lors de la mesure globale |
| Mémoire du consommateur | 15 Mio |

## 5. Difficultés rencontrées

| # | Symptôme | Cause | Solution |
|---|---|---|---|
| 1 | Le consommateur ne démarre pas : état `CreateContainerConfigError`, message « container has runAsNonRoot and image has non-numeric user (node) » | Le Dockerfile désignait l'utilisateur par son nom (`USER node`). Kubernetes ne peut pas vérifier qu'un nom n'est pas root | `USER 1000` : l'utilisateur est désigné par son numéro |
| 2 | Après la suppression de son pod, le broker ne redémarre plus : état `CrashLoopBackOff`, message « Cookie file /var/lib/rabbitmq/.erlang.cookie must be accessible by owner only » | Avec `fsGroup`, Kubernetes réapplique les droits du groupe sur tout le volume à chaque démarrage du pod. Le fichier passe à `-rw-rw----`, ce que RabbitMQ refuse. Vérifié en lisant les droits du fichier sur le nœud | `fsGroupChangePolicy: OnRootMismatch` : les droits ne sont plus retouchés quand le volume est déjà correct |
| 3 | Le test 4 ne montre aucune panne : le message a été traité par l'ancien pod du consommateur, encore vivant pendant la mise à jour | Node.js, premier processus du conteneur, ignore le signal d'arrêt `SIGTERM` s'il ne le traite pas. Le pod met alors 30 s à s'arrêter, le délai maximal de Kubernetes, et continue de consommer. Mesuré : 30 s | Le consommateur traite `SIGTERM` : il ferme son canal puis sa connexion. Arrêt mesuré : 1 s. Le script attend aussi qu'il ne reste qu'un pod avant de publier |
| 4 | La bibliothèque amqplib d'abord retenue (0.10.9) avait deux versions majeures de retard | Version notée de mémoire, sans vérification | `npm view amqplib version` donne 2.3.1 : version adoptée, tous les tests passent avec elle |

La difficulté 2 n'apparaît qu'au deuxième démarrage du broker. Sans le test 3, elle aurait été découverte en démonstration ou en production.

## 6. Limites

| Limite | Conséquence |
|---|---|
| Un seul nœud RabbitMQ | La panne d'un nœud dans un groupe de brokers n'est pas testée |
| Stockage `local-path` : le disque du nœud, sans réplication | La perte du nœud perd les messages |
| Programmes de test en Node.js, sans NestJS | Le transport RabbitMQ de NestJS reste à éprouver. Sa compatibilité avec amqplib 2 n'est pas vérifiée : à contrôler au début de l'étape 5 |
| 100 messages ne sont pas une charge | Le débit du broker n'est pas mesuré |
| Un seul consommateur à la fois | La répartition des messages entre plusieurs pods n'est pas testée |
| La règle des messages en échec est posée par une commande après le démarrage | À déclarer dans la configuration du broker à l'étape 7 |
| Le cas « broker injoignable au moment de publier » n'est pas testé | La limite reste celle du document d'architecture : motif « outbox » en cible |

## 7. Décision

Adopter RabbitMQ. Les six hypothèses sont confirmées : la fiche 0007 est maintenue.

Règles à reprendre aux étapes 5 et 7 :

1. Déployer le broker en StatefulSet, avec `fsGroupChangePolicy: OnRootMismatch`.
2. Désigner l'utilisateur des images par son numéro.
3. Traiter le signal `SIGTERM` dans chaque service.
4. Accuser réception après le traitement, jamais avant.
5. Rendre le traitement idempotent : le test 4 montre qu'un message peut être remis deux fois.
