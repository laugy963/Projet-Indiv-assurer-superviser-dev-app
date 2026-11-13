# Bac à sable

Code et configuration des expérimentations de l'étape 4, un sous-dossier par expérimentation. Chaque sous-dossier suffit à rejouer l'expérimentation. La synthèse de chaque protocole (environnement, étapes, résultats, difficultés, limites, décision) est dans [docs/experimentations/](../docs/experimentations/README.md).

| Dossier | Expérimentation | Protocole |
|---|---|---|
| [01-broker-rabbitmq/](01-broker-rabbitmq/) | RabbitMQ sur Kubernetes : publication, consommation, résistance aux pannes | [01-broker-rabbitmq.md](../docs/experimentations/01-broker-rabbitmq.md) |
| [02-ingress-https/](02-ingress-https/) | Ingress HTTPS : Traefik et cert-manager | [02-ingress-https.md](../docs/experimentations/02-ingress-https.md) |
| [03-keycloak-jeton/](03-keycloak-jeton/) | Keycloak : jeton, rôles, vérification par un service | [03-keycloak-jeton.md](../docs/experimentations/03-keycloak-jeton.md) |

## Rejouer

Le cluster local doit exister et être démarré : voir [deploy/k3d/README.md](../deploy/k3d/README.md).

```bash
sandbox/01-broker-rabbitmq/run.sh      # 2 min 35 s
sandbox/02-ingress-https/run.sh        # 1 min 40 s ; à jouer avant la troisième
sandbox/03-keycloak-jeton/run.sh       # 4 min 10 s
sandbox/memoire.sh                     # mesure de la mémoire, tous composants en marche
```

Chaque script affiche un verdict par contrôle (« RÉUSSI » ou « ÉCHEC ») et se termine par un bilan. Son code de sortie est le nombre de contrôles en échec.

## Contenu d'un dossier

| Élément | Rôle |
|---|---|
| `run.sh` | Déroule l'expérimentation de bout en bout |
| `k8s/` | Manifestes Kubernetes |
| `resultats/execution.txt` | Sortie brute de la dernière exécution : c'est la preuve |
| `client/`, `verificateur/` | Petit programme de test et son Dockerfile, quand il en faut un |

Aucun mot de passe n'est versionné : les scripts les créent au hasard à chaque exécution et les rangent dans des Secrets du cluster.
