# Cluster Kubernetes local (k3d)

k3d lance k3s, une distribution allégée de Kubernetes, dans des conteneurs Docker. C'est la même distribution que sur l'environnement distant (fiche 0003).

| Fichier | Rôle |
|---|---|
| `cluster.yaml` | Description du cluster : un nœud, version de k3s figée, ports 80 et 443 publiés sur l'adresse locale |
| `env.sh` | À charger avant toute commande `kubectl` ou `helm` du projet |
| `kubeconfig.yaml` | Fichier d'accès au cluster, créé par `env.sh`. Non versionné |

## Prérequis

| Outil | Version utilisée le 13 novembre 2026 | Installation |
|---|---|---|
| Docker Desktop | 29.4.3, 3,83 Gio alloués au moteur | — |
| k3d | 5.9.0 | `brew install k3d` |
| kubectl | 1.34.1 | fourni avec Docker Desktop |
| Helm | 4.3.2 | `brew install helm` |

Les ports 80 et 443 du poste doivent être libres.

## Commandes

Toutes les commandes se lancent depuis la racine du dépôt. Elles ont été exécutées avec succès le 13 novembre 2026.

| Action | Commande | Durée mesurée |
|---|---|---|
| Créer le cluster | `k3d cluster create --config deploy/k3d/cluster.yaml` | 25 s |
| Charger l'accès | `source deploy/k3d/env.sh` | — |
| Vérifier | `kubectl get nodes` | — |
| Arrêter le cluster, sans rien perdre | `k3d cluster stop epouvante` | 4 s |
| Relancer le cluster | `k3d cluster start epouvante` | 18 s, puis 275 s pour que tous les pods soient prêts |
| Supprimer le cluster et ses données | `k3d cluster delete epouvante` | non exécutée |

## Ce que le cluster fournit

| Composant | Version | Rôle |
|---|---|---|
| k3s | 1.35.5 | Kubernetes |
| Traefik | 3.6.13 | Contrôleur Ingress, sur les ports 80 et 443 |
| metrics-server | fourni par k3s | Mesures de `kubectl top` et de la mise à l'échelle automatique |
| local-path | fourni par k3s | Stockage : le disque du nœud, sans réplication |

## Choix à connaître

| Choix | Raison |
|---|---|
| Le fichier d'accès reste dans le projet | `~/.kube/config` n'est pas modifié : aucun risque d'agir par erreur sur un autre cluster |
| Ports publiés sur `127.0.0.1` seulement | Le cluster n'est pas joignable depuis le réseau local |
| Un seul nœud | Le moteur Docker n'a que 3,83 Gio |
| Arrêter le cluster quand il ne sert pas | Il occupe environ 2 Gio de mémoire avec les composants du bac à sable |
