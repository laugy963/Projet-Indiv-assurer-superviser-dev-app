# Les 9 étapes du projet

Source : `Prompte de démarrage.rtf`. Une étape à la fois, dans cet ordre. Le statut de chaque étape est dans le tableau « Avancement » de `README.md` ; les dates sont dans `docs/retroplanning.md`.

| # | Étape | Contenu attendu | Livrables |
|---|---|---|---|
| 1 | Cadrage | Valider fonctionnalité, stack, hébergement ; créer le dépôt et son arborescence ; rétroplanning | `docs/01-cadrage.md`, `docs/adr/`, `docs/retroplanning.md` |
| 2 | Processus de développement | 4 indicateurs (fonctionnalité, performance, maintenabilité, fiabilité — ISO 25010), chacun avec définition, mesure, outil, seuil, action si dépassé, effet sur la dette technique. Cycle DevSecOps et mesures de sécurité par étape. Schéma CI/CD détaillé : déclencheurs, jobs, outils, contrôles bloquants, artefacts, environnements, job → indicateur. Stratégie de tests : types, outils, moment, parties prenantes. Cartographie des compétences (1 lead, 2 juniors, recrutements réalistes), écarts, au moins une action de formation détaillée | `docs/`, `docs/schemas/` |
| 3 | Exigences et architecture | Exigences fonctionnelles reformulées ; backlog (user stories + critères d'acceptation) ; schéma d'architecture technique avec sécurité et choix (BDD, protocoles, frameworks) | `docs/`, `docs/schemas/`, nouvelles ADR |
| 4 | Bac à sable | 2 ou 3 expérimentations sur les technologies critiques (ex. broker sur Kubernetes avec publication-consommation, Ingress HTTPS + cert-manager, Keycloak, CI/CD avec outils qualité). Pour chacune : environnement, étapes de reproduction, résultats, difficultés, limites, décision adopter / rejeter. Exclus : voir `evaluation.md` | `sandbox/<expérimentation>/`, `docs/experimentations/`, `deploy/k3d/` |
| 5 | Développement du POC | Implémenter la fonctionnalité selon le backlog et l'architecture, tests d'abord. Chaque critère d'acceptation prouvé par un test d'appel ou d'acceptation. Au moins 2 bonnes pratiques de sécurité | `services/annonces/`, `services/notifications/`, `tests/acceptation/` |
| 6 | Pipeline CI/CD | Conforme au schéma de l'étape 2 ; au moins 2 types de tests qui alimentent les indicateurs, exécutés avec succès | `.github/workflows/` |
| 7 | Déploiement, observabilité, charge | Déploiement Kubernetes (sondes, ressources, HPA, NetworkPolicy) ; observabilité ; test de charge : temps de réponse, taux d'erreur, comportement de la mise à l'échelle | `deploy/k8s/`, `tests/charge/` |
| 8 | Audit et remédiation | Analyser résultats des tests, scans et métriques ; vulnérabilités de la v1 et du parc applicatif existant ; plan priorisé (risque, action, justification, effort, échéance) | `docs/` |
| 9 | Soutenance | Plan chronométré sur 20 min, contenu de chaque diapositive, schémas lisibles, script de démo, checklist avant démo, vidéo de secours, 20 questions probables du jury avec réponses | `docs/soutenance/` |

## Bilan de fin d'étape (obligatoire)

1. Livrables produits et leur emplacement.
2. Critères de la grille couverts, avec la preuve correspondante (voir `evaluation.md`).
3. Cinq questions que le jury pourrait poser sur l'étape, avec les réponses.
4. Ce qu'il reste à faire à l'étudiant lui-même.

Puis s'arrêter et attendre que l'utilisateur écrive « étape suivante ».
