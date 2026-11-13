# Tests du prototype

Trois niveaux de tests, distingués par ce qui est lancé (fiche 0005), plus le test de charge de l'étape 7.

| Niveau | Emplacement | Ce qui est lancé | Dépendances |
|---|---|---|---|
| Unitaire | `libs/socle/src/`, `services/*/src/` (`*.spec.ts`) | Une règle, un cas d'usage, la garde | Doubles de test |
| Intégration | `services/*/test/integration/` | Un service complet, appelé en HTTP | PostgreSQL et RabbitMQ réels ; jetons d'un émetteur de test |
| Acceptation | `tests/acceptation/` | Les deux services en conteneurs | PostgreSQL, RabbitMQ et Keycloak réels |
| Charge | `tests/charge/` | — | Étape 7 |

Chaque test d'intégration ou d'acceptation porte dans son titre l'identifiant du critère qu'il prouve (`CA-01` à `CA-19`).

## Contenu

| Élément | Rôle |
|---|---|
| `environnement/compose.yaml` | Environnement de test (fiche 0013) : PostgreSQL et RabbitMQ ; avec le profil `acceptation`, Keycloak et les deux services |
| `environnement/demarrer.sh` | Démarre l'environnement. Crée les mots de passe au hasard dans `environnement/.env`, non versionné ; crée les comptes du broker et les comptes de test de Keycloak |
| `environnement/arreter.sh` | Arrête l'environnement, détruit ses données et ses mots de passe |
| `acceptation/src/` | Scénarios du backlog. Ils ne connaissent que des adresses HTTP et des comptes : ni base, ni broker |
| `indicateur-i1.mjs` | Calcule l'indicateur I1 à partir des rapports de Jest |
| `rejouer.sh` | Rejoue tous les tests et enregistre leur sortie brute |
| `resultats/` | Sortie brute de la dernière exécution : c'est la preuve |

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
