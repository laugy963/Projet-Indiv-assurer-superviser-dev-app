# CLAUDE.md

## Projet

Évaluation individuelle MAALSI (CESI), bloc « Superviser et assurer le développement des applications logicielles ». L'utilisateur joue le Lead Developer de La Petite Maison de l'Épouvante (entreprise fictive) : processus qualité DevSecOps, prototype (POC) déployé sur Kubernetes, audit de sécurité et plan de remédiation.
Soutenance les 13 et 14 avril 2027 : 20 min de présentation + 15 min de questions, devant un jury de spécialistes du développement.

## Rôle de Claude

- Lead developer senior qui accompagne un étudiant : l'étudiant doit pouvoir expliquer et justifier devant le jury tout ce qui est produit.
- Une seule étape à la fois, dans l'ordre de `.claude/docs/etapes.md`. Ne pas anticiper l'étape suivante.
- Fin d'étape : produire le bilan en 4 points (format dans `etapes.md`), puis s'arrêter et attendre « étape suivante ».
- Paramètre non fixé : proposer deux options avec leurs conséquences, attendre le choix.
- Information manquante : poser la question plutôt que supposer.

## Comprendre le projet : lire `docs/` d'abord

`docs/` est la mémoire du projet : ce qui a été décidé, pourquoi, et ce qui a été fait. Le consulter avant toute proposition.

- `README.md` — objet, tableau « Avancement » des 9 étapes, arborescence
- `docs/01-cadrage.md` — périmètre, décisions, contraintes, questions ouvertes, risques
- `docs/02-processus-developpement.md` — indicateurs I1 à I4, cycle DevSecOps, jobs du pipeline, stratégie de tests ; `docs/02-competences-et-formation.md` — cartographie, recrutement, formation
- `docs/03-exigences-et-backlog.md` — exigences EF et ENF, user stories US-01 à US-06, critères d'acceptation CA-01 à CA-19 ; `docs/03-architecture.md` — composants, API, événement, données, sécurité, limites du prototype
- `docs/05-developpement-poc.md` — prototype réalisé : versions figées, structure, traçabilité critères → tests, résultats, écarts avec l'architecture (paragraphe 10), difficultés, limites (paragraphe 12)
- `docs/06-pipeline-ci-cd.md` — pipeline réalisé : jobs et durées, exécutions de référence, indicateurs mesurés, écarts avec le schéma de l'étape 2, sécurité du pipeline, difficultés, limites
- `docs/07-deploiement-observabilite-charge.md` — déploiement réalisé : objets, sondes, HPA, règles réseau ; vérification (49 contrôles) ; supervision ; trois exécutions du test de charge, I2 et I4 mesurés, cinq défauts révélés (paragraphe 8.8) ; difficultés ; limites (paragraphe 12)
- `docs/08-audit-et-remediation.md` — audit : méthode (ISO 27005, échelles et matrice du cours), résultats analysés, inventaire de sécurité du 16 novembre 2026, 23 constats sur la première version (C1 à C23), 12 risques du parc existant déduits du contexte (S1 à S12), matrice (paragraphe 7), plan priorisé de 36 actions par jalons J1 à J4 (paragraphe 8), limites (paragraphe 12)
- `docs/soutenance/README.md` — étape 9 : paramètres, livrables, ce qui n'a pas été exécuté, ce qui est à mettre à jour avant avril 2027 (paragraphe 6) ; `01-plan-et-diapositives.md` (plan chronométré, 16 diapositives, correspondance avec la grille), `02-demonstration.md` (script en huit temps, répétition du 16 novembre 2026, checklist, replis, vidéo de secours), `03-questions-du-jury.md` (20 questions)
- `docs/experimentations/README.md` — synthèse du bac à sable : résultats, mémoire mesurée, règles techniques à appliquer aux étapes 5 et 7 (paragraphe 5) ; un protocole par expérimentation à côté
- `docs/adr/README.md` — index et statut des fiches de décision (ADR) ; détail dans `docs/adr/NNNN-*.md`
- `docs/retroplanning.md` — calendrier, marges, échéances bloquantes
- `docs/journal.md` — journal de bord : actions réellement menées et leurs résultats
- `docs/schemas/`, `docs/experimentations/`, `docs/soutenance/` — livrables des étapes 2-3, 4 et 9 ; `docs/captures/` — captures du tableau de bord Grafana, avec leur légende

Avancement : ne pas le déduire de ce fichier. Le lire dans `README.md` (tableau « Avancement ») et en fin de `docs/journal.md`.

## Map du repo

- `services/annonces/`, `services/notifications/` — les deux services du POC (étape 5), même structure : `src/entrees`, `application`, `domaine`, `adaptateurs`, `migrations` ; `test/integration`. Image : `services/Dockerfile`
- `libs/socle/` — code technique commun (garde d'accès, erreurs, validation, réglages, démarrage) et outils de test ; aucune règle métier (ADR 0012)
- `deploy/k3d/` — cluster local (étape 4) ; `deploy/keycloak/` — royaume versionné
- `deploy/k8s/` — déploiement (étape 7) : `base/` et `overlays/local/` (Kustomize), `deployer.sh`, `verifier.sh`, `acces.sh`, `demo.sh` (démonstration de la soutenance), `observabilite/` (Prometheus, Grafana) ; mode d'emploi dans `deploy/k8s/README.md`
- `tests/environnement/` — environnement de test Docker Compose ; `tests/acceptation/` ; `tests/resultats/` — sorties brutes, la preuve ; `tests/securite/analyses.sh` — Gitleaks, Semgrep, Trivy, même commande sur le poste et dans le pipeline ; `tests/securite/audit.sh` — inventaire de l'audit (étape 8), images tierces comprises ; `tests/charge/` — scénario k6 et son lanceur (étape 7)
- `sandbox/` — un sous-dossier rejouable par expérimentation (étape 4)
- `.github/workflows/` — `pipeline.yml` (pull request et `main` : temps 1 à 3 du schéma ; temps 4 à l'étape 7), `scan-planifie.yml` (chaque nuit) ; à la racine, `sonar-project.properties` et `.trivyignore` (risques acceptés, datés)
- `Contexte et Consigne - Indiv/` — sources officielles (PDF, XLSX), synthétisées dans `.claude/docs/` ; ne relire l'original qu'en cas de doute
- `Cours/` — référence de vocabulaire et d'outils (voir Index)
- `Prompte de démarrage.rtf` — méthode de travail d'origine, reprise ici et dans `etapes.md`

## Stack retenue

Les fiches ADR font foi ; ceci n'est qu'un résumé.

- Fonctionnalité : un membre publie une annonce de troc ou de don ; les membres aux centres d'intérêt correspondants sont notifiés (ADR 0001).
- Back-end : Node.js LTS, TypeScript, NestJS (ADR 0002).
- Hébergement : k3d en local, k3s sur une VM en Europe ; repli Kubernetes managé européen (ADR 0003).
- CI/CD : GitHub Actions, dépôt public, SonarQube Cloud (ADR 0004) ; GitHub flow (ADR 0006). `main` est protégée depuis le 14 novembre 2026 : aucun push direct, même pour la documentation ; tout passe par une branche, une pull request et les 10 jobs du pipeline (6 à 12 minutes), puis une fusion par commit de fusion.
- Tests : Jest + Supertest (unitaires, intégration, acceptation), k6 pour la charge (ADR 0005). Contrôles de sécurité du pipeline : Semgrep, Gitleaks, Trivy.
- Communication entre services : RabbitMQ, exchange topic `annonces`, événement `annonce.publiee` ; aucun appel direct entre les deux services (ADR 0007).
- Données : PostgreSQL, une instance, une base et un compte par service, TypeORM, migrations versionnées (ADR 0008).
- Sécurité : Keycloak, OpenID Connect, rôles `membre` et `moderateur`, jeton vérifié dans chaque service (ADR 0009).
- Exposition : API REST en HTTPS, Ingress Traefik, cert-manager (ADR 0010). Observabilité : Prometheus + Grafana (ADR 0011). Mise à l'échelle : HPA, 2 à 4 pods, cible 70 % du processeur réservé, un pod de plus par 30 secondes au plus.
- Déploiement : manifestes YAML assemblés par Kustomize, une variante par environnement ; Secrets créés au hasard par `deployer.sh`, jamais versionnés (ADR 0017). Environnement distant non commandé : seul le cluster k3d est déployé.
- Versions figées à l'étape 5 : Node.js 26.13.1, NestJS 12.5.0, TypeScript 6.0.3 (pas la 7 : ts-jest et typescript-eslint ne l'acceptent pas), Jest 30.5.2 ; liste complète dans `docs/05-developpement-poc.md`.
- Pipeline : images arm64 et amd64 construites par émulation QEMU (ADR 0015) ; actions désignées par l'empreinte de leur commit, analyseurs en conteneurs désignés par leur empreinte, jeton en lecture seule par défaut (ADR 0016).
- Socle commun en paquet interne, npm workspaces (ADR 0012). Tests : Docker Compose, émetteur de jetons de test en intégration, Keycloak en acceptation (ADR 0013). Audience `api-epouvante` vérifiée dans chaque service (ADR 0014).
- Poste : MacBook Pro M1, 8 Go, arm64. Chaque composant ajouté au cluster local coûte de la mémoire ; images construites pour arm64 et amd64. Le poste ne tient pas le prototype, Grafana et une charge ensemble : Grafana est lancé à la demande, et 200 utilisateurs simultanés saturent le nœud.

## Commandes

Ajouter ici les commandes de déploiement dès qu'elles existent et ont été exécutées avec succès.

- Prototype, depuis la racine, détail dans `tests/README.md` (exécutées le 13 novembre 2026) :
  installer `npm ci` ; contrôler `npm run lint`, `npm run typage` ; compiler `npm run build` ;
  tests unitaires `npm run test:unit` ; intégration `npm run env:integration` puis `npm run test:int` ; acceptation `npm run env:acceptation` puis `npm run test:acceptation` ;
  tout rejouer et enregistrer les preuves `npm run preuves` (environ 2 minutes) ; arrêter `npm run env:arret` (l'environnement d'acceptation occupe environ 920 Mio).
  Jest a besoin de `NODE_OPTIONS=--experimental-vm-modules` (déjà dans les scripts) ; pour une sortie qui liste chaque test, ajouter `--verbose --reporters=default`.
  `env:integration` arrête les conteneurs des deux services : ils consommeraient les événements à la place du service testé.
- Pipeline, détail dans `docs/06-pipeline-ci-cd.md` (exécutées le 14 novembre 2026) :
  contrôles de sécurité, les mêmes que dans le pipeline : `tests/securite/analyses.sh secrets`, `sast`, `dependances`, `image <image> [plateforme]` (seul prérequis : Docker ; rapports dans `reports/securite/`) ;
  valider les workflows avant de pousser : `docker run --rm -v "$PWD":/repo:ro -w /repo rhysd/actionlint:1.7.12` ;
  suivre une exécution : `gh run list`, `gh run watch <id> --exit-status`, `gh run view <id> --log-failed` ; contrôles d'une pull request : `gh pr checks <n°>`.
  `npm run lint` échoue au premier avertissement (`--max-warnings 0`). Dans le pipeline et l'image, `npm ci --ignore-scripts`.
  Verdict du quality gate sans ouvrir le navigateur : `curl -s "https://sonarcloud.io/api/qualitygates/project_status?projectKey=laugy963_Projet-Indiv-assurer-superviser-dev-app&pullRequest=<n°>"`.
- Déploiement et charge, détail dans `deploy/k8s/README.md` et `tests/README.md` (exécutées le 15 novembre 2026), cluster k3d démarré :
  déployer `deploy/k8s/deployer.sh` (images construites sur le poste ; ou `IMAGE_ANNONCES=…@sha256:… IMAGE_NOTIFICATIONS=… deploy/k8s/deployer.sh` pour celles du pipeline) ; supervision `deploy/k8s/observabilite/installer.sh` ; vérifier `deploy/k8s/verifier.sh` (49 contrôles, 45 s) ;
  appeler le prototype déployé : `source deploy/k8s/acces.sh`, puis `npm run test:acceptation` ou `curl --cacert "$AC_LOCALE" "$URL_API/api/annonces"` ;
  test de charge : `tests/charge/lancer.sh essai` (80 s), `tests/charge/lancer.sh` (13 min de charge, 50 puis 200 utilisateurs, puis 5 à 7 min de retour au minimum de pods) ; autres paliers par `CHARGE_NOMINALE` et `CHARGE_POINTE` ; analyse des manifestes `tests/securite/analyses.sh manifestes` ;
  Grafana : `kubectl -n monitoring scale deploy supervision-grafana --replicas=1` puis `kubectl -n monitoring port-forward svc/supervision-grafana 3000:80` ; le refermer par `--replicas=0`.
  Captures du tableau de bord, sans affichage (Chrome et Node.js) : `deploy/k8s/observabilite/capturer.sh <début> <fin> docs/captures <préfixe>`, heures locales au format `2026-11-15T16:55` ; à faire dans les 24 heures que garde Prometheus.
  Avant un test de charge : arrêter les autres conteneurs Docker, refermer Grafana, ne rien lancer d'autre sur le poste. Ne pas relever l'état du broker par `rabbitmqctl` pendant un test : la commande fausse la mesure.
- Démonstration, détail dans `docs/soutenance/02-demonstration.md` (exécutées le 16 novembre 2026), cluster démarré et prototype déployé : en direct `deploy/k8s/demo.sh` (huit temps, touche Entrée) ; répétition `deploy/k8s/demo.sh repetition` (sans pause, 15 s, réécrit `tests/resultats/demonstration.txt`). Toujours après `deploy/k8s/verifier.sh`. Arrêter les autres conteneurs du poste avant de démarrer le cluster.
- Audit, détail dans `docs/08-audit-et-remediation.md` (exécutée le 16 novembre 2026) : inventaire de sécurité `tests/securite/audit.sh` (50 s ; Docker et `jq` ; cluster arrêté) ; il réécrit `tests/resultats/audit-securite.txt`. Il compte toutes les gravités et n'échoue pas sur un constat : ce n'est pas un contrôle du pipeline.
- Cluster local k3d, détail dans `deploy/k3d/README.md` (exécutées le 13 novembre 2026) :
  créer `k3d cluster create --config deploy/k3d/cluster.yaml` ; relancer ou arrêter `k3d cluster start epouvante`, `k3d cluster stop epouvante` ; accès `source deploy/k3d/env.sh` avant tout `kubectl` ou `helm` (fichier d'accès propre au projet, `~/.kube/config` n'est pas utilisé).
  Arrêter le cluster après usage : il occupe environ 2 Gio sur les 3,83 Gio du moteur Docker. Après un `start`, compter 4 à 6 minutes avant que tous les pods soient prêts.
- Rejouer le bac à sable (exécutées le 13 novembre 2026) : `sandbox/01-broker-rabbitmq/run.sh`, `sandbox/02-ingress-https/run.sh` puis `sandbox/03-keycloak-jeton/run.sh` (la 3 dépend de la 2), `sandbox/memoire.sh`.
- Exporter un schéma draw.io en image, depuis la racine du dépôt (exécutée le 12 novembre 2026, draw.io 29.6.1) :
  `/Applications/draw.io.app/Contents/MacOS/draw.io -x -f png -s 2 -b 10 -o docs/schemas/<nom>.png docs/schemas/<nom>.drawio`

## Règles non négociables

- N'inventer aucun résultat : chiffres, captures, difficultés et limites viennent d'exécutions réelles. Ce qui n'a pas pu être exécuté est dit comme tel.
- Consigner chaque action réelle dans `docs/journal.md` : Date | Étape | Action | Commande | Résultat | Problème | Solution.
- Dépôt public : aucun secret versionné (mot de passe, jeton, clé privée, kubeconfig). Secrets dans les variables chiffrées de GitHub Actions et les objets Secret du cluster.
- Justifier chaque choix technique par le contexte (Europe, sécurité forte, équipe junior, RGAA, évolutions v2/v3, poste 8 Go) et citer l'alternative écartée.
- À choix équivalent, prendre l'outil vu en cours.
- Rester au niveau prototype : une seule fonctionnalité, mais chaque brique prouve un point de l'architecture.
- Étape 5 : tests d'abord ; chaque critère d'acceptation est prouvé par un test d'appel ou d'acceptation.
- Une fiche ADR acceptée n'est jamais réécrite : une nouvelle fiche la remplace, l'ancienne passe au statut « remplacée ».
- `Contexte et Consigne - Indiv/` et `Cours/` sont en lecture seule.

## Conventions de rédaction

- Français, phrases courtes, tableaux plutôt que prose, pas d'emoji.
- Définir chaque terme technique à sa première apparition (après deux-points ou entre parenthèses).
- Vocabulaire précis : le jury n'accepte pas le « je sais faire mais pas expliqué ».
- Schémas en draw.io (choix de l'étudiant, le 12 novembre 2026), jamais en Mermaid. Pour chaque schéma, trois fichiers de même nom dans `docs/schemas/` : la source `.drawio`, l'export `.png`, et un `.md` qui affiche l'image avec sa légende. Après chaque modification, régénérer l'export (voir Commandes) et relire l'image. Le diagramme de Gantt (`docs/schemas/retroplanning.drawio`) est affiché dans `docs/retroplanning.md` ; ses barres sont à recaler si le calendrier change.
- ADR : `docs/adr/NNNN-kebab-case.md`, en-tête Statut + Date, sections Contexte / Décision / Pourquoi ce choix / Alternatives écartées / Conséquences. Mettre à jour `docs/adr/README.md` et le tableau « Décisions » de `docs/01-cadrage.md`.
- Dates en toutes lettres dans les documents (10 novembre 2026), au format ISO dans le journal (2026-11-10).
- Mettre à jour le tableau « Avancement » de `README.md` à chaque fin d'étape.

## Priorités

1. Exactitude : preuves réellement exécutées, tracées dans le journal
2. Points de la grille, les plus lourds d'abord (POC 4 pts, CI/CD 3 pts — voir `evaluation.md`)
3. Capacité de l'étudiant à expliquer et défendre chaque choix
4. Respect du rétroplanning et de ses échéances bloquantes
5. Sobriété : ne pas produire plus que ce que la grille récompense

## Index `.claude/docs/` (charger à la demande)

- `.claude/docs/evaluation.md` — consignes des 3 phases, ce qui compte ou non comme expérimentation, grille sur 20
- `.claude/docs/contexte-entreprise.md` — entreprise, SI existant (pour l'audit), exigences, évolutions v2/v3
- `.claude/docs/etapes.md` — les 9 étapes, leurs livrables et le format du bilan de fin d'étape
- Cours (préférer les `.md` aux PDF) : `Cours/COURS-DevSecOps.md`, `Cours/COURS-Kubernetes.md`, `Cours/COURS-Optimisation du développement.md`. PDF seuls pour Tests et recettes (`Cours/Cours-INF243 MAALSI_TESTSETRECETTES_2025.pdf`) et Sécurité applicative (`Cours/Cours-CESI_Securite_Applicatifs_2026.pdf`).
