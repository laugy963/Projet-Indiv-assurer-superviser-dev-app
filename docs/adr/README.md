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
| [0007](0007-broker-de-messages.md) | Broker de messages : RabbitMQ, exchange de type topic | Acceptée |
| [0008](0008-persistance.md) | Persistance : PostgreSQL, une instance, une base par service, TypeORM | Acceptée |
| [0009](0009-authentification-et-autorisation.md) | Authentification et autorisation : Keycloak, OpenID Connect, jeton vérifié dans chaque service | Acceptée |
| [0010](0010-exposition-et-https.md) | Exposition : API REST en HTTPS, Ingress Traefik, cert-manager | Acceptée |
| [0011](0011-observabilite.md) | Observabilité : métriques avec Prometheus et Grafana | Acceptée |
| [0012](0012-socle-commun.md) | Socle technique commun aux deux services : paquet interne, npm workspaces | Acceptée |
| [0013](0013-environnement-et-jetons-des-tests.md) | Tests : environnement Docker Compose, émetteur de jetons de test pour l'intégration | Acceptée |
| [0014](0014-audience-du-jeton.md) | Vérification du destinataire du jeton (`aud`) | Acceptée |
| [0015](0015-images-multi-architectures.md) | Images pour arm64 et amd64 : émulation QEMU dans un seul job | Acceptée |
| [0016](0016-outils-du-pipeline-figes.md) | Outils du pipeline figés par leur empreinte ; jeton à droits minimaux | Acceptée |
| [0017](0017-manifestes-et-kustomize.md) | Déploiement : manifestes YAML et Kustomize | Acceptée |
