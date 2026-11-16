# Tests du prototype

Trois niveaux de tests, distingués par ce qui est lancé (fiche 0005), plus le test de charge, joué sur le prototype déployé.

| Niveau | Emplacement | Ce qui est lancé | Dépendances |
|---|---|---|---|
| Unitaire | `libs/socle/src/`, `services/*/src/` (`*.spec.ts`) | Une règle, un cas d'usage, la garde | Doubles de test |
| Intégration | `services/*/test/integration/` | Un service complet, appelé en HTTP | PostgreSQL et RabbitMQ réels ; jetons d'un émetteur de test |
| Acceptation | `tests/acceptation/` | Les deux services en conteneurs | PostgreSQL, RabbitMQ et Keycloak réels |
| Charge | `tests/charge/` | Le prototype déployé sur le cluster, appelé par k6 à travers l'Ingress, en HTTPS | Tout le cluster ; jetons de Keycloak |

Chaque test d'intégration ou d'acceptation porte dans son titre l'identifiant du critère qu'il prouve (`CA-01` à `CA-19`).

## Contenu

| Élément | Rôle |
|---|---|
| `environnement/compose.yaml` | Environnement de test (fiche 0013) : PostgreSQL et RabbitMQ ; avec le profil `acceptation`, Keycloak et les deux services |
| `environnement/demarrer.sh` | Démarre l'environnement. Crée les mots de passe au hasard dans `environnement/.env`, non versionné ; crée les comptes du broker et les comptes de test de Keycloak |
| `environnement/arreter.sh` | Arrête l'environnement, détruit ses données et ses mots de passe |
| `acceptation/src/` | Scénarios du backlog. Ils ne connaissent que des adresses HTTP et des comptes : ni base, ni broker |
| `indicateur-i1.mjs` | Calcule l'indicateur I1 à partir des rapports de Jest |
| `securite/analyses.sh` | Contrôles de sécurité du pipeline, rejouables sur le poste : Gitleaks, Semgrep, Trivy (fiche 0016) |
| `securite/audit.sh` | Inventaire de l'audit (étape 8) : rejoue ces contrôles, y ajoute les images tierces du déploiement, compte toutes les gravités, écrit la preuve |
| `rejouer.sh` | Rejoue tous les tests et enregistre leur sortie brute |
| `charge/scenario.js` | Scénario k6 : paliers de charge, seuils des indicateurs I2 et I4, mesure du délai de notification |
| `charge/lancer.sh` | Lance k6 en conteneur, relève la mise à l'échelle toutes les 10 secondes, écrit la preuve |
| `charge/comptes.sh` | Crée dans Keycloak un compte par utilisateur virtuel |
| `charge/exporter-supervision.sh` | Exporte de Prometheus ce que la supervision a vu pendant un test : Prometheus ne garde que 24 heures |
| `resultats/` | Sortie brute de la dernière exécution : c'est la preuve. `deploiement.txt` et `charge-*.txt` viennent du cluster (étape 7) ; `audit-securite.txt`, de l'inventaire de l'audit (étape 8) |

## Rejouer

Depuis la racine du dépôt. Commandes exécutées avec succès le 13 novembre 2026.

```bash
npm ci                    # installe les versions exactes du fichier de verrou
npm run preuves           # rejoue tout, 1 min 51 s ; code de sortie = nombre de volets en échec
npm run env:arret         # arrête l'environnement et détruit ses données
```

Ou niveau par niveau :

```bash
npm run test:unit
npm run env:integration && npm run test:int
npm run env:acceptation && npm run test:acceptation
```

À savoir :

| Point | Explication |
|---|---|
| `env:integration` arrête les conteneurs des deux services | Les tests d'intégration lancent eux-mêmes le service testé. Un second service lirait la même file et consommerait ses événements |
| Les tests d'acceptation visent un autre environnement en changeant `URL_ANNONCES`, `URL_NOTIFICATIONS` et `URL_JETONS` | Les mêmes scénarios seront rejoués après un déploiement |
| Le test CA-15 arrête puis relance le conteneur du service notifications | Il prouve que la publication ne dépend pas de ce service, et qu'aucun message n'est perdu |
| L'environnement d'acceptation occupe environ 920 Mio | L'arrêter après usage |

## Test de charge

Il vise le prototype déployé sur le cluster local (`deploy/k8s/README.md`). Seul prérequis : Docker. k6 2.4.0 est lancé en conteneur, désigné par l'empreinte de son image. Commandes exécutées avec succès le 15 novembre 2026.

```bash
tests/charge/lancer.sh essai     # 80 secondes, 5 puis 10 utilisateurs : valide le scénario, ne mesure rien
tests/charge/lancer.sh           # test complet : 13 minutes, 50 puis 200 utilisateurs, puis le retour au minimum de pods
```

| Point | Explication |
|---|---|
| Paliers | Montée, charge nominale (3 min), montée, pointe (4 min), descente, retour à la charge nominale (3 min) |
| Un utilisateur virtuel | Un compte Keycloak à lui. Il consulte les annonces, consulte ses notifications et, une fois sur cinq, publie ; une action toutes les 1 à 3 secondes |
| Seuils bloquants | I2 : 95 % des publications en moins de 500 ms à la charge nominale. I4 : au moins 99 % de requêtes réussies, à la charge nominale et en pointe. Notification visible en moins de 5 secondes |
| Code de sortie | Celui de k6 : non nul si un seuil n'est pas tenu |
| Sorties | `charge/resultats/<date>/`, brutes et non versionnées ; le test complet écrit sa preuve dans `resultats/charge-<nominale>-<pointe>.txt` |
| Relevé de la mise à l'échelle | Lu dans l'API de Kubernetes et dans Prometheus. Il n'interroge pas le broker : la commande `rabbitmqctl`, lancée toutes les 10 secondes, faussait la mesure |

## Contrôles de sécurité

Les mêmes commandes que dans le pipeline, avec les mêmes versions d'outils. Seul prérequis : Docker. Commandes exécutées avec succès le 14 novembre 2026.

```bash
tests/securite/analyses.sh secrets                          # Gitleaks : secret commité, dans tout l'historique
tests/securite/analyses.sh sast                             # Semgrep : motifs de code dangereux
tests/securite/analyses.sh dependances                      # Trivy : vulnérabilités des dépendances
tests/securite/analyses.sh image epouvante/annonces:local   # Trivy : tout le contenu d'une image
```

Le code de sortie est 0 si rien n'est à signaler. Les rapports complets sont écrits dans `reports/securite/`, non versionné. Un risque accepté s'inscrit dans `.trivyignore`, à la racine, avec son auteur, sa raison et sa date d'expiration.

Inventaire de l'audit, exécuté avec succès le 16 novembre 2026 (50 secondes ; prérequis : Docker et `jq`) :

```bash
tests/securite/audit.sh   # tous les contrôles, plus les images de PostgreSQL, RabbitMQ et Keycloak ; écrit resultats/audit-securite.txt
```

Il ne remplace pas le pipeline : le pipeline bloque sur « haute ou critique, avec correctif », l'inventaire compte tout. Un constat ne le fait pas échouer ; un contrôle qui n'a écrit aucun rapport, si. Analyse : [audit et plan de remédiation](../docs/08-audit-et-remediation.md).
