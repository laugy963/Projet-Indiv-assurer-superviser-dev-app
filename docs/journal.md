# Journal de bord

Chaque ligne consigne une action réellement menée. Ce journal sert de matière première aux protocoles d'expérimentation (étape 4) et à l'audit (étape 8).

| Date | Étape | Action | Commande | Résultat | Problème | Solution |
|---|---|---|---|---|---|---|
| 2026-11-10 | 1 | Lecture des consignes, du contexte et de la grille | — | Le prototype technique (4 points) et le CI/CD (3 points) pèsent le plus lourd ; la fonctionnalité métier vaut 1 point | — | — |
| 2026-11-10 | 1 | Choix du back-end | — | Node.js, TypeScript et NestJS retenus (fiche 0002) | Le poste n'a que 8 Go de mémoire | Stack à faible empreinte ; mesures prévues à l'étape 4 |
| 2026-11-10 | 1 | Vérification de l'offre gratuite de SonarQube Cloud dans la documentation officielle | — | Projets publics illimités ; analyse de la branche principale et des pull requests qui la ciblent | Pas de quality gate personnalisé dans l'offre gratuite | Gate intégré, et seuils imposés par le pipeline (fiche 0004) |
| 2026-11-10 | 1 | Vérification des exécuteurs arm64 de GitHub Actions dans le journal des changements de GitHub | — | Disponibles gratuitement pour les dépôts publics | — | — |
| 2026-11-10 | 1 | Création de l'arborescence du dépôt | `git init -b main` | Dépôt local initialisé, sans commit | Le poste de développement n'était pas joignable depuis la session de travail | Arborescence préparée à distance ; à pousser sur GitHub, puis à cloner sur le poste |
| 2026-11-10 | 1 | Publication du dépôt sur GitHub | `git push origin main` | Branche `main` en ligne ; dernière mise à jour à 17 h 56 (relevée dans le reflog de `origin/main` le 12 novembre) | Action non consignée le jour même | Ligne ajoutée a posteriori, à partir du reflog |
| 2026-11-12 | 1 | Création de CLAUDE.md et de `.claude/docs/` (synthèse des consignes, du contexte, de la grille et des étapes) | — | Claude Code charge le contexte du projet à chaque session sans relire les PDF | — | — |
| 2026-11-12 | 1 | Création de `.gitignore` et `.editorconfig`, retrait des `.DS_Store` du suivi Git | `git rm --cached` | Secrets, dépendances, rapports et fichiers système exclus du dépôt | Les deux fichiers, annoncés au commit précédent, manquaient ; six `.DS_Store` étaient versionnés | Fichiers créés ; les `.DS_Store` restent sur le disque mais sont ignorés |
| 2026-11-12 | 1 | Vérification de la visibilité du dépôt | `git ls-remote` sans identifiants | Lecture anonyme réussie : le dépôt est public, conforme à la fiche 0004 | `gh` n'est pas authentifié sur le poste | Vérification par une lecture Git anonyme |
| 2026-11-12 | 1 | Fusion de la branche `chore/claude-md-et-hygiene-depot` dans `main` | `git merge --ff-only`, puis `git push origin main` | Avance rapide de `57c15a3` à `69f3d28` ; CLAUDE.md, `.gitignore` et `.editorconfig` sont en ligne sur `main` | — | — |
| 2026-11-12 | 1 | Validation de la fiche 0001 et du cadrage | — | Fonctionnalité acceptée, étape 1 terminée | — | — |
| 2026-11-12 | 1 | Recalage du rétroplanning sur la disponibilité réelle | — | Environ 2 h par jour ; budget de 10 h par semaine (5 jours), 220 h jusqu'à la soutenance | Étapes 5 et 7 serrées (30 h et 20 h) | Briques critiques éprouvées à l'étape 4 ; marge des fêtes et week-ends en réserve |
| 2026-11-12 | 1 | Précision de la disponibilité : week-ends compris | — | Budget porté à 14 h par semaine, 308 h jusqu'à la soutenance ; dates et répartition entre étapes inchangées | Plus de réserve horaire en dehors des marges du calendrier | Marge des fêtes (28 h au plus) conservée |
