# Étape 2 — Processus de développement

- Date : 12 novembre 2026
- Statut : validé le 12 novembre 2026
- Complété par : [compétences et formation](02-competences-et-formation.md), [schéma du cycle DevSecOps](schemas/cycle-devsecops.md), [schéma du pipeline CI/CD](schemas/pipeline-ci-cd.md)

## 1. Objet

Ce document fixe la façon dont l'équipe produit et livre le logiciel. Il répond à quatre demandes de la phase 1 :

1. quatre indicateurs de qualité, et leur effet sur la dette technique ;
2. le cycle de vie DevSecOps, avec les mesures de sécurité de chaque étape ;
3. le processus CI/CD détaillé ;
4. la stratégie de tests.

La cinquième demande, les compétences et la formation, a son propre document.

Le pipeline est décrit ici, il est construit à l'étape 6. Les seuils chiffrés sont des cibles de départ : aucune mesure n'a encore été faite.

## 2. Indicateurs de qualité

Les quatre indicateurs suivent quatre caractéristiques de la norme ISO 25010 (norme qui classe les qualités attendues d'un logiciel).

### 2.1 Définition et mesure

| # | Caractéristique | Indicateur | Définition | Mesure |
|---|---|---|---|---|
| I1 | Adéquation fonctionnelle : le logiciel fait ce qui est demandé | Taux de critères d'acceptation prouvés | Part des critères d'acceptation du backlog vérifiés par au moins un test automatisé réussi | Critères prouvés ÷ critères du backlog, en % |
| I2 | Efficacité de la performance : le logiciel répond vite | Temps de réponse au 95e centile (p95) | Durée sous laquelle passent 95 % des requêtes de publication d'une annonce, à la charge nominale | p95 de la durée des requêtes HTTP pendant le test de charge, en millisecondes |
| I3 | Maintenabilité : le logiciel se modifie facilement | Ratio de dette technique | Temps estimé pour corriger les défauts de maintenabilité, rapporté au temps estimé pour écrire le code | Dette ÷ (coût d'une ligne × nombre de lignes), en % ; l'outil compte 30 minutes par ligne |
| I4 | Fiabilité : le logiciel fonctionne sans défaillance | Taux de requêtes réussies | Part des requêtes qui reçoivent une réponse correcte : ni erreur du serveur (code HTTP 5xx), ni absence de réponse | Requêtes réussies ÷ requêtes totales, en % |

Précisions :

- Critère d'acceptation : condition vérifiable qu'une fonctionnalité doit remplir pour être déclarée finie. Chaque test d'acceptation porte l'identifiant du critère qu'il prouve (exemple : `CA-03`). Un critère sans test compte comme non prouvé.
- p95 plutôt que moyenne : une moyenne cache les requêtes lentes. Le p95 dit ce que vivent les utilisateurs les moins bien servis.
- Charge nominale : nombre d'utilisateurs simultanés attendu en usage normal. Elle est chiffrée à l'étape 7, avec le scénario de test.

### 2.2 Outil, seuil et action

| # | Outil | Seuil | Moment de la mesure | Action si le seuil n'est pas tenu |
|---|---|---|---|---|
| I1 | Jest + Supertest ; rapport de tests du pipeline | 100 % | À chaque pull request, puis après chaque déploiement | La fusion est bloquée. Corriger le code. Si le besoin a changé, corriger d'abord le critère avec la maîtrise d'ouvrage |
| I2 | k6 | p95 < 500 ms | Avant chaque livraison, sur l'environnement de démonstration | Pas de livraison. Chercher la cause (requête à la base, ressources du pod, réglage de la mise à l'échelle), corriger, rejouer le test |
| I3 | SonarQube Cloud | ≤ 5 % sur le nouveau code (note A) | À chaque pull request et sur `main` | La fusion est bloquée. Corriger dans la même pull request |
| I4 | k6 ; en amont, note de fiabilité de SonarQube Cloud | ≥ 99 % sous charge ; note A (aucun bug détecté) sur le nouveau code | Avant chaque livraison ; à chaque pull request pour la note | Pas de livraison. Lire les journaux, vérifier les sondes et les limites de ressources. En exploitation : redéployer l'image précédente |

Définitions :

- Jest : outil de test de l'écosystème JavaScript. Supertest : bibliothèque qui envoie de vraies requêtes HTTP à un service et vérifie la réponse.
- k6 : outil de test de charge. Il simule des utilisateurs simultanés et fait échouer le test si un seuil est dépassé.
- SonarQube Cloud : service d'analyse statique (il lit le code sans l'exécuter). Son quality gate (ensemble de seuils qui fait échouer l'analyse) porte sur le nouveau code.
- Pull request : demande de fusion d'une branche dans `main`, contrôlée par le pipeline et relue avant d'être acceptée.

Le quality gate intégré de SonarQube Cloud, nommé « Sonar way », impose six conditions au nouveau code (documentation officielle consultée le 12 novembre 2026) : notes A en fiabilité, en sécurité et en maintenabilité, 100 % des points sensibles de sécurité relus, couverture de tests ≥ 80 %, duplication ≤ 3 %. L'offre gratuite ne permet pas de le modifier (fiche 0004) : je l'adopte tel quel.

Les seuils de I2 et I4 sont des cibles de départ. Ils seront recalés après la première mesure réelle, à l'étape 7. En exploitation, I2 et I4 se lisent aussi en continu dans l'outil d'observabilité, choisi à l'étape 3.

### 2.3 Effet sur la dette technique

Dette technique : travail de correction que l'on reporte en choisissant une solution rapide. Comme un emprunt, elle coûte des intérêts : chaque évolution devient plus lente et plus risquée.

| # | Dette que l'indicateur révèle | Pourquoi son suivi empêche la dette de s'accumuler |
|---|---|---|
| I1 | Fonctionnalités « presque finies », régressions passées inaperçues | Un critère sans test vert bloque la fusion : rien n'est déclaré fini sans preuve. Une régression est vue le jour même, quand elle coûte le moins à corriger |
| I2 | Requêtes non optimisées, index manquants, traitements synchrones qui devraient passer par le broker | La mesure répétée donne une ligne de base. Une dérive est rattachée à la livraison qui l'a introduite, au lieu d'être découverte en production |
| I3 | Code dupliqué, complexe ou non testé | C'est la mesure directe de la dette. Le seuil porte sur le nouveau code : la dette ne peut plus augmenter, et le stock ancien baisse à chaque fichier retouché |
| I4 | Erreurs non gérées, délais d'attente absents, sondes manquantes, pas de reprise après une panne | Chaque baisse du taux désigne un défaut de robustesse, à corriger avant la livraison suivante |

Ces quatre lectures donnent les axes de réduction de la dette : compléter les tests manquants (I1), optimiser ce qui dérive (I2), nettoyer le code que l'on touche (I3), durcir ce qui casse sous charge (I4).

## 3. Cycle de vie DevSecOps

Schéma : [cycle de vie DevSecOps](schemas/cycle-devsecops.md).

### 3.1 Principes

| Principe | Application au projet |
|---|---|
| Shift-left : placer chaque contrôle le plus tôt possible | Les contrôles qui ne lisent que le code démarrent dès la pull request. Un défaut coûte plus cher à chaque étape qu'il franchit |
| Défense en profondeur : empiler des contrôles différents | Aucun outil ne voit tout. L'analyse du code, celle des dépendances et celle de l'image regardent trois choses différentes |
| Moindre privilège | Chaque jeton, chaque conteneur, chaque compte n'a que les droits nécessaires |
| Cliquet : informer, corriger, puis bloquer | Un nouveau contrôle entre en mode « informer », avec une date de passage en mode « bloquer ». Il ne revient jamais en arrière |
| Revue humaine | Un pipeline vert ne prouve pas l'absence de faille. Chaque pull request est relue |

Le lead developer tient le rôle de Security Champion : le référent sécurité de l'équipe, qui porte les décisions de risque.

### 3.2 Mesures de sécurité par étape

« Prototype » : mesure réalisée dans ce projet. « Cible » : mesure prévue pour la plateforme, non réalisée dans le prototype.

| Étape | Mesures de sécurité | Outil ou pratique | Périmètre |
|---|---|---|---|
| 1. Planifier | Exigences de sécurité écrites comme critères d'acceptation (exemple : « un visiteur non authentifié ne peut pas publier ») ; analyse de risques ; modélisation des menaces sur le schéma d'architecture | Backlog ; OWASP Top Ten (liste des dix familles de failles web les plus courantes) comme liste de contrôle | Prototype, à l'étape 3 |
| 2. Coder | Règles de codage sûr : valider en entrée, échapper en sortie, aucun secret dans le code ; lint de sécurité ; revue par pull request | ESLint et son extension de sécurité ; `.gitignore` ; branche `main` protégée | Prototype |
| 2. Coder | Détection de secrets avant même le commit | Gitleaks en hook de pré-commit | Cible |
| 3. Construire | SAST (analyse statique du code) ; SCA (analyse des dépendances) ; détection de secrets dans tout l'historique ; image de base minimale, utilisateur non root ; versions figées | Semgrep, SonarQube Cloud ; Trivy ; Gitleaks ; Dockerfile durci ; `package-lock.json` | Prototype |
| 4. Tester | Tests automatisés des contrôles d'accès : refus sans jeton (401), refus sans le bon rôle (403) ; scan de l'image | Jest + Supertest ; Trivy | Prototype |
| 4. Tester | DAST (test de l'application en marche, vue de l'extérieur) | OWASP ZAP | Cible |
| 5. Livrer | Image étiquetée par le SHA du commit, jamais `latest` ; jeton du registre valable le temps d'un job ; validation humaine avant le déploiement | ghcr.io ; environnement GitHub protégé | Prototype |
| 5. Livrer | Inventaire des composants (SBOM) ; signature de l'image | Trivy ; cosign | Cible |
| 6. Déployer | Secrets hors du dépôt ; HTTPS ; flux réseau limités entre pods ; conteneurs non root aux ressources limitées | Objets Secret ; Ingress et cert-manager ; NetworkPolicy | Prototype, à l'étape 7 |
| 7. Exploiter | Authentification et autorisation par rôle ; scan planifié chaque nuit, pour voir les nouvelles vulnérabilités même sans changement de code | Serveur d'authentification, choisi à l'étape 3 ; pipeline planifié | Prototype |
| 7. Exploiter | Mise à jour automatique des dépendances | Dependabot | Cible |
| 8. Surveiller | Métriques des services ; revue des risques acceptés à leur date d'expiration ; retour des constats dans le backlog | Outil d'observabilité, choisi à l'étape 3 | Prototype |
| 8. Surveiller | Journaux centralisés ; alertes sur le taux d'erreur et les refus d'accès anormaux | Outil d'observabilité | Cible |

### 3.3 Traiter une alerte

| Situation | Réponse |
|---|---|
| Un correctif existe | On corrige, puis on vérifie le correctif |
| Pas de correctif, ou faille non exploitable chez nous | On accepte le risque par écrit : qui, pourquoi, jusqu'à quand. La décision est dans un fichier versionné (`.trivyignore`), avec une date d'expiration |
| Jamais | Supprimer le contrôle, le repasser en mode « informer », ignorer l'alerte sans trace |

## 4. Processus CI/CD

Schéma : [pipeline CI/CD](schemas/pipeline-ci-cd.md). Plateforme : GitHub Actions (fiche 0004).

### 4.1 Flux de branches

Le projet suit le GitHub flow (fiche 0006) : une branche courte par changement, une pull request vers `main`, la fusion après des contrôles verts et une relecture.

| Règle | État |
|---|---|
| `main` protégée : pas de push direct, contrôles du pipeline requis | À activer à l'étape 6, quand les contrôles existeront. D'ici là, les fusions sont faites à la main |
| Relecture par un pair avant la fusion | S'applique à l'équipe. Seul sur le prototype, je ne peux pas approuver mes propres pull requests |

### 4.2 Déclencheurs

| Déclencheur | Événement GitHub Actions | Ce qui s'exécute | But |
|---|---|---|---|
| Pull request vers `main` | `pull_request` | Temps 1 à 3 du schéma | Retour rapide avant la fusion. Rien n'est déployé |
| Fusion dans `main` | `push` | Temps 1 à 4 | Livrer l'image validée, puis la déployer |
| Chaque nuit | `schedule` | `scan-planifie` | Voir les nouvelles vulnérabilités même si personne ne pousse de code |
| Lancement manuel | `workflow_dispatch` | `test-de-charge` | Mesurer I2 et I4 avant une livraison ou une démonstration |

### 4.3 Jobs

Job : tâche du pipeline, exécutée sur une machine jetable fournie par GitHub. Artefact : fichier produit par un job et conservé.

| Job | Outil | Ce qu'il vérifie ou produit | Bloquant | Artefact | Indicateur |
|---|---|---|---|---|---|
| `lint` | ESLint, compilateur TypeScript | Conventions, erreurs de typage, motifs dangereux simples | Oui | — | I3 |
| `tests-unitaires` | Jest | Règles métier isolées ; couverture | Oui : un test en échec, ou couverture < 80 % | Rapports de tests et de couverture | I3 |
| `tests-integration` | Jest + Supertest, base de données et broker lancés en conteneurs | Un service avec ses vraies dépendances : routes, codes HTTP, contrôles d'accès | Oui | Rapport de tests | I1, I4 |
| `secrets` | Gitleaks | Secret commité, dans tout l'historique | Oui | Rapport | — |
| `sast` | Semgrep | Motifs de code dangereux | Informe d'abord, bloquant ensuite | Rapport | — |
| `dependances` | Trivy, mode fichiers | Vulnérabilités connues des dépendances | Oui : gravité haute ou critique, avec correctif disponible | Rapport | — |
| `qualite` | SonarQube Cloud | Dette, duplication, bugs, couverture du nouveau code | Oui : quality gate | Tableau de bord en ligne | I3, I4 |
| `build-image` | Docker Buildx | Une image par service, pour arm64 et amd64, étiquetée par le SHA du commit | Oui | Image dans ghcr.io | — |
| `scan-image` | Trivy, mode image | Vulnérabilités connues de tout le contenu de l'image | Oui : gravité haute ou critique, avec correctif disponible | Rapport | — |
| `acceptation` | Jest + Supertest | Scénarios du backlog à travers les deux services, dans un environnement éphémère | Oui | Rapport de tests | I1 |
| `deploiement` | kubectl | Applique les manifestes avec l'image du commit, après validation humaine | Oui | — | — |
| `verification` | Jest + Supertest | Tests d'acceptation rejoués sur l'environnement déployé | Oui : signale un déploiement défaillant | Rapport de tests | I1 |
| `scan-planifie` | Trivy, Docker Buildx | Les contrôles `dependances` et `scan-image`, rejoués sur `main` | Alerte seulement | Rapport | — |
| `test-de-charge` | k6 | p95, taux d'erreur, comportement de la mise à l'échelle | Le job échoue si un seuil est dépassé | Rapport k6 | I2, I4 |

Environnement éphémère : les deux services et leurs dépendances lancés en conteneurs dans la machine du job, puis détruits. L'outil de lancement est fixé à l'étape 6.

Deux types de tests au moins alimentent les indicateurs : les tests unitaires (I3, par la couverture) et les tests d'intégration et d'acceptation (I1).

### 4.4 Choix des outils de contrôle

Les outils de test sont justifiés dans la fiche 0005, la plateforme dans la fiche 0004.

| Besoin | Outil retenu | Pourquoi | Alternative écartée |
|---|---|---|---|
| Analyse statique de sécurité | Semgrep | Outil du TP DevSecOps ; règles lisibles, exécutable sur le poste | CodeQL : analyse plus lente, règles plus difficiles à écrire pour des juniors |
| Détection de secrets | Gitleaks | Cité par le cours ; lit aussi l'historique Git | TruffleHog : équivalent, sans avantage pour ce projet |
| Dépendances et image | Trivy | Outil du TP. Un seul outil pour deux contrôles, une seule politique (« grave et corrigeable »), un seul fichier d'exceptions | `npm audit` pour les dépendances : pas d'option pour ignorer les failles sans correctif, pas de fichier d'exceptions daté |
| Lint | ESLint | Outil cité par le cours pour TypeScript ; possède une extension de sécurité | Aucune alternative étudiée : c'est le standard de fait |

### 4.5 Environnements

| Environnement | Support | Rôle |
|---|---|---|
| Développement | Poste du développeur, cluster k3d | Coder, lancer les tests avant de pousser |
| Intégration | Machines jetables de GitHub Actions | Exécuter le pipeline. Tout est détruit après chaque exécution |
| Démonstration | Cluster Kubernetes hébergé en Europe (fiche 0003) | Tient lieu de préproduction : vérification après déploiement, test de charge, démonstration |
| Production | Hors périmètre du prototype | Recevrait la même image et les mêmes manifestes |

### 4.6 Règles du pipeline

| Règle | Raison |
|---|---|
| Le pipeline est un fichier versionné avec le code | Il fait la même chose à chaque exécution, et chaque exécution laisse une trace |
| Construire une fois, déployer partout | L'image testée est exactement celle qui est livrée |
| Étiquette = SHA du commit | On sait ce que contient l'image et quoi redéployer pour un retour arrière |
| Secrets dans les variables chiffrées de GitHub Actions | Le dépôt est public : aucun secret n'y est versionné |
| Versions des outils du pipeline figées | Un pipeline reproductible ; un outil compromis ne s'exécute pas à notre insu |
| Un job bloquant en échec arrête la chaîne | Rien n'est déployé, l'ancienne version reste en place |

### 4.7 Hors prototype

| Contrôle | Risque couvert | Raison du report |
|---|---|---|
| DAST avec OWASP ZAP | Mauvaise configuration visible seulement sur l'application en marche | Demande de lancer toute la pile dans le pipeline ; les consignes exigent un scan de vulnérabilités, déjà couvert par Semgrep et Trivy |
| Analyse des manifestes Kubernetes | Mauvaise configuration du déploiement | Les manifestes n'existent qu'à l'étape 7 |
| SBOM et signature de l'image | Impossible de savoir vite si l'on est touché par une faille, ni de prouver l'origine d'une image | Utile à partir de plusieurs versions en production |
| Dependabot | Dépendances qui vieillissent | Le scan planifié suffit sur la durée du prototype |

## 5. Stratégie de tests

### 5.1 Approche

Tester tout est impossible : la stratégie répartit l'effort selon le risque. L'approche est mixte.

| Partie | Risque | Approche |
|---|---|---|
| Publication d'une annonce, contrôles d'accès, chaîne annonce → notification | Élevé : c'est le cœur de la fonctionnalité et de la sécurité | Préventive : les tests sont écrits avant le code (étape 5) |
| Le reste | Faible | Corrective : un test est ajouté quand une anomalie est trouvée |

### 5.2 Types de tests

| Type | Objectif | Outil | Moment | Environnement | Couverture visée |
|---|---|---|---|---|---|
| Unitaire | Vérifier une règle métier isolée (exemple : une annonce correspond-elle aux centres d'intérêt d'un membre ?) | Jest | Sur le poste avant de pousser ; à chaque pull request | Développement, intégration | ≥ 80 % du nouveau code |
| Intégration (test d'appel) | Vérifier un service avec ses vraies dépendances : routes, codes HTTP, données enregistrées, message publié, refus d'accès | Jest + Supertest | À chaque pull request | Intégration | Chaque route : cas nominal et cas d'erreur |
| Acceptation | Prouver chaque critère du backlog par le scénario complet, à travers les deux services | Jest + Supertest | À chaque pull request ; rejoué après chaque déploiement | Intégration, démonstration | 100 % des critères |
| Sécurité | Chercher les failles du code, des dépendances et de l'image | Semgrep, Gitleaks, Trivy | À chaque pull request ; chaque nuit | Intégration | Tout le code, toutes les dépendances |
| Performance et charge | Mesurer le temps de réponse, le taux d'erreur et la mise à l'échelle | k6 | Avant chaque livraison, à la demande | Démonstration | Le scénario de publication |
| Non-régression | Vérifier qu'un changement n'a rien cassé | Toute la suite automatisée | À chaque pull request | Intégration | — |
| Accessibilité | Vérifier la conformité au RGAA (référentiel général d'amélioration de l'accessibilité, 106 critères) | Contrôle automatique des pages, complété par un audit manuel : un outil ne vérifie qu'une partie des critères | Avant chaque mise en production | Démonstration | Hors prototype : le prototype est une API, sans interface |
| Recette | Faire valider la version par la maîtrise d'ouvrage | Cahier de recette, procès-verbal de recette | Avant chaque mise en production | Démonstration | Hors prototype |

Recette : phase où la maîtrise d'ouvrage (ceux qui expriment le besoin) vérifie que le logiciel livré répond aux objectifs, puis signe un procès-verbal.

### 5.3 Parties prenantes

R : réalise. A : approuve et répond du résultat. C : consulté. I : informé.

| Activité | Lead developer | Développeurs | Ingénieur DevOps | Maîtrise d'ouvrage |
|---|---|---|---|---|
| Définir la stratégie de tests | A, R | C | C | I |
| Écrire les critères d'acceptation | R | C | — | A |
| Écrire les tests unitaires et d'intégration | A | R | — | — |
| Écrire les tests d'acceptation | A | R | — | C |
| Maintenir le pipeline et les environnements de test | A | C | R | — |
| Écrire et jouer le test de charge | A | C | R | I |
| Traiter une alerte de sécurité | A | R | C | I |
| Prononcer la recette | C | I | I | A, R |

Dans le prototype, je tiens seul les rôles de l'équipe. L'ingénieur DevOps est le recrutement proposé dans le document de compétences.

### 5.4 Traiter un test en échec

| Cas | Règle |
|---|---|
| Un test échoue dans une pull request | La fusion est bloquée. L'auteur corrige dans la même pull request |
| Une anomalie est trouvée après la fusion | Un ticket est ouvert. On écrit d'abord le test qui reproduit l'anomalie, puis on corrige. Le test rejoint la suite de non-régression |
| Un test gêne | Il n'est jamais désactivé pour faire passer le pipeline. S'il est faux, il est corrigé ; la décision est visible dans la pull request |

## 6. Suite

L'étape 3 fixe l'architecture et le backlog. Elle donnera leur contenu aux critères d'acceptation (I1) et confirmera la base de données, le broker, le serveur d'authentification et l'outil d'observabilité cités ici sans être nommés.
