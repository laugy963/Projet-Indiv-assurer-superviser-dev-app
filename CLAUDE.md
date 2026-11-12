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
- `docs/adr/README.md` — index et statut des fiches de décision (ADR) ; détail dans `docs/adr/NNNN-*.md`
- `docs/retroplanning.md` — calendrier, marges, échéances bloquantes
- `docs/journal.md` — journal de bord : actions réellement menées et leurs résultats
- `docs/schemas/`, `docs/experimentations/`, `docs/soutenance/` — livrables des étapes 2-3, 4 et 9

Avancement : ne pas le déduire de ce fichier. Le lire dans `README.md` (tableau « Avancement ») et en fin de `docs/journal.md`.

## Map du repo

- `services/annonces/`, `services/notifications/` — les deux services du POC (étape 5)
- `deploy/k3d/` — cluster local (étape 4) ; `deploy/k8s/` — manifestes Kubernetes (étape 7)
- `tests/acceptation/` (étape 5), `tests/charge/` (étape 7)
- `sandbox/` — un sous-dossier rejouable par expérimentation (étape 4)
- `.github/workflows/` (à créer, étape 6) — pipelines GitHub Actions
- `Contexte et Consigne - Indiv/` — sources officielles (PDF, XLSX), synthétisées dans `.claude/docs/` ; ne relire l'original qu'en cas de doute
- `Cours/` — référence de vocabulaire et d'outils (voir Index)
- `Prompte de démarrage.rtf` — méthode de travail d'origine, reprise ici et dans `etapes.md`

## Stack retenue

Les fiches ADR font foi ; ceci n'est qu'un résumé.

- Fonctionnalité : un membre publie une annonce de troc ou de don ; les membres aux centres d'intérêt correspondants sont notifiés (ADR 0001).
- Back-end : Node.js LTS, TypeScript, NestJS ; tests pressentis Jest + Supertest (ADR 0002).
- Hébergement : k3d en local, k3s sur une VM en Europe ; repli Kubernetes managé européen (ADR 0003).
- CI/CD : GitHub Actions, dépôt public, SonarQube Cloud (ADR 0004).
- Cible de départ, à confirmer à l'étape 3 : broker de messages, PostgreSQL, Keycloak (rôles membre / modérateur), Ingress Traefik + cert-manager (HTTPS), Prometheus + Grafana, HPA, test de charge JMeter / Siege / k6.
- Poste : MacBook Pro M1, 8 Go, arm64. Chaque composant ajouté au cluster local coûte de la mémoire ; images construites pour arm64 et amd64.

## Commandes

Aucune pour l'instant : le code arrive à l'étape 5. Les ajouter ici (install, lint, test, build, déploiement) dès qu'elles existent et ont été exécutées avec succès.

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
- Schémas en Mermaid (ou draw.io) dans `docs/schemas/` ; vérifier que le rendu fonctionne.
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
