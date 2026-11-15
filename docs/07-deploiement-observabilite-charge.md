# Étape 7 — Déploiement, observabilité, charge

- Date : 15 novembre 2026
- Statut : en attente de validation
- Références : [architecture, paragraphes 8 à 10](03-architecture.md), [indicateurs I2 et I4](02-processus-developpement.md#2-indicateurs-de-qualité), [pipeline](06-pipeline-ci-cd.md)
- Fichiers : [deploy/k8s/](../deploy/k8s/README.md), [tests/charge/](../tests/README.md#test-de-charge)
- Décision prise à cette étape : fiche [0017](adr/0017-manifestes-et-kustomize.md)
- Preuves : [deploiement.txt](../tests/resultats/deploiement.txt), [charge-50-200.txt](../tests/resultats/charge-50-200.txt), [charge-20-80.txt](../tests/resultats/charge-20-80.txt), [charge-50-200-execution-1.txt](../tests/resultats/charge-50-200-execution-1.txt)

## 1. Objet

Ce document décrit le déploiement du prototype sur Kubernetes, sa supervision et son test de charge : ce qui a été écrit, ce qui a été mesuré, ce qui a cassé, et ce qui reste hors de cette étape. Chaque chiffre vient d'une exécution réelle du 15 novembre 2026, sur le cluster local k3d du poste.

Résultat, en quatre points :

1. Le prototype est déployé sur Kubernetes par un script rejouable. 49 contrôles automatiques et les 12 tests d'acceptation réussissent sur le cluster, à travers l'Ingress, en HTTPS.
2. La disponibilité est démontrée : perte d'un pod et mise à jour progressive sans aucune requête en erreur.
3. La supervision collecte chaque pod ; un tableau de bord affiche les indicateurs I2 et I4.
4. Le test de charge a été joué trois fois. À la charge nominale (50 utilisateurs simultanés), les indicateurs I2 et I4 sont tenus : une publication répond en 45 ms au 95e centile, sans aucune requête en échec. En pointe (200 utilisateurs), le service reste debout mais répond en 3 secondes : le poste de 8 Go sature, et le pod ajouté par la mise à l'échelle met 6 minutes à être prêt. Le test a révélé cinq défauts réels, gardés pour l'audit.

## 2. Paramètres fixés à cette étape

Quatre paramètres n'étaient fixés par aucun document. Choix du 15 novembre 2026.

| Paramètre | Choix | Alternative écartée | Conséquence |
|---|---|---|---|
| Environnement | Cluster k3d du poste maintenant ; environnement distant ensuite | Commander l'environnement distant tout de suite | Déploiement distant, certificat d'une autorité publique et temps 4 du pipeline non réalisés. L'intervenant n'a pas encore répondu sur l'« environnement managé » (échéance : 20 décembre 2026) |
| Charge nominale | 50 utilisateurs simultanés ; pointe à 200 | 20 et 100 | Hypothèse : 5 000 membres, dont 1 % connectés en même temps ; pointe à 4 fois la charge nominale (festival, figurine exclusive). Le contexte ne donne aucun volume : l'hypothèse est à faire valider par la maîtrise d'ouvrage |
| Manifestes | Fichiers YAML assemblés par Kustomize | Chart Helm | Fiche 0017 |
| Conteneurs étrangers au projet | Arrêtés pendant l'étape | Les laisser tourner | Quatre conteneurs d'autres projets partageaient la mémoire du moteur Docker |

## 3. Ce qui est livré

| Élément | Emplacement | Contenu |
|---|---|---|
| Manifestes | `deploy/k8s/base/`, `deploy/k8s/overlays/local/` | Espace de noms, règles réseau, PostgreSQL, RabbitMQ, Keycloak, les deux services, HPA, Ingress |
| Déploiement | `deploy/k8s/deployer.sh` | Tout l'ordre du déploiement, Secrets créés au hasard |
| Vérification | `deploy/k8s/verifier.sh` | 49 contrôles, en 8 volets |
| Accès depuis le poste | `deploy/k8s/acces.sh` | Adresses, certificat de l'autorité locale, comptes de test |
| Supervision | `deploy/k8s/observabilite/` | Valeurs du chart Helm, objets de collecte, tableau de bord Grafana, script d'installation |
| Test de charge | `tests/charge/` | Scénario k6, lanceur, création des comptes |
| Analyse des manifestes | `tests/securite/analyses.sh manifestes` | Trivy, mode configuration, sur `deploy/k8s/` |
| Preuves | `tests/resultats/` | `deploiement.txt` ; `charge-50-200.txt`, `charge-20-80.txt`, `charge-50-200-execution-1.txt` |

Modifications du prototype rendues nécessaires par le déploiement, tests écrits avant le code (commit rouge `1692ff4`, commit vert `6b5edb6`) :

| Fichier | Modification |
|---|---|
| `libs/socle/src/sante/` | Route `/sante/pret` : sonde « prêt », qui interroge la base de données. `/sante` reste la sonde « vivant » |
| `libs/socle/src/metriques/` | Route `/metrics` et mesure de la durée de chaque requête de l'API |
| `tests/acceptation/src/outils.ts` | L'arrêt du service notifications se constate sur une route de l'API, et non sur `/sante`, que l'Ingress n'expose pas |

Tests après ces modifications : 150 tests unitaires et 113 tests d'intégration réussis, contre 130 et 101.

## 4. Le déploiement réalisé

### 4.1 Objets

| Composant | Objet Kubernetes | Pods | Réservé (requests) | Plafond (limits) | Stockage |
|---|---|---|---|---|---|
| Service annonces | Deployment, Service, HPA | 2 à 4 | 250 millicœurs, 128 Mio | 500 millicœurs, 256 Mio | — |
| Service notifications | Deployment, Service, HPA | 2 à 4 | 250 millicœurs, 128 Mio | 500 millicœurs, 256 Mio | — |
| PostgreSQL 18.7 | StatefulSet, Service | 1 | 100 millicœurs, 128 Mio | 1 cœur, 384 Mio | Volume de 1 Gio |
| RabbitMQ 4.4.0 | StatefulSet, Service | 1 | 100 millicœurs, 256 Mio | 1 cœur, 512 Mio | Volume de 1 Gio |
| Keycloak 26.8.2 | Deployment, Service | 1 | 250 millicœurs, 512 Mio | 2 cœurs, 1 Gio | Base dans PostgreSQL |
| Point d'entrée | 2 Ingress (Traefik), 2 certificats | — | — | — | — |
| Réseau | 6 NetworkPolicy | — | — | — | — |

Définitions :

- Deployment : objet qui maintient un nombre de pods identiques et les remplace un par un lors d'une mise à jour. StatefulSet : la même chose pour un composant à état, dont le pod garde son nom et son volume.
- Millicœur : millième d'un cœur de processeur. 250 millicœurs, c'est un quart de cœur.
- « requests » : ce que le pod réserve ; l'ordonnanceur et le HPA s'en servent. « limits » : le plafond. Processeur dépassé, le conteneur est ralenti ; mémoire dépassée, il est tué.

Un seul espace de noms, `epouvante`, porte le prototype. Il applique le niveau `restricted` du contrôle Pod Security Admission : Kubernetes refuse à la création un pod qui tournerait en root ou garderait des privilèges.

### 4.2 Ordre du déploiement

`deploy/k8s/deployer.sh` enchaîne six opérations. Il peut être relancé : chacune est idempotente.

| # | Opération | Durée mesurée au premier déploiement |
|---|---|---|
| 1 | Prérequis du cluster : cert-manager, redirection vers HTTPS, émetteur de certificats | Déjà en place (bac à sable) |
| 2 | Espace de noms, 6 Secrets aux mots de passe tirés au hasard, royaume Keycloak | — |
| 3 | Images des deux services : construites sur le poste, importées dans k3d | — |
| 4 | Phase 1 : règles réseau, PostgreSQL, RabbitMQ, Keycloak | 46 s |
| 5 | Topologie et comptes du broker, comptes de test de Keycloak | — |
| 6 | Phase 2 : les deux services, leur HPA, les Ingress et leurs certificats | 9 s |

Durée totale : 149 s la première fois, 26 à 109 s ensuite. Les services dépendent de la phase 1 pour démarrer : c'est le même ordre que dans l'environnement de test (`tests/environnement/demarrer.sh`), avec les mêmes commandes pour le broker et Keycloak.

Les migrations de base de données sont jouées par un conteneur d'initialisation (« initContainer » : conteneur qui s'exécute avant le service, dans le même pod), comme le prévoit la fiche 0008.

### 4.3 Sondes

| Sonde | Route | Question | En cas d'échec |
|---|---|---|---|
| Démarrage | `/sante` | Le service a-t-il fini de démarrer ? 60 secondes au plus | Les deux autres sondes attendent |
| Prêt | `/sante/pret` | La base de données répond-elle, en 2 secondes au plus ? | Le pod sort du Service, sans redémarrage |
| Vivant | `/sante` | Le processus répond-il ? | Le conteneur est redémarré |

La sonde « vivant » ne teste aucune dépendance, comme le demande le cours : une panne de la base ne doit pas faire redémarrer tous les pods en boucle. Le broker n'entre pas dans la sonde « prêt » : les services s'y reconnectent seuls, et sa panne ne doit pas fermer les routes de lecture.

Avant l'arrêt d'un pod, un délai de 5 secondes (`preStop`) lui laisse le temps de sortir du Service (paragraphe 6).

### 4.4 Mise à l'échelle automatique

Le HPA (Horizontal Pod Autoscaler : objet qui ajuste le nombre de pods) suit l'utilisation du processeur, mesurée par metrics-server.

| Réglage | Valeur | Raison |
|---|---|---|
| Minimum | 2 pods | La perte d'un pod n'interrompt pas le service |
| Maximum | 4 pods | Mémoire du poste |
| Cible | 70 % de la réservation, soit 175 millicœurs par pod | Valeur du cours ; laisse une marge avant le plafond |
| Montée | Un pod de plus toutes les 30 secondes au plus | Par défaut, le HPA peut doubler le nombre de pods d'un coup : cela a saturé le poste (paragraphe 8.4) |
| Descente | Après 5 minutes de charge basse | Valeur par défaut de Kubernetes : évite les oscillations |

Calcul : pods voulus = arrondi supérieur de (pods actuels × utilisation mesurée ÷ cible). Le Deployment ne fixe pas de nombre de pods : c'est le HPA qui décide.

### 4.5 Règles réseau

Méthode du cours : tout fermer, en entrée et en sortie, puis ouvrir flux par flux. Tableau complet en tête de `deploy/k8s/base/dependances/reseau.yaml`.

| Flux autorisé | Port |
|---|---|
| Traefik → annonces, notifications | 3000 |
| Traefik → Keycloak | 8080 |
| annonces, notifications → PostgreSQL | 5432 |
| annonces, notifications → RabbitMQ | 5672 |
| annonces, notifications → Keycloak (lecture des clés publiques) | 8080 |
| Keycloak → PostgreSQL | 5432 |
| Prometheus → annonces, notifications ; Prometheus → RabbitMQ | 3000 ; 15692 |
| Tous les pods → DNS du cluster | 53 |

Ce qui n'apparaît pas est interdit : aucun flux entre les deux services, qui ne se parlent que par le broker (fiche 0007), et aucune sortie vers Internet.

### 4.6 Configuration et secrets

| Donnée | Objet | Origine |
|---|---|---|
| Adresses de la base, du broker, de Keycloak | ConfigMap `services-config` | Manifestes ; l'adresse publique de Keycloak vient de la variante |
| Nom de la base et des comptes d'un service | ConfigMap `annonces-config`, `notifications-config` | Manifestes |
| Mots de passe d'un service | Secret `annonces-acces`, `notifications-acces` | Tirés au hasard par `deployer.sh` |
| Comptes d'administration | Secrets `postgresql-admin`, `rabbitmq-admin`, `keycloak-acces` | Tirés au hasard |
| Comptes de test | Secret `comptes-de-test` | Tirés au hasard |

Un Secret par service : chaque pod ne reçoit que ses propres mots de passe. Aucun secret n'est dans le dépôt. Un ConfigMap généré porte un suffixe calculé sur son contenu : un réglage modifié change le nom, et Kubernetes remplace les pods un par un.

### 4.7 HTTPS et exposition

| Point | Réalisation |
|---|---|
| Point d'entrée unique | Traefik. `api.epouvante.localhost` route par chemin vers les deux services ; `auth.epouvante.localhost` vers Keycloak |
| Certificats | Émis par cert-manager à partir d'une annotation de l'Ingress, signés par l'autorité de certification locale |
| HTTP | Redirigé vers HTTPS (code 301) |
| Ce qui est exposé | Les routes `/api` et, pour Keycloak, `/realms` seulement |
| Ce qui ne l'est pas | `/sante`, `/sante/pret`, `/metrics`, la console d'administration de Keycloak : 404 depuis l'extérieur |
| Keycloak | Mode production (`start`), derrière l'Ingress |

Les noms en `.localhost` sont résolus vers 127.0.0.1 par le poste lui-même : ni fichier `/etc/hosts` à modifier, ni option `--resolve`.

## 5. Vérification du déploiement

`deploy/k8s/verifier.sh` : 49 contrôles réussis sur 49, en 45 secondes. Sortie brute : [deploiement.txt](../tests/resultats/deploiement.txt).

| Volet | Contrôles | Ce qui est prouvé |
|---|---|---|
| 1. Disponibilité | 8 | 2 pods prêts par service ; trois sondes ; ressources réservées et plafonnées ; le HPA mesure le processeur |
| 2. HTTPS | 4 | Redirection 301 ; chaîne de certificats valide avec l'autorité locale ; sans elle, le client refuse (code 60 de curl) |
| 3. Exposition | 6 | 401 sans jeton sur `/api` ; 404 sur les routes internes et la console de Keycloak ; émetteur des jetons correct |
| 4. Chaîne complète | 5 | Jeton de Keycloak, publication (201), notification vue en moins de 5 secondes, retrait refusé à un membre (403) |
| 5. Moindre privilège | 7 | Utilisateur 1000 ; système de fichiers en lecture seule ; aucun jeton de l'API de Kubernetes dans le pod ; pod privilégié refusé par l'espace de noms |
| 6. Règles réseau | 10 | 3 flux autorisés ouverts ; 7 flux interdits refusés, dont service à service, Internet, API de Kubernetes, pod d'un autre espace de noms vers la base |
| 7. Observabilité | 5 | Chaque pod et le broker collectés ; la publication du volet 4 comptée ; le 95e centile se calcule |
| 8. Perte d'un pod | 4 | 60 appels pendant le remplacement, aucun en erreur ; le pod de remplacement est collecté sans réglage |

Contrôles de sécurité du pipeline, rejoués sur le poste avant de pousser (`tests/securite/analyses.sh`) :

| Contrôle | Résultat |
|---|---|
| Gitleaks, tout l'historique | 41 commits, aucun secret |
| Semgrep, manifestes et scripts compris | 266 règles, 220 fichiers, aucun constat |
| Trivy, dépendances | Aucune vulnérabilité haute ou critique corrigeable ; la bibliothèque de métriques ajoutée n'en apporte aucune |
| Trivy, manifestes Kubernetes (nouveau mode `manifestes`) | 3 constats hauts : PostgreSQL, RabbitMQ et Keycloak n'ont pas leur système de fichiers en lecture seule |

L'analyse des manifestes était reportée tant qu'ils n'existaient pas (processus de développement, paragraphe 4.7). Elle entre en mode « informer », sur le poste seulement : ses trois constats ne sont pas corrigés à cette étape, ils vont à l'audit. Les deux services, eux, passent tous les contrôles.

Les 12 tests d'acceptation du backlog, rejoués sur le cluster (`source deploy/k8s/acces.sh && npm run test:acceptation`) : 12 réussis sur 12, en 15 secondes.

| Mesure sur le cluster | Valeur | Rappel, Docker Compose (étape 5) |
|---|---|---|
| Délai entre la publication et la notification visible (CA-11) | 111 ms | 44 à 79 ms |
| Arrêt du service notifications (CA-15) : passage à zéro pod | 2,0 s | 0,5 à 0,8 s |
| Relance : deux pods prêts, migrations comprises | 6,8 s | 2,3 à 3,2 s |
| Notification visible après la relance | 0,2 s | 0,2 à 0,3 s |

Sur le cluster, la requête traverse en plus l'Ingress en HTTPS, et Keycloak tourne en mode production.

## 6. Disponibilité démontrée

| Épreuve | Résultat | Preuve |
|---|---|---|
| Perte d'un pod, avant correction | 5 suppressions, 80 appels pendant chacune : une erreur dans 3 essais sur 5 (502 de Traefik, une absence de réponse) | Journal, 15 novembre |
| Perte d'un pod, après correction | 5 suppressions, 400 appels : aucune erreur | Journal ; volet 8 de `verifier.sh` |
| Mise à jour progressive des deux services | 24 s ; 382 appels pendant la mise à jour, tous servis | Journal |
| Service notifications arrêté | La publication réussit (201) ; la notification arrive à la relance | Test CA-15, sur le cluster |
| Plusieurs pods sur la même file | De 2 à 4 pods consomment la même file. Un pod ajouté par le HPA pendant l'exécution 3 a traité 673 événements dès son arrivée ; la file n'a jamais dépassé 5 messages en attente | Paragraphe 8.6 |

La correction : avant d'arrêter un pod, Kubernetes le retire du Service et lui envoie le signal d'arrêt en même temps. Traefik met un instant à apprendre le retrait et adresse encore des requêtes à un pod qui ferme. Le pod attend désormais 5 secondes, en continuant de servir, avant de recevoir le signal (`preStop`).

Mise à jour progressive : un nouveau pod doit être prêt avant qu'un ancien soit retiré (`maxSurge: 1`, `maxUnavailable: 0`).

## 7. Observabilité

### 7.1 Ce qui est installé

Chart Helm kube-prometheus-stack 93.3.0, celui du cours (fiche 0011), avec des valeurs allégées pour le poste.

| Composant | Rôle | Mémoire mesurée |
|---|---|---|
| Prometheus 3.16.0 | Interroge la route `/metrics` de chaque pod toutes les 15 secondes ; garde 24 heures de mesures | 83 Mio, plus 19 Mio pour son conteneur de rechargement |
| Opérateur Prometheus | Traduit les objets ServiceMonitor en configuration de Prometheus | 34 Mio |
| kube-state-metrics | Expose l'état des objets Kubernetes : pods prêts, pods demandés par le HPA | 29 Mio |
| Grafana 13.3.1 | Affiche le tableau de bord | 224 Mio |

Total : 389 Mio. ServiceMonitor : objet de l'opérateur qui désigne des Services par leurs étiquettes ; Prometheus interroge alors chaque pod qui se trouve derrière. Un pod ajouté par le HPA est collecté sans aucun réglage (volet 8 de la vérification).

Retirés du chart, et pourquoi : Alertmanager et les règles d'alerte (aucune alerte dans le prototype), node-exporter (un pod privilégié de plus), la collecte de kubelet (des milliers de séries pour tous les conteneurs du nœud). Le processeur et la mémoire des deux services viennent de leur propre route `/metrics`.

### 7.2 Ce que les services exposent

| Métrique | Contenu | Usage |
|---|---|---|
| `http_request_duration_seconds` | Durée de chaque requête de l'API, par méthode, gabarit de route et code HTTP | 95e centile (I2), débit, taux de requêtes réussies (I4) |
| `process_*`, `nodejs_*` | Processeur, mémoire, boucle d'événements du processus | Charge de chaque pod |

| Choix | Raison |
|---|---|
| Le gabarit de la route (`/api/annonces/:id`), jamais le chemin reçu | Un identifiant dans l'étiquette créerait une série par annonce |
| « inconnue » pour tout chemin sans route | Un balayage d'adresses ne crée qu'une série |
| Mesure placée avant la garde d'accès | Les refus (401, 403) et les erreurs (500) sont comptés |
| Sondes et collecte non mesurées | On mesure ce que vit le client |
| Paliers de l'histogramme resserrés autour de 500 ms | C'est le seuil de l'indicateur I2 |

Le broker expose ses propres métriques : le nombre de messages en attente dans la file du service notifications.

### 7.3 Tableau de bord

`deploy/k8s/observabilite/tableau-de-bord.json`, 8 panneaux. Il est chargé au démarrage de Grafana, depuis un ConfigMap.

| Panneau | Requête, en clair |
|---|---|
| I2 — temps de réponse au 95e centile d'une publication | 95e centile de la durée des `POST /api/annonces`, seuil tracé à 500 ms |
| I4 — taux de requêtes réussies | 1 − part des réponses 5xx, seuil tracé à 99 % |
| Pods prêts, et pods demandés par le HPA | État des Deployment et des HPA |
| Processeur par pod | Seuil tracé à 0,175 cœur, la cible du HPA |
| Requêtes par seconde, par service et par code | — |
| 95e centile par route | Pour repérer la route qui ralentit |
| Messages en attente dans la file | Métriques du broker |
| Mémoire par pod | Seuil tracé à 256 Mio, le plafond |

Grafana n'est pas exposé par l'Ingress : on y accède par `kubectl port-forward`, comme en cours. Sur le poste, il est lancé à la demande (paragraphe 10, difficulté 2) ; Prometheus, lui, collecte en continu.

## 8. Test de charge

### 8.1 Scénario

`tests/charge/scenario.js`, joué par k6 2.4.0 en conteneur, à travers l'Ingress, en HTTPS vérifié, avec de vrais jetons de Keycloak.

| Élément | Contenu |
|---|---|
| Un utilisateur virtuel | Un compte Keycloak à lui (212 comptes créés). Il déclare deux centres d'intérêt, puis à chaque passage : consulte les annonces, consulte ses notifications, et une fois sur cinq publie |
| Rythme | Une action toutes les 1 à 3 secondes : plus pressé qu'un utilisateur réel, ce qui donne une marge à la mesure |
| Paliers | Montée (1 min), charge nominale (3 min), montée (1 min), pointe (4 min), descente (1 min), retour à la charge nominale (3 min) |
| Observateur | Un utilisateur à part publie toutes les 5 secondes et mesure le délai de la notification chez un membre intéressé (critère CA-11, sous charge) |
| Jetons | Durée de vie de 120 secondes : chaque utilisateur en redemande un toutes les 90 secondes |

| Seuil bloquant | Valeur | Indicateur |
|---|---|---|
| 95e centile des publications, à la charge nominale | Moins de 500 ms | I2 |
| Requêtes en échec (5xx ou sans réponse), à la charge nominale et en pointe | Moins de 1 % | I4 |
| 95e centile du délai de notification, à la charge nominale | Moins de 5 secondes | Hypothèse H5 du backlog |
| Réponses au code attendu (200, 201) | Plus de 99 % | — |

Le relevé de la mise à l'échelle (ce que mesure le HPA, ce qu'il demande, les pods prêts, la file du broker) est pris toutes les 10 secondes.

### 8.2 Mesures de calibrage

| Mesure | Valeur |
|---|---|
| Cluster au repos, 60 lectures à la suite | Médiane 4 ms, 95e centile 16 ms |
| Cluster au repos, 30 publications à la suite | Médiane 10 ms, 95e centile 40 ms |
| Essai court à 25 puis 50 utilisateurs | Publication : 47 ms au 95e centile ; aucune erreur ; pods à 40 % de leur réservation |

### 8.3 Trois exécutions

| # | Paliers | Montée du HPA | Heure | Verdict de k6 | Preuve |
|---|---|---|---|---|---|
| 1 | 50 puis 200 | Par défaut : le nombre de pods peut doubler d'un coup | 16 h 20 | Seuils non tenus : le nœud tombe | [charge-50-200-execution-1.txt](../tests/resultats/charge-50-200-execution-1.txt) |
| 2 | 20 puis 80 | Un pod toutes les 30 secondes au plus | 16 h 42 | Tous les seuils tenus | [charge-20-80.txt](../tests/resultats/charge-20-80.txt) |
| 3 | 50 puis 200 | Un pod toutes les 30 secondes au plus | 16 h 56 | Indicateurs tenus ; un seuil non tenu (codes attendus : 98,2 %) | [charge-50-200.txt](../tests/resultats/charge-50-200.txt) |

L'exécution 3 est la mesure de référence : c'est la charge prévue, avec le réglage corrigé.

### 8.4 Exécution 1 — le poste s'effondre

| Heure | Fait relevé |
|---|---|
| 16 h 21 min 32 s | Charge nominale atteinte : 50 utilisateurs. Processeur des pods : 75 % et 61 % de leur réservation |
| 16 h 22 min 03 s | 125 % et 132 % : le HPA demande 4 pods pour chaque service, d'un coup |
| 16 h 23 min 47 s | Le nœud est saturé (charge de 32 à 36). Traefik, Prometheus, metrics-server et les 4 pods des services redémarrent : leurs sondes ont dépassé leur délai |
| 16 h 26 min 31 s | Les 4 pods de chaque service sont prêts : plus de 4 minutes après la demande du HPA |
| 16 h 30 min 30 s | PostgreSQL refuse des connexions : « too many clients already », 45 refus en une minute |
| 16 h 34 min 28 s | Keycloak est tué par sa sonde (troisième redémarrage). Le nœud passe « NotReady » |
| 16 h 41 min 07 s | Le HPA ramène chaque service de 4 à 2 pods |

Résultat : 45 891 requêtes, 50 % d'échecs au palier nominal, 91 % en pointe ; 35 228 demandes de jeton refusées, Keycloak ne répondant plus.

Ce passage mesure le poste, pas le prototype : la même charge nominale, rejouée à l'exécution 3, se passe sans une erreur. Deux faits l'expliquent. macOS ne laissait que 786 Mio de mémoire réelle à la machine virtuelle de Docker, qui en annonce 3,8 Gio : le reste était en mémoire d'échange. Et quatre pods ont démarré en même temps, chacun avec son programme de migration. Le processeur mesuré à 50 utilisateurs (125 %) est plus de trois fois celui de l'exécution 3 (19 à 38 %) : je n'ai pas établi pourquoi. Hypothèse : l'état de la mémoire du poste à cet instant.

Correction tirée de ce passage : le HPA n'ajoute plus qu'un pod toutes les 30 secondes.

### 8.5 Exécution 2 — 20 puis 80 utilisateurs

24 921 requêtes, aucune en échec ; 24 496 réponses contrôlées, toutes au code attendu.

| Mesure | 20 utilisateurs | 80 utilisateurs |
|---|---|---|
| 95e centile d'une publication | 55 ms | 54 ms |
| 95e centile de la liste des annonces | 30 ms | 26 ms |
| 95e centile du délai de notification | 163 ms | 213 ms |
| Processeur des pods, en % de leur réservation | 13 à 27 % | 25 à 58 % |
| Pods par service | 2 | 2 |

Le prototype tient 80 utilisateurs avec le minimum de pods : le HPA n'a pas eu à intervenir. Aucun conteneur n'a redémarré.

### 8.6 Exécution 3 — 50 puis 200 utilisateurs, la mesure de référence

41 884 requêtes en 13 minutes.

| Mesure | Charge nominale, 50 | Pointe, 200 | Retour, 50 |
|---|---|---|---|
| Requêtes en échec (5xx ou sans réponse) | 0,00 % | 0,02 % | 11,19 % |
| 95e centile d'une publication | 45 ms | 3,17 s | 989 ms |
| 95e centile de la liste des annonces | 26 ms | 2,64 s | — |
| 95e centile du délai de notification | 212 ms | 7,0 s | 3,1 s |
| Processeur des pods, en % de leur réservation | 19 à 38 % | 70 à 126 %, puis mesure indisponible | 57 à 81 % |
| Pods prêts par service | 2 | 2 | 3, puis 4 pour notifications |

Comportement de la mise à l'échelle :

| Heure | Fait relevé |
|---|---|
| 16 h 57 min 55 s | Charge nominale atteinte. Deux pods par service suffisent : le HPA ne demande rien |
| 17 h 01 min 55 s | Pointe atteinte : 200 utilisateurs |
| 17 h 02 min 04 s | Processeur à 92 % de la réservation : le HPA demande un troisième pod pour notifications ; 15 secondes après, pour annonces (95 %) |
| 17 h 02 à 17 h 08 | Le poste sature (charge de 48). Le conteneur du troisième pod annonces ne démarre qu'à 17 h 04 min 43 s. metrics-server ne répond plus : le HPA n'a plus de mesure |
| 17 h 06 min 51 s | Le nœud, trop lent à donner signe de vie, est déclaré « NotReady » : Kubernetes retire tous ses pods des Services. Le nom de la base disparaît du DNS, dont les sondes sont elles-mêmes hors délai. Pendant une minute, les services répondent 500 (« getaddrinfo ENOTFOUND postgresql ») : 84 erreurs lues dans les journaux de trois pods. Un événement, en échec deux fois, part dans la file des messages en échec |
| 17 h 08 min 20 s | Trois pods prêts par service : 6 minutes après la demande |
| 17 h 09 min 12 s | Le HPA demande un quatrième pod pour notifications : prêt en 31 secondes, la charge étant retombée |
| 17 h 15 min 21 s | 5 minutes après la fin de la charge, le HPA ramène chaque service à 2 pods |

Pendant ce test, aucun conteneur du prototype n'a redémarré. Quatre composants d'infrastructure l'ont fait (cert-manager, metrics-server, kube-state-metrics, l'opérateur Prometheus). La file du broker n'a jamais dépassé 5 messages en attente.

Recoupement par la supervision. Prometheus mesure côté serveur ce que k6 mesure côté client :

| Mesure | k6 | Prometheus |
|---|---|---|
| 95e centile d'une publication, charge nominale | 45 ms | 44 ms |
| 95e centile d'une publication, pointe | 3,17 s | 2,17 s |
| Erreurs 5xx renvoyées par les services, charge nominale et pointe | — | Aucune |
| Erreurs 5xx renvoyées par les services, retour | — | Toutes dans la minute de 17 h 07 |

En pointe, k6 voit une seconde de plus que les services : c'est le temps passé avant eux, dans le point d'entrée saturé.

### 8.7 Indicateurs I2 et I4

| Indicateur | Seuil | Mesuré à la charge nominale | Verdict |
|---|---|---|---|
| I2 — 95e centile d'une publication | Moins de 500 ms | 45 ms (exécution 3) ; 55 ms à 20 utilisateurs (exécution 2) | Tenu, avec une marge de 10 |
| I4 — requêtes réussies | Au moins 99 % | 100 % : 0 échec sur 6 654 requêtes | Tenu |
| I4 — en pointe, 200 utilisateurs | Au moins 99 % | 99,98 % | Tenu, mais le temps de réponse passe à 3 secondes |
| I4 — après la pointe, pendant le rétablissement | Seuil non bloquant | 88,8 % | Non tenu pendant ce palier |
| Délai de notification (hypothèse H5) | Moins de 5 secondes | 212 ms | Tenu ; 7 secondes en pointe |

Ces mesures viennent d'un poste de 8 Go où le générateur de charge, le cluster et la supervision partagent les mêmes cœurs. Elles valent comme ligne de base du prototype à la charge nominale. Elles ne valent pas pour dimensionner la cible : la pointe est à rejouer sur l'environnement distant.

Les seuils de I2 et I4 devaient être recalés après la première mesure réelle (processus de développement, paragraphe 2.2). Ils sont maintenus : 500 ms reste l'objectif vu de l'utilisateur, et la ligne de base, 45 ms, vient d'un poste. La décision de les resserrer est à prendre sur l'environnement distant.

### 8.8 Ce que le test apprend

Ce qui tient :

1. À la charge nominale, les deux indicateurs sont tenus avec le nombre minimal de pods.
2. La chaîne asynchrone tient : la file du broker ne s'allonge pas, la notification suit la publication de 0,2 seconde.
3. Le HPA réagit comme réglé : il se déclenche au-dessus de 70 %, ajoute un pod à la fois, puis redescend 5 minutes après la charge.
4. Le prototype ne tombe pas à 4 fois sa charge nominale : il ralentit.

Cinq défauts réels, révélés par la charge. Ils alimentent l'audit de l'étape 8.

| # | Défaut | Preuve | Piste |
|---|---|---|---|
| 1 | La mise à l'échelle arrive trop tard : sur un nœud saturé, un pod met 6 minutes à être prêt, plus que la durée de la pointe | Exécution 3 | Plusieurs nœuds ; migrations sorties du démarrage des pods ; réserve de pods avant un événement annoncé |
| 2 | Le nombre de connexions à PostgreSQL n'est pas borné : 8 pods de 10 connexions, plus Keycloak, dépassent les 100 connexions de la base | Exécution 1 : « too many clients already » | Fixer la taille de chaque réserve de connexions pour que leur somme reste sous le maximum |
| 3 | Quand le nœud est déclaré indisponible, même une minute, le nom de la base disparaît du DNS : les services répondent 500 au lieu d'attendre et de réessayer | Exécution 3 : 84 erreurs en une minute | Plusieurs nœuds ; nouvel essai de connexion dans les services ; Service à adresse fixe pour la base |
| 4 | Un événement en échec deux fois reste dans la file des messages en échec : la notification n'est jamais créée | Exécution 3 : un message dans la file | Procédure de reprise de cette file |
| 5 | Les journaux d'un pod retiré par le HPA sont perdus : une partie des erreurs n'a pas pu être lue | Exécution 3 | Journaux centralisés (limite déjà notée dans l'architecture) |

## 9. Points clés de l'architecture prouvés à cette étape

Le document de l'étape 5 listait ce qui restait à prouver (paragraphe 8).

| Point clé | Ce que l'étape 7 prouve | Reste à prouver |
|---|---|---|
| Communication entre services | Plusieurs pods du service notifications consomment la même file : chaque message est traité une fois. Aucun flux réseau direct entre les deux services : la NetworkPolicy le refuse | — |
| Sécurité | HTTPS de bout en bout jusqu'au point d'entrée, certificats émis par cert-manager ; flux réseau limités ; conteneurs non root, en lecture seule, sans jeton de l'API ; Secrets hors du dépôt ; Keycloak en mode production | Certificat d'une autorité publique ; trafic interne chiffré |
| Hébergement, orchestration | Déploiement Kubernetes rejouable ; sondes ; ressources ; mise à jour progressive et perte d'un pod sans erreur ; mise à l'échelle automatique sous charge | Environnement distant en Europe ; plusieurs nœuds |
| Observabilité | Métriques collectées en continu, tableau de bord des indicateurs I2 et I4 | Alertes ; journaux centralisés |

Bonnes pratiques de sécurité du prototype (architecture, paragraphe 8.4), état après cette étape :

| # | Bonne pratique | État | Preuve |
|---|---|---|---|
| 4 | Échanges externes chiffrés (HTTPS) | Prouvée en local | Volet 2 de la vérification |
| 5 | Moindre privilège | Prouvée | Volets 5 et 6 de la vérification |

## 10. Difficultés rencontrées

Onze difficultés réelles. Dix sont résolues ; la onzième l'est en partie : la pointe reste hors de portée du poste.

| # | Symptôme | Cause | Solution |
|---|---|---|---|
| 1 | À l'installation, npm annonce que `prom-client` est déprécié | La bibliothèque, notée de mémoire, a changé de mains le 25 août 2026 : son dépôt appartient désormais à l'organisation Prometheus | Annonce vérifiée dans le registre npm et sur GitHub avant d'être suivie ; `@prometheus-io/client` 0.16.1 |
| 2 | Grafana redémarre en boucle ; puis le cluster entier se dégrade, jusqu'aux pods du prototype | Grafana 13 charge une quinzaine d'extensions de sources de données, chacune dans son processus, et deux conteneurs auxiliaires de 155 Mio. Le poste se met à échanger sa mémoire ; les sondes dépassent leur délai | Extensions inutiles désactivées (`disable_plugins`), conteneurs auxiliaires remplacés par un chargement depuis des fichiers : 224 Mio au lieu de 325, prêt en 50 s. Sur le poste, Grafana est lancé à la demande |
| 3 | RabbitMQ redémarre | Sa sonde lançait `rabbitmq-diagnostics`, donc une machine virtuelle Erlang, à chaque passage : hors délai sur le poste chargé | Sondes par connexion TCP |
| 4 | Chaque déploiement remplace tous les pods, même sans changement de code | Docker joint à l'image une attestation qui porte l'heure de la construction : l'identifiant change à chaque fois | `docker build --provenance=false` pour les images construites sur le poste |
| 5 | Les flux interdits sont refusés en 119 ms au lieu d'expirer | k3s rejette les paquets (règle `REJECT`, lue dans les règles iptables du nœud) ; d'autres réseaux de cluster les jettent, ce que décrit le cours | Attente du script corrigée. Le blocage est le même ; seul le symptôme diffère |
| 6 | Une erreur 502 lors de la suppression d'un pod, 3 fois sur 5 | Course entre le retrait du Service et le signal d'arrêt | Délai de 5 secondes avant l'arrêt (`preStop`) |
| 7 | Des contrôles de `verifier.sh` échouent alors que le déploiement est bon | Le bash 3.2 de macOS garde les barres obliques inverses dans deux substitutions imbriquées ; des contrôles lisaient une mesure avant qu'elle existe | Requêtes construites à part ; attente bornée devant chaque contrôle qui dépend d'une mesure |
| 8 | À 5 utilisateurs, le 95e centile monte à 829 ms | Mon relevé lançait `rabbitmqctl` toutes les 10 secondes : la mesure perturbait le système mesuré | File lue dans Prometheus |
| 9 | `deployer.sh` s'arrête une fois sans message | Non établie : la sortie était filtrée à l'affichage | Le script dit désormais quelle ligne a échoué ; le cas ne s'est pas reproduit |
| 10 | La suppression des espaces de noms du bac à sable est refusée | Garde-fou de l'outil de travail contre les actions destructrices | Charges mises à zéro pod, sans rien supprimer |
| 11 | Le premier test à 50 puis 200 utilisateurs fait tomber le nœud | Le poste de 8 Go : la machine virtuelle de Docker n'a que 786 Mio de mémoire réelle ; et le HPA lançait quatre pods d'un coup | HPA réglé pour ajouter un pod à la fois ; test rejoué : la charge nominale passe sans erreur. La pointe reste hors de portée du poste |

Trois leçons, à défendre devant le jury :

1. Une sonde est un programme qui consomme. Une sonde coûteuse ou trop pressée transforme un ralentissement en panne : RabbitMQ, Grafana, puis tout le nœud ont été redémarrés par leurs propres sondes.
2. Mesurer perturbe. Le relevé a faussé le premier essai ; un contrôle lancé trop tôt a signalé une panne qui n'existait pas. Même leçon qu'aux étapes 5 et 6 : un contrôle ne prouve rien tant que l'on n'a pas vérifié ce qu'il mesure.
3. Un test de charge mesure toute la chaîne, poste compris. Le premier résultat est mauvais et il est gardé : il dit où est la limite. Rejoué après correction, le test sépare ce qui tient (la charge nominale) de ce qui ne tient pas encore (la pointe), et il a révélé cinq défauts qu'aucun autre test n'avait vus.

## 11. Écarts avec l'architecture et le processus

Les documents validés ne sont pas réécrits. Ce tableau dit ce que la réalisation a précisé ou changé.

| Sujet | Prévu | Réalisé | Raison |
|---|---|---|---|
| Environnement de démonstration | Cluster hébergé en Europe | Cluster k3d du poste | Paragraphe 2 |
| Temps 4 du pipeline : `deploiement`, `verification` | Sur `main`, après validation humaine | Non réalisé | Les exécuteurs de GitHub ne joignent pas le poste. `deployer.sh` accepte déjà les images du pipeline, par leur empreinte |
| Job `test-de-charge` | Lancement manuel dans le pipeline | Lancement sur le poste | Même raison. La grille le dit facultatif |
| Sondes | « Vivant » et « prêt » | Les deux, plus une sonde de démarrage | Laisser démarrer sans allonger la sonde « vivant » |
| Supervision | Chart kube-prometheus-stack | Le même, allégé ; Grafana à la demande sur le poste | La fiche 0011 l'annonçait : « elle ne tournera peut-être que sur l'environnement distant ». Mesuré : elle tourne, mais pas pendant une charge |
| Bibliothèque de métriques | Non précisée | `@prometheus-io/client` | Difficulté 1 |
| Exposition de Keycloak | « Le serveur d'identité » | Le chemin `/realms` seulement | La console d'administration reste interne |
| Mise à l'échelle | HPA sur le processeur | Le même, montée limitée à un pod par 30 secondes | Paragraphe 8.4 |
| Mesure de I2 et I4 | Sur l'environnement de démonstration | Sur le poste : tenus à la charge nominale | Paragraphe 8.7 |
| Seuils de I2 et I4 | « Recalés après la première mesure réelle » | Maintenus | La mesure vient d'un poste : paragraphe 8.7 |
| Noms d'hôte locaux | `api.epouvante.test` (bac à sable) | `api.epouvante.localhost` | Résolus par le poste sans réglage |

## 12. Limites et ce qui n'a pas été exécuté

| Sujet | État | Quand |
|---|---|---|
| Environnement distant, hébergé en Europe | Non commandé. Variante distante des manifestes non écrite | Après la réponse de l'intervenant ; au plus tard le 28 février 2027 |
| Certificat d'une autorité publique | Non exécuté : demande un nom de domaine et un environnement joignable | Avec l'environnement distant |
| Déploiement et test de charge par le pipeline | Non réalisés | Avec l'environnement distant |
| Pointe à 200 utilisateurs | Exécutée deux fois : le poste sature. Temps de réponse de 3 secondes, mise à l'échelle trop tardive | À rejouer sur l'environnement distant |
| Défauts révélés par la charge | Cinq, non corrigés à cette étape (paragraphe 8.8) | Audit, étape 8 |
| Consommation de processeur | Gonflée par la contention du poste : les valeurs du HPA ne se transposent pas | À remesurer sur l'environnement distant |
| Un seul nœud | La saturation ou la panne de la machine arrête tout ; pas de répartition des pods entre nœuds | Cible : plusieurs nœuds (architecture, paragraphe 12) |
| Grafana | Lancé à la demande sur le poste ; aucune alerte ; Prometheus sans volume : l'historique est perdu au redémarrage du pod | Cible |
| Espace de noms `monitoring` | Ni règles réseau, ni niveau `restricted` | Audit, étape 8 |
| Keycloak | Un seul pod ; compte d'administration provisoire encore actif ; client `tests` à connexion directe présent sur l'environnement | Audit, étape 8 |
| Secrets Kubernetes | Encodés, non chiffrés, dans la base du cluster | Audit, étape 8 |
| Trafic interne au cluster | En clair | Cible (architecture, paragraphe 12) |
| Images tierces | PostgreSQL, RabbitMQ, Keycloak : désignées par une étiquette de version, non scannées par le pipeline. Constat de l'étape 6 sur `postgres:18.7-alpine` inchangé | Audit, étape 8 |
| Conteneurs tiers | Système de fichiers inscriptible : 3 constats hauts de Trivy. Keycloak, lancé par `start`, écrit dans son dossier d'installation au démarrage | Audit, étape 8 |
| Analyse des manifestes | Lancée sur le poste, pas dans le pipeline | Audit, étape 8 : l'ajouter en mode « informer », puis bloquant |
| Images déployées | Construites sur le poste, non scannées. Les images du pipeline, scannées, n'ont pas encore été déployées sur le cluster | À la fusion de cette étape |
| Migrations | Jouées par chaque pod à son démarrage : chaque montée en charge paie ce coût | Cible : un Job par déploiement |
| Mise à l'échelle du service notifications | Sur le processeur ; la longueur de la file serait un meilleur signal | Cible |
| Limitation de débit à l'entrée | Absente (risque R8) | Cible |
| Liste des annonces | Compte toutes les annonces publiées à chaque appel | Audit, étape 8 |
| Broker arrêté au moment de publier | Inchangé : l'événement est perdu (étape 5) | Audit, étape 8 |
| Comptes de charge | 212 comptes de test dans le royaume du cluster | À supprimer avec l'environnement |

## 13. Reproduire

Depuis la racine du dépôt. Commandes exécutées avec succès le 15 novembre 2026. Prérequis : ceux de `deploy/k3d/README.md`, plus `jq`.

| Action | Commande |
|---|---|
| Démarrer le cluster | `k3d cluster start epouvante` |
| Déployer | `deploy/k8s/deployer.sh` |
| Installer la supervision | `deploy/k8s/observabilite/installer.sh` |
| Vérifier | `deploy/k8s/verifier.sh` |
| Tests d'acceptation sur le cluster | `source deploy/k8s/acces.sh && npm run test:acceptation` |
| Analyse des manifestes | `tests/securite/analyses.sh manifestes` |
| Essai court du test de charge | `tests/charge/lancer.sh essai` |
| Test de charge, 50 puis 200 utilisateurs | `tests/charge/lancer.sh` |
| Test de charge, autres paliers | `CHARGE_NOMINALE=20 CHARGE_POINTE=80 tests/charge/lancer.sh` |
| Ouvrir Grafana | `kubectl -n monitoring scale deploy supervision-grafana --replicas=1`, puis `kubectl -n monitoring port-forward svc/supervision-grafana 3000:80` |
| Arrêter le cluster | `k3d cluster stop epouvante` |

Avant un test de charge sur le poste : fermer les applications inutiles, arrêter les autres conteneurs Docker, refermer Grafana.

## 14. Suite

L'étape 8 analyse les résultats des tests, des scans et de ces mesures, et en tire le plan de remédiation. Les limites du paragraphe 12 en sont la matière. Le déploiement distant, lui, attend la réponse de l'intervenant et la commande de l'environnement.
