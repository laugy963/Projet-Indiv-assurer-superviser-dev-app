# La Petite Maison de l'Épouvante — prototype de la plateforme

Prototype réalisé pour l'évaluation individuelle du bloc « Superviser et assurer le développement des applications logicielles » (MAALSI, CESI). Soutenance les 13 et 14 avril 2027.

## Objet

La Petite Maison de l'Épouvante veut remplacer son site vitrine par une plateforme de vente en ligne dotée d'un espace communautaire. Ce dépôt contient :

- le processus de développement qui encadre le projet (qualité, tests, sécurité, livraison continue) ;
- un prototype qui implémente une fonctionnalité métier et prouve les points clés de l'architecture ;
- l'audit de sécurité de cette première version et son plan de remédiation.

## Avancement

| Étape | Contenu | Statut |
|---|---|---|
| 1 | Cadrage | Terminée |
| 2 | Processus de développement | Terminée |
| 3 | Exigences et architecture | Terminée |
| 4 | Bac à sable | À faire |
| 5 | Développement du prototype | À faire |
| 6 | Pipeline CI/CD | À faire |
| 7 | Déploiement, observabilité, charge | À faire |
| 8 | Audit et remédiation | À faire |
| 9 | Soutenance | À faire |

## Arborescence

```
.
├── .github/workflows/     pipelines GitHub Actions (étape 6)
├── services/
│   ├── annonces/          service des annonces de troc et de don (étape 5)
│   └── notifications/     service des notifications (étape 5)
├── deploy/
│   ├── k3d/               configuration du cluster local (étape 4)
│   └── k8s/               manifestes Kubernetes (étape 7)
├── tests/
│   ├── acceptation/       tests d'acceptation du backlog (étape 5)
│   └── charge/            scénarios de test de charge (étape 7)
├── sandbox/               code et configuration des expérimentations (étape 4)
└── docs/
    ├── 01-cadrage.md      périmètre, décisions, risques, questions ouvertes
    ├── 02-processus-developpement.md   indicateurs, cycle DevSecOps, CI/CD, stratégie de tests
    ├── 02-competences-et-formation.md  cartographie, écarts, recrutement, formation
    ├── 03-exigences-et-backlog.md      exigences, user stories, critères d'acceptation
    ├── 03-architecture.md              composants, flux, données, sécurité, limites
    ├── retroplanning.md   calendrier jusqu'à la soutenance
    ├── journal.md         journal de bord (actions, résultats, problèmes)
    ├── adr/               fiches de décision d'architecture
    ├── schemas/           schémas draw.io : source .drawio, export .png, page .md
    ├── experimentations/  synthèses des protocoles d'expérimentation
    └── soutenance/        support et script de démonstration
```

## Documents à lire en premier

1. [Cadrage](docs/01-cadrage.md)
2. [Processus de développement](docs/02-processus-developpement.md), avec les schémas du [cycle DevSecOps](docs/schemas/cycle-devsecops.md) et du [pipeline CI/CD](docs/schemas/pipeline-ci-cd.md)
3. [Compétences et formation](docs/02-competences-et-formation.md)
4. [Exigences et backlog](docs/03-exigences-et-backlog.md)
5. [Architecture technique](docs/03-architecture.md), avec son [schéma](docs/schemas/architecture-technique.md)
6. [Fiches de décision](docs/adr/README.md)
7. [Rétroplanning](docs/retroplanning.md)
8. [Journal de bord](docs/journal.md)

## Règle de sécurité du dépôt

Ce dépôt est public. Aucun secret (mot de passe, jeton, clé privée, fichier kubeconfig) n'y est versionné : les secrets vivent dans les variables chiffrées de la plateforme CI/CD et dans les objets Secret du cluster.
