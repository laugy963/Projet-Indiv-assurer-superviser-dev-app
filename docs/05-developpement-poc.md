# Étape 5 — Développement du prototype

- Date : 13 novembre 2026
- Statut : en attente de validation
- Code : [services/annonces/](../services/annonces/README.md), [services/notifications/](../services/notifications/README.md), [libs/socle/](../libs/socle/README.md)
- Tests et preuves : [tests/](../tests/README.md), sorties brutes dans [tests/resultats/](../tests/resultats/)
- Décisions prises à cette étape : fiches [0012](adr/0012-socle-commun.md), [0013](adr/0013-environnement-et-jetons-des-tests.md), [0014](adr/0014-audience-du-jeton.md)

## 1. Objet

Ce document décrit le prototype réalisé : ce qui a été écrit, comment chaque critère d'acceptation est prouvé, et ce qui reste hors de cette étape. Chaque chiffre vient d'une exécution réelle du 13 novembre 2026, rejouable par un script.

Résultat : les 19 critères d'acceptation du backlog sont prouvés par des tests automatisés réussis. L'indicateur I1 vaut 100 %.

## 2. Ce qui est livré

| Élément | Emplacement | Contenu |
|---|---|---|
| Service annonces | `services/annonces/` | Publier, lister, retirer une annonce ; émettre l'événement `annonce.publiee` (US-01, US-05, US-06) |
| Service notifications | `services/notifications/` | Centres d'intérêt, consommation de l'événement, notifications (US-02, US-03, US-04) |
| Socle technique | `libs/socle/` | Contrôle d'accès, erreurs, validation, réglages, démarrage : le code commun, sans règle métier (fiche 0012) |
| Image des services | `services/Dockerfile` | Un fichier pour les deux services, en trois étapes |
| Environnement de test | `tests/environnement/` | PostgreSQL, RabbitMQ, Keycloak et les deux services, lancés par Docker Compose (fiche 0013) |
| Tests d'acceptation | `tests/acceptation/` | Les scénarios du backlog, joués de l'extérieur à travers les deux services |
| Preuves | `tests/rejouer.sh`, `tests/resultats/` | Un script rejoue tout ; la sortie brute de chaque niveau de test est conservée |
| Royaume Keycloak | `deploy/keycloak/epouvante-realm.json` | Celui du bac à sable, plus l'audience de l'API (fiche 0014). Aucun compte, aucun mot de passe |

Volume : 1 664 lignes de code, 2 897 lignes de tests et d'outils de test.

## 3. Versions figées

La fiche 0002 renvoyait le choix des versions à cette étape. Elles ont été relevées dans le registre npm et sur nodejs.org le 13 novembre 2026, puis figées sans plage de versions dans les `package.json`.

| Composant | Version | Remarque |
|---|---|---|
| Node.js | 26.13.1 | Version LTS (à support long) en cours |
| NestJS | 12.5.0 | — |
| TypeScript | 6.0.3 | La version courante est la 7.0.2, mais ts-jest exige « < 7 » et typescript-eslint « < 6.1 ». La 6 est aussi celle du gabarit de projet de NestJS 12 |
| TypeORM, pg | 1.1.3, 8.23.1 | — |
| amqplib, amqp-connection-manager | 2.3.1, 5.0.1 | Le transport RabbitMQ de NestJS 12.5.0 fonctionne avec amqplib 2 : point laissé ouvert par le bac à sable, vérifié par les tests |
| jose | 6.2.17 | La bibliothèque du bac à sable |
| class-validator, class-transformer | 0.15.1, 0.5.1 | Validation des entrées |
| Jest, ts-jest, Supertest | 30.5.2, 29.4.15, 7.3.2 | Fiche 0005 |
| ESLint, typescript-eslint, eslint-plugin-security | 10.14.0, 8.72.2, 4.2.1 | Lint et son extension de sécurité |
| PostgreSQL, RabbitMQ, Keycloak | 18.7, 4.4.0, 26.8.2 | Les versions du bac à sable |

## 4. Structure du code

Les deux services suivent la structure en couches du document d'architecture (paragraphe 5.3). La règle : les dépendances pointent vers le domaine, qui ne dépend de rien.

| Couche | Dossier | Service annonces | Service notifications |
|---|---|---|---|
| Point d'entrée | `src/entrees/` | Contrôleur HTTP ; DTO (objets qui décrivent et valident une entrée) | Deux contrôleurs HTTP ; consommateur de l'événement |
| Application | `src/application/` | `PublierAnnonce`, `ListerAnnonces`, `RetirerAnnonce` | `DefinirCentresInteret`, `ListerNotifications`, `NotifierMembresInteresses` |
| Domaine | `src/domaine/` | Règles d'une annonce ; contrat de l'événement ; ports | Centres d'intérêt ; choix des destinataires ; lecture de l'événement ; ports |
| Adaptateurs | `src/adaptateurs/` | Dépôt TypeORM ; émetteur RabbitMQ | Deux dépôts TypeORM |
| Schéma | `src/migrations/` | Table `annonces` | Tables `centres_interet` et `notifications` |

Un port est une classe abstraite du domaine qui dit ce dont un cas d'usage a besoin (« enregistrer une annonce », « émettre un événement »), sans dire comment. Un adaptateur le réalise pour PostgreSQL ou RabbitMQ. Un test unitaire le remplace par un double.

| Point vérifié dans le code | Constat |
|---|---|
| Imports d'un service vers l'autre | Aucun |
| Termes métier dans le socle (annonce, notification, catégorie) | Aucun |
| Liste des catégories | Copiée dans chaque service : elle appartient au contrat de l'événement, pas à un code partagé |

## 5. Méthode : les tests d'abord

Chaque story a suivi le même cycle : écrire les tests, les voir échouer (« rouge »), écrire le code, les voir réussir (« vert »). L'historique Git en garde la trace : un commit rouge précède chaque commit vert.

| Lot | Commit rouge | Commit vert |
|---|---|---|
| Socle : garde, jeton, erreurs, validation | `376c46e` | `3ef7d86` |
| US-01 Publier une annonce | `e93ede3` | `4bc7c7f` |
| US-05 Consulter, US-06 Retirer | `23e3baf` | `07b7c2f` |
| US-02 Centres d'intérêt, US-03 Notifications | `410d3d6` | `e6cdcd3` |
| US-04 Être notifié | `ef74cc7` | `5d42b84`, corrigé par `d9a5a91` |

Le commit `5d42b84` annonçait « vert » alors que cinq tests d'intégration échouaient à cet instant. La cause était l'environnement, pas le code (paragraphe 11, difficulté 6). Le commit `d9a5a91` le dit et corrige.

Les trois niveaux de tests se distinguent par ce qui est lancé (fiche 0005), et par leur emplacement.

| Niveau | Emplacement | Ce qui est lancé | Dépendances |
|---|---|---|---|
| Unitaire | `src/**/*.spec.ts` | Une règle, un cas d'usage, la garde | Doubles de test |
| Intégration (test d'appel) | `services/*/test/integration/` | Un service complet, appelé en HTTP par Supertest | PostgreSQL et RabbitMQ réels ; jetons d'un émetteur de test |
| Acceptation | `tests/acceptation/` | Les deux services en conteneurs | PostgreSQL, RabbitMQ et Keycloak réels |

## 6. Critères d'acceptation et tests

Chaque test porte dans son titre l'identifiant du critère qu'il prouve. Le script `tests/indicateur-i1.mjs` lit les rapports de Jest et compte les tests réussis par critère.

| Critère | Preuve | Niveau | Tests réussis |
|---|---|---|---|
| CA-01 Sans jeton valide : 401 | `controle-acces.int-spec.ts` des deux services : six cas de jeton refusé sur chacune des six routes ; `securite.acceptation-spec.ts` | Intégration, acceptation | 40 |
| CA-02 Sans le rôle : 403 | Les mêmes fichiers : une fois par route | Intégration, acceptation | 7 |
| CA-03 Erreur lisible, sans détail technique | `us-01`, `us-05`, `us-06` du service annonces | Intégration | 8 |
| CA-04 Annonce enregistrée | `us-01-publier-une-annonce.int-spec.ts` | Intégration | 1 |
| CA-05 Annonce invalide : 400 | Même fichier : douze entrées invalides | Intégration | 12 |
| CA-06 Événement émis, conforme au contrat | Même fichier : le message est lu sur le broker réel | Intégration | 2 |
| CA-07 Liste de catégories remplacée | `us-02-declarer-mes-centres-d-interet.int-spec.ts` | Intégration | 6 |
| CA-08 Liste invalide : rien ne change | Même fichier | Intégration | 5 |
| CA-09 Notifications, de la plus récente à la plus ancienne | `us-03-consulter-mes-notifications.int-spec.ts` | Intégration | 2 |
| CA-10 Cloisonnement entre membres | Même fichier : paramètres d'URL et en-tête sans effet | Intégration | 5 |
| CA-11 B est notifié en moins de 5 secondes | `us-04-etre-notifie.acceptation-spec.ts` | Acceptation | 1 |
| CA-12 C n'est pas notifié | Même fichier | Acceptation | 1 |
| CA-13 L'auteur n'est pas notifié | Même fichier | Acceptation | 2 |
| CA-14 Événement remis deux fois : une notification | `us-04-etre-notifie.int-spec.ts`, avec le broker réel | Intégration | 1 |
| CA-15 Service notifications arrêté, puis relancé | `us-04-etre-notifie.acceptation-spec.ts` : le test arrête et relance le conteneur | Acceptation | 1 |
| CA-16 Annonces publiées, par pages de 20 | `us-05-consulter-les-annonces.int-spec.ts` | Intégration | 3 |
| CA-17 Retrait par un modérateur | `us-06-retirer-une-annonce.int-spec.ts` ; `securite.acceptation-spec.ts` | Intégration, acceptation | 3 |
| CA-18 Un membre ne retire pas | Les mêmes fichiers | Intégration, acceptation | 2 |
| CA-19 Annonce absente : 404 | `us-06-retirer-une-annonce.int-spec.ts` | Intégration | 1 |

I1 = 19 critères prouvés sur 19, soit 100 %. Détail : [indicateur-i1.txt](../tests/resultats/indicateur-i1.txt).

« Aucune donnée n'est lue ni modifiée » (CA-01, CA-02) est vérifié ainsi : la réponse ne contient que le code et le message, la table est identique avant et après l'appel, et aucun événement n'est émis.

## 7. Résultats des exécutions

Exécution du 13 novembre 2026 par `tests/rejouer.sh`, après une installation propre (`npm ci`) : cinq volets réussis. Durée mesurée à l'exécution précédente : 1 min 51 s.

| Niveau | Tests réussis | En échec | Sortie brute |
|---|---|---|---|
| Unitaire | 130 (socle 70, annonces 24, notifications 36) | 0 | [tests-unitaires.txt](../tests/resultats/tests-unitaires.txt) |
| Intégration | 101 (annonces 54, notifications 47) | 0 | [tests-integration.txt](../tests/resultats/tests-integration.txt) |
| Acceptation | 12 | 0 | [tests-acceptation.txt](../tests/resultats/tests-acceptation.txt) |

| Couverture des lignes | Valeur | Mesurée avec |
|---|---|---|
| Socle | 98 % | Ses tests unitaires |
| Service annonces | 98 % | Ses tests unitaires et d'intégration |
| Service notifications | 97 % | Ses tests unitaires et d'intégration |

Détail : [couverture.txt](../tests/resultats/couverture.txt). Le code de démarrage (`main.ts`, `migrer.ts`, `demarrage.ts`) est exclu de la mesure : il ne s'exécute que dans les conteneurs, pendant les tests d'acceptation.

| Mesure | Valeur | Source |
|---|---|---|
| Délai entre la publication et la notification visible (CA-11) | 44 à 79 ms sur six exécutions, sans charge | Tests d'acceptation |
| Arrêt du service notifications (signal `SIGTERM`) | 0,5 à 0,8 s | CA-15 |
| Relance du service notifications, migrations comprises | 2,3 à 3,2 s | CA-15 |
| Notification visible après la relance | 0,2 à 0,3 s | CA-15 |
| Mémoire d'un service au repos | 67 à 69 Mio | `docker stats` |
| Taille d'une image | 78 Mo, arm64 | `docker image inspect` |
| Environnement d'intégration prêt | 14 s | `demarrer.sh` |
| Environnement d'acceptation prêt | 2 min 51 s la première fois (téléchargement de Keycloak, construction des images), 30 s ensuite | `demarrer.sh acceptation` |

L'hypothèse H5 du backlog fixait une cible de 5 secondes : le délai mesuré est cent fois plus court, mais sans charge. La mesure sous charge est l'objet de l'étape 7.

Contrôle des tests eux-mêmes : un défaut a été introduit volontairement (l'auteur n'est plus exclu des destinataires), puis l'image reconstruite. Le test CA-13 a échoué, un échec sur douze. Le défaut a été retiré.

## 8. Points clés de l'architecture prouvés

| Point clé | Ce que l'étape 5 prouve | Reste à prouver |
|---|---|---|
| Découpage | Deux services, deux bases, deux comptes. Le compte du service annonces est refusé sur la base notifications (vérifié). Aucun import d'un service vers l'autre | — |
| Communication entre services | Événement publié sur l'exchange `annonces`, lu sur la file durable du service notifications (CA-06, CA-11). Publication réussie quand l'abonné est arrêté, message remis à son retour (CA-15). Traitement idempotent (CA-14). Message défectueux écarté vers la file des messages en échec | Plusieurs pods sur la même file (étape 7) |
| Sécurité | Jetons de Keycloak vérifiés dans chaque service, rôles, cloisonnement entre membres (CA-01, CA-02, CA-10, CA-18) | HTTPS, flux réseau entre pods (étape 7) |
| Hébergement, orchestration | Images prêtes pour Kubernetes : utilisateur non root désigné par son numéro, système de fichiers en lecture seule, arrêt propre en moins d'une seconde, route `/sante` | Déploiement, sondes, mise à l'échelle (étape 7) |

Circuit de l'événement tel qu'il est réalisé :

| Élément | Réalisation |
|---|---|
| Émission | Après l'enregistrement de l'annonce. Message persistant ; le service attend la confirmation du broker |
| Format | L'événement du contrat, seul. Le transport de NestJS enveloppe par défaut chaque message dans `{ pattern, data }` : un sérialiseur écrit le contrat tel quel, lisible par un abonné qui n'utilise pas NestJS |
| File | `notifications.annonce-publiee`, durable, liée à l'exchange par la clé `annonce.publiee` |
| Réception | L'événement est validé comme une entrée : type, version, identifiants, catégorie. Dix messages au plus sont en cours par pod |
| Accusé de réception | Manuel, envoyé après l'enregistrement des notifications |
| Idempotence | Contrainte d'unicité (membre, annonce) et insertion « sans effet en cas de doublon » |
| Échec | Message non conforme : refusé sans remise en file. Panne du traitement : une seconde remise, puis refus. Un message refusé part vers la file `notifications.annonce-publiee.echecs`, par une règle du broker |
| Comptes du broker | Un compte par service. Vérifié par l'exécution : le compte annonces est refusé (`ACCESS_REFUSED`) s'il lit la file ou crée une file ; le compte notifications est refusé s'il publie sur l'exchange ou lit la file des messages en échec |

## 9. Bonnes pratiques de sécurité

Le document d'architecture en prévoyait cinq (paragraphe 8.4). La grille en demande deux.

| # | Bonne pratique | État | Preuve |
|---|---|---|---|
| 1 | Authentification déléguée à Keycloak, autorisation par rôle vérifiée dans chaque service | Prouvée | 47 tests CA-01 et CA-02 ; CA-18 ; tests d'acceptation avec de vrais jetons |
| 2 | Validation des entrées par liste blanche : tout champ non prévu est refusé | Prouvée | 12 tests CA-05, 5 tests CA-08 ; l'événement reçu du broker est validé lui aussi |
| 3 | Aucun secret dans le code ni dans l'image | Constatée, sans outil | Mots de passe tirés au hasard dans un fichier `.env` ignoré par Git ; l'image ne déclare que `PATH`, `NODE_VERSION` et `NODE_ENV`. Le contrôle automatique (Gitleaks) arrive à l'étape 6 |
| 4 | Échanges externes chiffrés (HTTPS) | Non réalisée à cette étape | Étape 7 |
| 5 | Moindre privilège | Prouvée en partie | Vérifié dans les conteneurs : utilisateur 1000, système de fichiers en lecture seule, aucune capacité Linux, élévation de privilèges interdite. Un compte par service sur la base et sur le broker, chacun refusé hors de ses droits. Manifestes Kubernetes : étape 7 |

Mesures ajoutées en écrivant le code :

| Mesure | Preuve |
|---|---|
| Refus par défaut : une route qui ne déclare aucun rôle est fermée à tous | Test d'assemblage du socle : 403 avec un jeton valide |
| Seul l'algorithme RS256 est accepté : un jeton non signé ou signé par un secret partagé est refusé | Tests unitaires du vérificateur |
| Le destinataire du jeton est vérifié (fiche 0014) | Un test par route |
| Le motif d'un refus reste dans le journal du service, jamais dans la réponse | Tests unitaires de la garde |
| Une erreur inattendue donne « Erreur interne », sans requête SQL ni chemin de fichier | Tests du filtre d'erreurs (CA-03) |
| L'identité vient du jeton : aucune route ne lit un identifiant de membre dans la requête | CA-10 ; champ `auteurId` refusé (CA-05) |
| L'identifiant d'une annonce est validé avant toute requête à la base | Test CA-03 du retrait |
| Listes bornées par le service : 20 annonces par page, 100 notifications | CA-16 ; test de la borne |

## 10. Précisions et écarts par rapport à l'architecture

Le document d'architecture est validé : il n'est pas réécrit. Ce tableau dit ce que le code a précisé ou changé.

| Sujet | Architecture | Réalisé | Raison |
|---|---|---|---|
| Vérification du jeton | Signature, émetteur, expiration, rôle | La même, plus le destinataire | Fiche 0014 |
| Routes internes | Sondes « vivant » et « prêt », route `/metrics` | Une route `/sante` | Les sondes et les métriques sont l'objet de l'étape 7 |
| Code commun | « Même structure dans les deux services » | Un socle partagé | Fiche 0012 |
| Environnement des tests | Outil à fixer à l'étape 6 | Docker Compose, dès maintenant | Fiche 0013 |
| Message en échec | « Un message que le service a refusé » | Deux cas distingués : non conforme, ou panne répétée | Éviter qu'un message soit remis sans fin |
| Retrait d'une annonce déjà retirée | Non précisé | 204 ; la trace du premier retrait est conservée | Une suppression rejouée ne change rien |
| Liste des notifications | Non bornée | Les 100 plus récentes | Risque R8 |
| Espaces autour du titre et de la description | Non précisé | Retirés avant la validation : un titre fait d'espaces est refusé | Critère CA-05, « titre vide » |
| Migrations | « À jouer à chaque déploiement, avant le démarrage » | Un programme `migrer.js`, lancé avant le service | Fiche 0008 |

## 11. Difficultés rencontrées

Neuf difficultés réelles, toutes résolues.

| # | Symptôme | Cause | Solution |
|---|---|---|---|
| 1 | Jest refuse de charger NestJS : « Must use import to load ES Module » | NestJS 12 est publié en modules ES ; Jest charge les fichiers par `require` | Option `--experimental-vm-modules` de Node.js dans les scripts de test. Elle ne concerne que les tests : l'image ne l'utilise pas |
| 2 | TypeScript 7 ne peut pas être retenu | ts-jest et typescript-eslint ne l'acceptent pas encore | TypeScript 6.0.3. TypeScript 6 exige aussi un `rootDir` explicite (erreur TS5011) |
| 3 | Les tests d'intégration ne rendent pas la main ; arrêt forcé après 240 s | Deux causes. Jest donne à chaque fichier de tests sa copie des variables d'environnement : `process.loadEnvFile` ne la remplit pas. Et l'erreur survenait après le démarrage d'un serveur HTTP de test, resté ouvert | Lecture du fichier par `util.parseEnv` ; réglages lus avant de démarrer quoi que ce soit |
| 4 | Le message publié ne respecte pas le contrat | Le transport RabbitMQ de NestJS enveloppe le message dans `{ pattern, data }` (lu dans son code) | Sérialiseur et désérialiseur propres au contrat ; le test CA-06 compare le message à l'égalité stricte |
| 5 | Un test d'intégration échoue dans la suite complète et réussit seul | Non démontrée. Hypothèse : il attendait la fin du traitement en lisant les compteurs de l'API de gestion du broker, qui sont rafraîchis avec retard | Le test observe le cas d'usage réel et attend la fin de son traitement. Trois exécutions de suite réussies ; aucun échec de ce type depuis |
| 6 | Cinq tests d'intégration échouent après les tests d'acceptation | Les conteneurs des services, encore en marche, lisaient la même file : ils consommaient les événements à la place du service testé | Le script de démarrage arrête ces conteneurs en mode intégration ; le banc de test refuse de démarrer s'il détecte un consommateur sur la file, et dit quoi faire |
| 7 | Le défaut volontaire ne fait échouer aucun test | L'image n'avait pas été reconstruite, à cause d'une erreur dans la commande : elle contenait encore le bon code | Lecture du fichier dans le conteneur avant de conclure. Image reconstruite : CA-13 échoue comme attendu |
| 8 | Les sorties enregistrées ne listent aucun test | Jest réduit sa sortie à un résumé quand il détecte un agent de code (lu dans son code) | Option `--reporters=default` dans le script de preuves |
| 9 | La mise à niveau de Node.js touche un autre logiciel | Homebrew met aussi à niveau ce qui dépend de Node.js : jupyterlab est passé de 4.3.6 à 4.6.6 | Effet de bord consigné. Sur un poste d'équipe, un gestionnaire de versions par projet l'éviterait |

Les règles du bac à sable ont été appliquées d'emblée : utilisateur désigné par son numéro, traitement du signal d'arrêt, falsification de jeton vérifiée, comptes de test au profil complet, versions relevées avant d'être figées. Aucune des pannes du bac à sable ne s'est reproduite.

Les difficultés 6 et 7 ont la même leçon : un test qui réussit ne prouve rien si l'on n'a pas vérifié ce qu'il exécute.

## 12. Limites et ce qui n'a pas été exécuté

| Sujet | État | Quand |
|---|---|---|
| Broker arrêté au moment de publier | Observé à la main : la publication répond 201 en 0,16 s, le défaut est journalisé, l'événement est perdu. Aucune notification 20 secondes après la relance du broker. Les deux services se reconnectent seuls. C'est la limite prévue par l'architecture ; la cible est le motif « outbox » | Audit, étape 8 |
| Exécution sur Kubernetes | Non exécutée : les services tournent dans Docker Compose | Étape 7 |
| HTTPS | Non réalisé | Étape 7 |
| Pipeline, quality gate, relecture | Non réalisés : lint, typage et tests sont lancés à la main. Les points 3 et 4 de la définition de « fini » restent ouverts | Étape 6 |
| Analyses de sécurité automatiques (Semgrep, Gitleaks, Trivy) | Non exécutées | Étape 6 |
| Images pour amd64 | Non construites : arm64 seulement | Étape 6 |
| Keycloak en mode production | Dans l'environnement de test, Keycloak tourne en mode développement, sans HTTPS | Étape 7 |
| Garde face à Keycloak, cas de refus | Les jetons expirés ou falsifiés viennent de l'émetteur de test, pas de Keycloak. Avec Keycloak, seuls « sans jeton » et « mauvais rôle » sont testés | — |
| Vraie remise d'un message par le broker | CA-14 publie deux fois le même événement. La remise après une panne du consommateur a été prouvée au bac à sable, pas rejouée ici | Étape 7 |
| Plusieurs pods sur la même file | Non testé | Étape 7 |
| Panne de la base pendant le traitement d'un message | Couverte par un test unitaire seulement | — |
| Changement des clés de Keycloak | Non testé | Avant une mise en production |
| Délai de notification | Mesuré sans charge, sur le poste | Étape 7 |
| Option de Node.js nécessaire aux tests | `--experimental-vm-modules` est marquée expérimentale par Node.js | À retirer quand Jest s'en passera |

## 13. Reproduire

Prérequis : Node.js 26.13.1, Docker avec Docker Compose. Toutes les commandes se lancent depuis la racine du dépôt. Elles ont été exécutées avec succès le 13 novembre 2026.

| Action | Commande |
|---|---|
| Installer les dépendances | `npm ci` |
| Lint, puis vérification des types | `npm run lint`, `npm run typage` |
| Compiler | `npm run build` |
| Tests unitaires | `npm run test:unit` |
| Tests d'intégration | `npm run env:integration`, puis `npm run test:int` |
| Tests d'acceptation | `npm run env:acceptation`, puis `npm run test:acceptation` |
| Tout rejouer et enregistrer les preuves | `npm run preuves` |
| Arrêter l'environnement et détruire ses données | `npm run env:arret` |

`npm ci` installe exactement les versions du fichier de verrou. L'environnement d'acceptation occupe environ 920 Mio, dont 630 pour Keycloak : l'arrêter après usage.

## 14. Suite

L'étape 6 construit le pipeline décrit à l'étape 2 : il rejouera ces tests à chaque pull request, et y ajoutera les analyses de qualité et de sécurité.
