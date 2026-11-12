# Fiches de décision d'architecture

Une fiche par décision structurante : le contexte, la décision, les alternatives écartées et les conséquences. Une fiche n'est jamais réécrite après acceptation ; si la décision change, une nouvelle fiche la remplace et l'ancienne passe au statut « remplacée ».

| # | Décision | Statut |
|---|---|---|
| [0001](0001-fonctionnalite-metier.md) | Fonctionnalité métier : annonce de troc ou de don, notification des membres intéressés | Acceptée |
| [0002](0002-stack-back-end.md) | Back-end : Node.js, TypeScript, NestJS | Acceptée |
| [0003](0003-hebergement-et-orchestration.md) | Hébergement : k3d en local, k3s sur une machine virtuelle en Europe | Acceptée sous réserve |
| [0004](0004-ci-cd-et-analyse-qualite.md) | CI/CD : GitHub Actions, dépôt public, SonarQube Cloud | Acceptée |
| [0005](0005-outils-de-test.md) | Outils de test : Jest et Supertest, k6 pour la charge | Acceptée |
| [0006](0006-flux-de-branches.md) | Flux de branches : GitHub flow, `main` protégée | Acceptée |
