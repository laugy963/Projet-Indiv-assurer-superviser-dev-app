# Journal de bord

Chaque ligne consigne une action réellement menée. Ce journal sert de matière première aux protocoles d'expérimentation (étape 4) et à l'audit (étape 8).

| Date | Étape | Action | Commande | Résultat | Problème | Solution |
|---|---|---|---|---|---|---|
| 2026-11-10 | 1 | Lecture des consignes, du contexte et de la grille | — | Le prototype technique (4 points) et le CI/CD (3 points) pèsent le plus lourd ; la fonctionnalité métier vaut 1 point | — | — |
| 2026-11-10 | 1 | Choix du back-end | — | Node.js, TypeScript et NestJS retenus (fiche 0002) | Le poste n'a que 8 Go de mémoire | Stack à faible empreinte ; mesures prévues à l'étape 4 |
| 2026-11-10 | 1 | Vérification de l'offre gratuite de SonarQube Cloud dans la documentation officielle | — | Projets publics illimités ; analyse de la branche principale et des pull requests qui la ciblent | Pas de quality gate personnalisé dans l'offre gratuite | Gate intégré, et seuils imposés par le pipeline (fiche 0004) |
| 2026-11-10 | 1 | Vérification des exécuteurs arm64 de GitHub Actions dans le journal des changements de GitHub | — | Disponibles gratuitement pour les dépôts publics | — | — |
| 2026-11-10 | 1 | Création de l'arborescence du dépôt | `git init -b main` | Dépôt local initialisé, sans commit | Le poste de développement n'était pas joignable depuis la session de travail | Arborescence préparée à distance ; à pousser sur GitHub, puis à cloner sur le poste |
| 2026-11-12 | 1 | Création de CLAUDE.md et de `.claude/docs/` (synthèse des consignes, du contexte, de la grille et des étapes) | — | Claude Code charge le contexte du projet à chaque session sans relire les PDF | — | — |
| 2026-11-12 | 1 | Création de `.gitignore` et `.editorconfig`, retrait des `.DS_Store` du suivi Git | `git rm --cached` | Secrets, dépendances, rapports et fichiers système exclus du dépôt | Les deux fichiers, annoncés au commit précédent, manquaient ; six `.DS_Store` étaient versionnés | Fichiers créés ; les `.DS_Store` restent sur le disque mais sont ignorés |
