# Déploiement du prototype sur Kubernetes

Manifestes et scripts de l'étape 7. Les manifestes sont des fichiers YAML assemblés par Kustomize, l'outil de variantes intégré à `kubectl` (fiche 0017). Document de l'étape : [docs/07-deploiement-observabilite-charge.md](../../docs/07-deploiement-observabilite-charge.md).

## Contenu

| Élément | Rôle |
|---|---|
| `base/dependances/` | Espace de noms, règles réseau, PostgreSQL, RabbitMQ, Keycloak : appliqués en premier |
| `base/services/` | Les deux services : Deployment, sondes, ressources, Service, HPA |
| `overlays/local/` | Variante du cluster k3d : noms d'hôte en `.localhost`, Ingress, émetteur de certificats local |
| `cluster/` | Prérequis du cluster : redirection de HTTP vers HTTPS, émetteur de certificats |
| `observabilite/` | Prometheus et Grafana : valeurs du chart Helm, objets de collecte, tableau de bord, scripts d'installation et de capture |
| `deployer.sh` | Déploie tout, dans l'ordre. Crée les Secrets au hasard : aucun n'est dans le dépôt |
| `verifier.sh` | Contrôle le déploiement : 49 contrôles, résultat dans `tests/resultats/deploiement.txt` |
| `acces.sh` | À charger pour appeler le prototype depuis le poste : adresses, certificat de l'autorité locale, comptes de test |
| `demo.sh` | Démonstration de la soutenance, en huit temps : chaîne complète, sécurité, perte d'un pod. Déroulé dans [docs/soutenance/02-demonstration.md](../../docs/soutenance/02-demonstration.md) |

## Commandes

Depuis la racine du dépôt, le cluster k3d étant démarré (`deploy/k3d/README.md`). Commandes exécutées avec succès le 15 novembre 2026 ; celles de la démonstration, le 16 novembre 2026.

| Action | Commande | Durée mesurée |
|---|---|---|
| Déployer, images construites sur le poste | `deploy/k8s/deployer.sh` | 149 s la première fois, 100 s ensuite |
| Déployer les images du pipeline | `IMAGE_ANNONCES=ghcr.io/…@sha256:… IMAGE_NOTIFICATIONS=ghcr.io/…@sha256:… deploy/k8s/deployer.sh` | 46 s |
| Installer la supervision | `deploy/k8s/observabilite/installer.sh` | 65 à 90 s |
| Vérifier le déploiement | `deploy/k8s/verifier.sh` | 45 à 55 s |
| Rejouer les tests d'acceptation sur le cluster | `source deploy/k8s/acces.sh && npm run test:acceptation` | 15 à 25 s |
| Répéter la démonstration, sans pause | `deploy/k8s/demo.sh repetition` : résultat dans `tests/resultats/demonstration.txt` | 14 à 16 s |
| Jouer la démonstration en direct | `deploy/k8s/demo.sh` : la touche Entrée lance chaque temps | — |
| Relever l'empreinte d'une image du pipeline | `docker buildx imagetools inspect ghcr.io/<compte>/epouvante-annonces:<SHA du commit>` | — |
| Voir ce qui serait appliqué, sans rien appliquer | `kubectl kustomize deploy/k8s/overlays/local` | — |
| Appeler l'API à la main | `source deploy/k8s/acces.sh && curl --cacert "$AC_LOCALE" "$URL_API/api/annonces"` | — |
| Ouvrir Grafana | `kubectl -n monitoring scale deploy supervision-grafana --replicas=1`, puis `kubectl -n monitoring port-forward svc/supervision-grafana 3000:80` | — |
| Refermer Grafana | `kubectl -n monitoring scale deploy supervision-grafana --replicas=0` | — |
| Capturer le tableau de bord sur une période, en images | `deploy/k8s/observabilite/capturer.sh 2026-11-15T16:55 2026-11-15T17:20 docs/captures charge-50-200` | 1 min 30 s |

`source deploy/k3d/env.sh` avant toute commande `kubectl` ou `helm` lancée à la main.

## Ce que fait `deployer.sh`

Le script peut être relancé : chaque opération est idempotente.

| # | Opération | Pourquoi dans cet ordre |
|---|---|---|
| 1 | Prérequis du cluster : cert-manager, redirection vers HTTPS, émetteur de certificats | Les Ingress en ont besoin |
| 2 | Espace de noms, Secrets, royaume Keycloak | Un pod ne démarre pas sans ses Secrets. Un Secret existant n'est jamais recréé |
| 3 | Images : construites sur le poste et importées dans k3d, ou désignées dans le registre | L'étiquette locale est le début de l'identifiant de l'image : elle ne change que si le contenu change |
| 4 | Phase 1 : règles réseau, PostgreSQL, RabbitMQ, Keycloak | Les services en dépendent pour démarrer |
| 5 | Topologie et comptes du broker ; comptes de test de Keycloak | Mêmes commandes que dans l'environnement de test |
| 6 | Phase 2 : les deux services, leur HPA, les Ingress | Les migrations de chaque service sont jouées par un conteneur d'initialisation, avant le service |

## Choix à connaître

| Choix | Raison |
|---|---|
| Noms d'hôte `api.epouvante.localhost` et `auth.epouvante.localhost` | Le poste résout seul les noms en `.localhost` vers 127.0.0.1 : ni `/etc/hosts`, ni option `--resolve` |
| Un Secret par service | Chaque pod ne reçoit que ses propres mots de passe |
| Espace de noms au niveau `restricted` | Kubernetes refuse à la création un pod root ou privilégié |
| Règles réseau : tout fermé, puis un flux à la fois | Tableau des flux en tête de `base/dependances/reseau.yaml` |
| Sondes de RabbitMQ par connexion TCP | La commande `rabbitmq-diagnostics` lance une machine virtuelle Erlang à chaque passage : sur le poste chargé, elle a fait redémarrer le broker |
| Délai de 5 secondes avant l'arrêt d'un pod (`preStop`) | Sans lui, Traefik adresse encore des requêtes à un pod qui ferme : erreurs 502 constatées |
| Grafana lancé à la demande sur le poste | Le poste de 8 Go ne tient pas le prototype, la supervision et une charge ensemble. Prometheus, lui, collecte en continu |
| Seul `/realms` de Keycloak est exposé | La console d'administration reste interne au cluster |

## Limites

Elles sont détaillées dans le document de l'étape. Les principales : un seul nœud ; certificat d'une autorité locale ; environnement distant non commandé, donc variante distante et déploiement par le pipeline non réalisés.
