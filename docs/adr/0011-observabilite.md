# 0011 — Observabilité

- Statut : acceptée
- Date : 12 novembre 2026

## Contexte

- Les consignes demandent une composante d'observabilité : logs centralisés, métriques ou traces distribuées.
- Deux indicateurs du processus se lisent en exploitation : le temps de réponse (I2) et le taux de requêtes réussies (I4).
- La soutenance doit montrer la montée en charge.
- Le cours Kubernetes installe Prometheus et Grafana (TP 18).
- Le poste de développement a 8 Go de mémoire.

## Décision

La composante retenue est celle des métriques.

| Sujet | Choix |
|---|---|
| Exposition | Chaque service expose ses métriques sur une route interne `/metrics` : nombre et durée des requêtes par route et par code HTTP, métriques du processus |
| Collecte | Prometheus : il interroge régulièrement chaque pod et conserve les séries de mesures |
| Affichage | Grafana : un tableau de bord avec le temps de réponse au 95e centile, le taux de requêtes réussies et le nombre de pods |
| Installation | Le chart Helm kube-prometheus-stack, celui du cours |

La mise à l'échelle automatique reste pilotée par metrics-server, fourni par k3s : Prometheus sert à observer, pas à décider.

## Pourquoi ce choix

- Les métriques alimentent directement I2 et I4, en continu, et pas seulement pendant un test de charge.
- Le tableau de bord montre la montée en charge en direct : la charge augmente, le temps de réponse se dégrade, des pods s'ajoutent.
- Ce sont les outils du cours : à choix équivalent, l'outil vu en cours est retenu.

## Alternatives écartées

| Alternative | Raison du rejet |
|---|---|
| Logs centralisés (Loki et Grafana) | Utiles à l'audit : savoir qui a fait quoi. Mais ils ne mesurent ni le temps de réponse ni le taux d'erreur. En cible |
| Traces distribuées (OpenTelemetry) | Elles suivent une requête d'un service à l'autre, y compris à travers le broker. Plus coûteuses à mettre en place. En cible |
| metrics-server seul (`kubectl top`) | Seulement le processeur et la mémoire, sans historique ni métrique applicative |

## Conséquences

- La pile est lourde en mémoire : elle ne tournera peut-être que sur l'environnement distant. À mesurer à l'étape 4.
- La route `/metrics` n'est pas exposée par l'Ingress : elle n'est joignable que dans le cluster.
- Les journaux restent sur la sortie standard des pods, lus avec `kubectl logs`, sans centralisation : limite du prototype.
- Le lien entre Prometheus et les services passe par un objet propre à l'opérateur Prometheus (ServiceMonitor), vu en cours.
