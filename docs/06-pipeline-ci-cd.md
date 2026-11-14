# Étape 6 — Pipeline CI/CD

- Date : 14 novembre 2026
- Statut : en attente de validation
- Référence : [processus de développement, paragraphe 4](02-processus-developpement.md#4-processus-cicd) et [schéma du pipeline](schemas/pipeline-ci-cd.md)
- Fichiers : [pipeline.yml](../.github/workflows/pipeline.yml), [scan-planifie.yml](../.github/workflows/scan-planifie.yml), [analyses.sh](../tests/securite/analyses.sh), [sonar-project.properties](../sonar-project.properties), [.trivyignore](../.trivyignore)
- Décisions prises à cette étape : fiches [0015](adr/0015-images-multi-architectures.md) et [0016](adr/0016-outils-du-pipeline-figes.md)
- Preuve : [pull request n° 1](https://github.com/laugy963/Projet-Indiv-assurer-superviser-dev-app/pull/1) et ses exécutions (paragraphe 5)

## 1. Objet

Ce document décrit le pipeline réalisé : ce qu'il exécute, ce qu'il a mesuré, ce qu'il a bloqué, et ce qui reste hors de cette étape. Chaque chiffre vient d'une exécution réelle du 14 novembre 2026, sur les exécuteurs de GitHub (exécuteur : machine jetable qui exécute un job).

Résultat : à la quatrième exécution, les 10 jobs du pipeline réussissent. Trois types de tests y sont joués, 243 tests en tout. Les trois premières exécutions ont échoué, chaque fois sur un défaut réel, corrigé dans la même pull request.

## 2. Ce qui est livré

| Élément | Emplacement | Contenu |
|---|---|---|
| Pipeline | `.github/workflows/pipeline.yml` | Les temps 1 à 3 du schéma : 10 jobs, à chaque pull request vers `main` et à chaque fusion dans `main` |
| Scan planifié | `.github/workflows/scan-planifie.yml` | Les contrôles de vulnérabilités rejoués chaque nuit sur `main` |
| Contrôles de sécurité | `tests/securite/analyses.sh` | Gitleaks, Semgrep, Trivy : un script, la même commande sur le poste et dans le pipeline |
| Réglages de l'analyse de qualité | `sonar-project.properties` | Projet SonarQube Cloud, périmètre, rapports de couverture, attente du quality gate |
| Risques acceptés | `.trivyignore` | Modèle d'entrée datée. Aucun risque accepté à ce jour |
| Images des services | `ghcr.io/laugy963/epouvante-annonces`, `ghcr.io/laugy963/epouvante-notifications` | Une image par service, pour arm64 et amd64, étiquetée par le SHA du commit |

Workflow : fichier qui décrit un pipeline GitHub Actions. Il est versionné avec le code.

Modifications du prototype rendues nécessaires par le pipeline :

| Fichier | Modification |
|---|---|
| `services/Dockerfile` | `npm` retiré de l'image livrée ; installation des dépendances sans scripts |
| Configurations Jest | Rapport de couverture aux chemins relatifs à la racine ; seuil de 80 % sur le socle |
| `tests/environnement/` | L'environnement d'acceptation accepte des images tirées d'un registre |
| `package.json` | `npm run lint` échoue au premier avertissement |

## 3. Le pipeline réalisé

### 3.1 Déclencheurs

| Déclencheur | Workflow | Ce qui s'exécute |
|---|---|---|
| Pull request vers `main` | `pipeline` | Temps 1 à 3 |
| Fusion dans `main` | `pipeline` | Temps 1 à 3 ; le temps 4 arrive à l'étape 7 |
| Chaque nuit, à 3 h 23 UTC | `scan-planifie` | Vulnérabilités des dépendances et des images |
| Lancement manuel | `scan-planifie` | Le même, pour le vérifier sans attendre la nuit |

Un nouveau commit sur une pull request annule l'exécution en cours : seul le dernier état compte.

### 3.2 Jobs

Durées de l'exécution n° 43589500284, la première entièrement réussie.

| Temps | Job | Outil, version | Ce qu'il fait | Bloquant | Artefact | Indicateur | Durée |
|---|---|---|---|---|---|---|---|
| 1 | `lint` | ESLint 10.14.0 et son extension de sécurité ; TypeScript 6.0.3 | Conventions, motifs dangereux, types | Oui, dès le premier avertissement | — | I3 | 22 s |
| 1 | `tests-unitaires` | Jest 30.5.2 | 130 tests ; couverture | Oui : un test en échec, ou couverture du socle < 80 % | Rapports de tests, couverture | I3 | 28 s |
| 1 | `tests-integration` | Jest, Supertest ; PostgreSQL 18.7 et RabbitMQ 4.4.0 en conteneurs | 101 tests : chaque service avec ses vraies dépendances | Oui | Rapports de tests, couverture | I1, I3, I4 | 54 s |
| 1 | `secrets` | Gitleaks 8.30.1 | Secret commité, dans tout l'historique (36 commits) | Oui | Rapport | — | 8 s |
| 1 | `sast` | Semgrep 1.185.0 | Motifs de code dangereux : 266 règles, 186 fichiers | Oui, depuis le 14 novembre | Rapport | — | 24 s |
| 1 | `dependances` | Trivy 0.76.2, mode fichiers | Vulnérabilités des dépendances, développement compris | Oui : haute ou critique, avec correctif | Rapport complet | — | 24 s |
| 1 | `qualite` | SonarQube Cloud | Analyse et quality gate, avec la couverture des deux niveaux de tests | Oui | Tableau de bord en ligne | I3, I4 | 1 min 38 s |
| 2 | `build-image` | Docker Buildx, QEMU | Une image par service, arm64 et amd64, poussée dans ghcr.io | Oui | Images | — | 6 min 28 s |
| 2 | `scan-image` | Trivy 0.76.2, mode image | Tout le contenu des 4 variantes | Oui : haute ou critique, avec correctif | Rapports complets | — | 33 s |
| 3 | `acceptation` | Jest, Supertest ; Keycloak 26.8.2 | 12 tests sur l'image construite ; calcul de I1 | Oui : un test en échec, ou I1 < 100 % | Rapport de tests | I1 | 1 min 56 s |

Durée totale : 11 min 44 s. Les six premiers contrôles rendent leur verdict en moins d'une minute ; le temps 1 est complet après 2 min 38 s.

### 3.3 Enchaînement

| Règle | Réalisation |
|---|---|
| Les contrôles du code source démarrent ensemble | Six jobs sans dépendance ; `qualite` attend les deux jobs de tests, dont il reçoit la couverture |
| L'image n'est construite que si le temps 1 est vert | `build-image` dépend des sept jobs du temps 1 |
| Construire une fois | `build-image` publie l'empreinte de chaque image. `scan-image` et `acceptation` désignent l'image par cette empreinte : ils ne peuvent pas en utiliser une autre |
| Un job bloquant en échec arrête la chaîne | Constaté trois fois (paragraphe 5) : les jobs suivants sont sautés |

Empreinte : résultat d'un calcul sur le contenu. Deux images différentes n'ont pas la même empreinte.

## 4. Les tests du pipeline et les indicateurs

La grille demande au moins deux types de tests qui alimentent les indicateurs. Le pipeline en joue trois.

| Type de test | Job | Tests réussis | En échec | Ce qu'il transmet |
|---|---|---|---|---|
| Unitaire | `tests-unitaires` | 130 | 0 | Couverture, vers SonarQube Cloud |
| Intégration (test d'appel) | `tests-integration` | 101 | 0 | Couverture, vers SonarQube Cloud ; rapport par critère, vers le calcul de I1 |
| Acceptation | `acceptation` | 12 | 0 | Rapport par critère, vers le calcul de I1 |

| Indicateur | Mesure du pipeline | Valeur | Seuil | Verdict |
|---|---|---|---|---|
| I1, adéquation fonctionnelle | Critères d'acceptation prouvés par au moins un test réussi | 19 sur 19, soit 100 % | 100 % | Tenu |
| I3, maintenabilité | Ratio de dette technique du nouveau code | 0,0 % (note A) | ≤ 5 % | Tenu |
| I3, quality gate | Couverture du nouveau code | 92,5 % | ≥ 80 % | Tenu |
| I3, quality gate | Duplication du nouveau code | 0,7 % | ≤ 3 % | Tenu |
| I4, fiabilité, en amont | Note de fiabilité du nouveau code | A : aucun bug détecté | A | Tenu, après correction de 3 constats |
| I2 et I4 sous charge | Test de charge | Non mesuré | — | Étape 7 |

Précisions :

- I1 est calculé par `tests/indicateur-i1.mjs`, à partir des rapports des tests d'intégration et d'acceptation. Le tableau par critère est écrit dans le résumé de l'exécution, lisible sans ouvrir les journaux. En dessous de 100 %, le job échoue.
- Le nouveau code de la pull request, c'est tout le prototype : 5 573 lignes, que SonarQube Cloud a jugées en une fois.
- 92,5 % est la mesure de SonarQube Cloud, qui réunit les lignes et les branches : 98,8 % des 503 lignes à couvrir, 81,1 % des 275 branches.
- Mesures relevées pendant les tests d'acceptation du pipeline : notification visible 60 ms après la publication (CA-11) ; service notifications arrêté en 0,3 s et relancé en 2,8 s (CA-15).

## 5. Exécutions de référence

| # | Exécution | Commit | Durée | Verdict | Ce qu'elle montre |
|---|---|---|---|---|---|
| 1 | [43586378391](https://github.com/laugy963/Projet-Indiv-assurer-superviser-dev-app/actions/runs/43586378391) | `f826554` | 2 min 11 s | Échec de `qualite` | Six jobs réussis du premier coup. Le projet SonarQube Cloud n'existait pas encore : « Not authorized or organization not found ». La suite est sautée |
| 2 | [43587673488](https://github.com/laugy963/Projet-Indiv-assurer-superviser-dev-app/actions/runs/43587673488) | `bc77520` | 2 min 26 s | Échec de `qualite` | Le quality gate échoue sur trois conditions : couverture 53,3 %, note de fiabilité D, note de sécurité C. 18 constats |
| 3 | [43588700036](https://github.com/laugy963/Projet-Indiv-assurer-superviser-dev-app/actions/runs/43588700036) | `fd2d7c2` | 8 min 33 s | Échec de `scan-image` | Quality gate réussi. Images construites. Trivy bloque les 4 variantes : 6 vulnérabilités hautes chacune. `acceptation` est sauté : l'image vulnérable ne va pas plus loin |
| 4 | [43589500284](https://github.com/laugy963/Projet-Indiv-assurer-superviser-dev-app/actions/runs/43589500284) | `aeb05f1` | 11 min 44 s | Réussite | Les 10 jobs réussis, I1 = 100 % |

Sur la pull request, 11 contrôles sont verts : les 10 jobs, et le contrôle que SonarQube Cloud pose lui-même.

Conservation : GitHub garde les journaux et les artefacts 90 jours, soit jusqu'au 12 février 2027 pour ces exécutions. Des captures d'écran sont à faire avant cette date ; le pipeline produira de nouvelles exécutions à chaque étape suivante.

## 6. Ce que les contrôles ont trouvé

Tous ces constats sont réels. Aucun n'a été provoqué, sauf le dernier, qui est un contrôle des contrôles.

| Contrôle | Constat | Correction | Commit |
|---|---|---|---|
| `qualite` | Couverture du nouveau code : 53,3 %. Le code de test des paquets était compté comme du code à couvrir (paragraphe 10, difficulté 3) | Code de test et configuration retirés du calcul de couverture ; ils restent analysés | `527e4f0` |
| `qualite` | Note de sécurité C : 8 constats. `npm ci` laissait un paquet exécuter un script à son installation, dans le pipeline et dans l'image ; `npx` pouvait télécharger un paquet absent | `npm ci --ignore-scripts` ; `npx --no-install` | `3f5d045` |
| `qualite` | Note de fiabilité D : 3 tris sans fonction de comparaison. Un identifiant d'émetteur de test en `http` | Comparateur explicite ; identifiant en `https` | `d9d4fc2` |
| `qualite` | 6 remarques de style dans les scripts bash, sans effet sur le quality gate | Corrigées quand même : on nettoie le code que l'on touche | `fd2d7c2` |
| `scan-image` | 6 vulnérabilités hautes corrigeables, dans `undici` et `brace-expansion`. Ces bibliothèques appartiennent au `npm` embarqué par l'image de base, pas au projet : `dependances` ne pouvait pas les voir | `npm` et `npx` retirés de l'image livrée. Il reste 1 vulnérabilité moyenne, contre 20 de toutes gravités | `3a480ad` |
| Défaut volontaire | Un `eval()` et une commande système construite avec une donnée de la requête, ajoutés le temps d'un essai. Semgrep voit le premier, pas la seconde. ESLint voit les deux, mais par un avertissement : le job `lint` restait vert | `eslint --max-warnings 0` : un avertissement fait échouer le job. Défaut retiré | `aeb05f1` |

Trois leçons, à défendre devant le jury :

1. Défense en profondeur. Le scan de l'image a trouvé ce que le scan des dépendances ne pouvait pas voir. ESLint a vu ce que Semgrep a manqué. Aucun outil ne suffit seul.
2. Un contrôle qui signale sans échouer ne protège rien. Le défaut volontaire l'a montré pour le lint.
3. Un pipeline vert ne prouve pas l'absence de faille. Semgrep, avec 266 règles, n'a pas vu une injection de commande écrite exprès. La relecture humaine reste nécessaire.

## 7. Conformité au schéma de l'étape 2

Le processus de développement est validé : il n'est pas réécrit. Ce tableau dit ce que la réalisation a précisé ou changé.

| Sujet | Étape 2 | Réalisé | Raison |
|---|---|---|---|
| Temps 4 : `deploiement`, `verification` | Sur `main`, après validation humaine | Non réalisé | Le cluster de démonstration et les manifestes sont l'objet de l'étape 7. La grille ne pénalise pas l'absence du déploiement |
| `test-de-charge` | Lancement manuel | Non réalisé | Le scénario k6 est l'objet de l'étape 7 |
| Seuil de couverture de 80 % | Sur le job `tests-unitaires` | Sur le socle par Jest ; sur l'ensemble par le quality gate | Mesurés seuls, les tests unitaires couvrent 36 % et 48 % des services : leurs adaptateurs sont prouvés par les tests d'intégration, avec une vraie base et un vrai broker (fiche 0013) |
| Entrées de `qualite` | La couverture de `tests-unitaires` | La couverture des deux niveaux de tests | Même raison |
| `sast` | « Informe d'abord, bloquant ensuite » | Trois exécutions en mode « informer », sans constat ; bloquant à la quatrième | Le cliquet est appliqué, pas seulement annoncé |
| `lint` | ESLint | ESLint, échec au premier avertissement | Défaut volontaire (paragraphe 6) |
| Environnement éphémère | Outil « fixé à l'étape 6 » | Docker Compose, le même fichier que sur le poste | Fiche 0013 |
| Images pour deux architectures | Docker Buildx | Émulation QEMU, un seul job | Fiche 0015 |
| Versions des outils figées | Règle du paragraphe 4.6 | Actions et analyseurs désignés par leur empreinte | Fiche 0016 |
| Analyseurs de sécurité | Un outil par job | Un script commun au poste et au pipeline | Fiche 0016 |
| Installation des dépendances | `npm ci` | `npm ci --ignore-scripts` | Constat de SonarQube Cloud |
| Périmètre de SonarQube Cloud | Non précisé | Tout le dépôt, sauf le bac à sable | Paragraphe 10, difficulté 3 |

Tout le reste du schéma est réalisé tel quel : les deux déclencheurs du pipeline, les contrôles en parallèle, la politique de Trivy (« haute ou critique, avec correctif »), l'étiquette par SHA, le registre ghcr.io, les rapports conservés même en cas d'échec.

## 8. Sécurité du pipeline lui-même

| Mesure | Réalisation |
|---|---|
| Moindre privilège | Le jeton du pipeline ne peut que lire le dépôt. `build-image` reçoit le droit d'écrire dans le registre, pour lui seul ; `scan-image` et `acceptation`, celui d'y lire |
| Code tiers figé | 9 actions désignées par l'empreinte de leur commit ; 3 analyseurs désignés par l'empreinte de leur image (fiche 0016) |
| Secrets | Un seul secret à gérer : le jeton de SonarQube Cloud, dans les secrets chiffrés du dépôt. Le jeton du registre est créé par GitHub pour chaque job et meurt avec lui. Les mots de passe de l'environnement de test sont tirés au hasard à chaque exécution |
| Journaux publics | Gitleaks masque tout secret trouvé (`--redact`) : il n'est pas recopié dans le journal du pipeline, lisible par tous |
| Scripts d'installation | `npm ci --ignore-scripts` : une dépendance compromise ne peut pas exécuter de code à son installation |
| Données extérieures | Aucun titre de pull request ni nom de branche n'est recopié dans une commande |
| Validation avant de pousser | Les workflows passent par actionlint (outil qui vérifie la syntaxe des workflows) et par les règles « GitHub Actions » de Semgrep |

## 9. Reproduire

Depuis la racine du dépôt. Commandes exécutées avec succès le 14 novembre 2026.

| Action | Commande |
|---|---|
| Les contrôles de sécurité du pipeline, sur le poste | `tests/securite/analyses.sh secrets`, puis `sast`, `dependances`, `image <image>` |
| Valider les workflows avant de pousser | `docker run --rm -v "$PWD":/repo:ro -w /repo rhysd/actionlint:1.7.12` |
| Suivre une exécution | `gh run list`, puis `gh run watch <numéro> --exit-status` |
| Lire le journal du job en échec | `gh run view <numéro> --log-failed` |
| Voir les contrôles d'une pull request | `gh pr checks <numéro>` |
| Lire le verdict du quality gate | Tableau de bord de SonarQube Cloud, ou son API : `api/qualitygates/project_status` |
| Tester sur le poste les images du pipeline | `IMAGE_ANNONCES=… IMAGE_NOTIFICATIONS=… npm run env:acceptation`, puis `npm run test:acceptation` |

Monter la version d'un outil :

| Outil | Marche à suivre |
|---|---|
| Action GitHub | Lire les notes de version. Relever l'empreinte : `git ls-remote https://github.com/<dépôt> refs/tags/<version>`. Remplacer l'empreinte et le commentaire dans les workflows |
| Analyseur | Relever l'empreinte : `docker buildx imagetools inspect <image>:<version>`. Remplacer l'étiquette et l'empreinte dans `tests/securite/analyses.sh` |
| Dans les deux cas | Une pull request par outil : le pipeline dit si la nouvelle version change un verdict |

## 10. Difficultés rencontrées

Sept difficultés réelles. Six sont résolues ; la septième ne s'est pas reproduite.

| # | Symptôme | Cause | Solution |
|---|---|---|---|
| 1 | Sur le poste, la commande des tests échoue alors que tous les tests réussissent | Jest n'écrit pas son rapport JSON si le dossier de destination n'existe pas (`ENOENT`) | `mkdir -p reports` avant les tests. Trouvé avant le premier push, en rejouant les commandes du pipeline sur le poste |
| 2 | Les tests unitaires seuls couvrent 36 % et 48 % des services | Voulu : les adaptateurs et les contrôleurs sont testés avec leurs vraies dépendances | Le seuil de 80 % porte sur la couverture des deux niveaux réunis, dans le quality gate |
| 3 | Quality gate en échec : couverture de 53,3 %, pour 97 % attendus | Dans cette organisation, créée le jour même, le scanner avertit que `sonar.sources`, `sonar.tests` et `sonar.test.inclusions` « n'ont plus d'effet » : tout le dépôt est analysé, et seul le dossier `tests/` de la racine est reconnu comme code de test. La documentation officielle, relue le 14 novembre, décrit encore ces réglages comme actifs | Lecture du journal du scanner, puis des mesures par fichier dans l'API : 571 des 578 lignes non couvertes étaient du code de test. Réglages sans effet retirés ; `sonar.coverage.exclusions` pour le code de test |
| 4 | Quality gate en échec : notes de sécurité C et de fiabilité D | 12 constats réels (paragraphe 6) | Corrigés dans la même pull request |
| 5 | `scan-image` bloque les 4 variantes | L'image de base `node:26.13.1-alpine` embarque `npm`, dont deux bibliothèques sont vulnérables | `npm` retiré de l'image livrée : le service ne s'en sert pas |
| 6 | Le défaut volontaire laisse le job `lint` vert | ESLint classe les règles de son extension de sécurité en avertissements : code de sortie 0 | `--max-warnings 0` |
| 7 | Sur le poste, RabbitMQ s'arrête au démarrage (code 1), une fois | Non établie : le script d'arrêt avait déjà détruit le conteneur et ses journaux | Relance : démarrage normal. À surveiller ; le pipeline n'a pas connu ce cas en quatre exécutions |

Les difficultés 3 et 6 ont la même leçon que celles de l'étape 5 : un contrôle ne prouve rien tant que l'on n'a pas vérifié ce qu'il mesure.

## 11. Limites et ce qui n'a pas été exécuté

| Sujet | État | Quand |
|---|---|---|
| Déploiement, vérification après déploiement, validation humaine | Non réalisés | Étape 7 |
| Test de charge, indicateur I2 | Non réalisés | Étape 7 |
| Exécution sur `main`, scan planifié, protection de `main` | Après la fusion de la pull request n° 1 (paragraphe 12) | Fin de l'étape 6 |
| Variante arm64 des images | Construite et scannée par le pipeline, mais pas exécutée par lui : ses tests d'acceptation tournent sur amd64. Exécutée sur le poste le 14 novembre : images tirées de ghcr.io, architecture arm64 constatée dans le conteneur, 12 tests d'acceptation réussis | Cluster : étape 7 |
| Images tierces de l'environnement | Non scannées par le pipeline. Relevé du 14 novembre sur le poste : `postgres:18.7-alpine`, 1 vulnérabilité critique et 25 hautes, toutes dans son utilitaire de démarrage `gosu` ; Keycloak 26.8.2, 1 haute ; RabbitMQ 4.4.0, aucune haute ni critique | Étapes 7 et 8 |
| Dépendances de développement | Trivy : 4 vulnérabilités moyennes, sous le seuil bloquant. `npm audit` en compte 28 (4 faibles, 24 modérées) : il compte chaque paquet qui dépend d'un paquet vulnérable. Aucune en production | Audit, étape 8 |
| Règles de Semgrep | Jeux de règles publics. Ils n'ont pas vu l'injection de commande du défaut volontaire | Règle propre au projet : audit, étape 8 |
| Quality gate | Celui de l'offre gratuite, non modifiable. Le périmètre de l'analyse repose sur un comportement que la documentation ne décrit pas | À revérifier à chaque évolution de SonarQube Cloud |
| Jeton de SonarQube Cloud | Jeton personnel : l'offre gratuite n'a pas de jeton limité à un projet. Il expire : à sa date, `qualite` échouera | À renouveler avant l'échéance |
| Pull request venue d'une copie du dépôt (fork) | GitHub ne lui donne ni secret ni droit d'écriture : `qualite` et `build-image` échoueraient | Sans objet tant que l'équipe travaille dans le dépôt (fiche 0006) |
| Images des pull requests | Poussées dans ghcr.io comme celles de `main` : elles s'accumulent. Les images sont publiques, comme le dépôt | Règle de nettoyage : hors prototype |
| Image de base, images de l'environnement | Désignées par une étiquette de version exacte, pas par une empreinte | Audit, étape 8 |
| Mise à jour des empreintes | Manuelle (paragraphe 9) | Dependabot : cible |
| Durée | 11 min 44 s, dont 6 min 28 s de construction par émulation | Fiche 0015 : exécuteurs natifs si la durée gêne |
| Journaux et artefacts | Conservés 90 jours par GitHub | Captures d'écran avant le 12 février 2027 |

## 12. Après la fusion

Ces trois points ne peuvent être exécutés qu'une fois le pipeline présent dans `main`. Ils sont complétés par une seconde pull request.

| Point | Pourquoi après la fusion | État |
|---|---|---|
| Exécution du pipeline sur `main` | Elle est déclenchée par la fusion elle-même | À faire |
| Exécution du scan planifié | GitHub ne lance un workflow planifié ou manuel que s'il est dans la branche par défaut | À faire |
| Protection de `main` | Les contrôles à exiger doivent d'abord exister dans `main` (fiche 0006) | À faire |

## 13. Suite

L'étape 7 déploie les images produites par ce pipeline sur Kubernetes. Elle ajoute au pipeline le temps 4 (déploiement après validation humaine, puis vérification) et le test de charge, qui mesurera I2 et I4.
