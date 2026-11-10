# Étape 1 — Cadrage

- Date : 10 novembre 2026
- Soutenance : 13 et 14 avril 2027 (20 minutes de présentation, 15 minutes de questions)
- Statut : en attente de validation

## 1. Mission

Je suis Lead Developer de La Petite Maison de l'Épouvante. L'entreprise remplace son site vitrine par une plateforme de vente en ligne dotée d'un espace communautaire. Ma mission tient en trois phases :

1. structurer le processus de développement pour garantir la qualité logicielle ;
2. réaliser et déployer un prototype, ou POC (proof of concept : réalisation minimale qui démontre la faisabilité d'une solution) ;
3. auditer la sécurité de cette première version et proposer un plan de remédiation.

## 2. Périmètre du prototype

Dans le périmètre :

- une fonctionnalité métier : publier une annonce de troc ou de don et notifier les membres intéressés ;
- l'authentification des membres et l'autorisation par rôle ;
- un pipeline CI/CD avec au moins deux types de tests ;
- le déploiement sur Kubernetes, en HTTPS ;
- une composante d'observabilité ;
- un test de charge.

Hors périmètre, cité pour mémoire : vente en ligne et paiement, abonnement et liseuse du fanzine, recommandation de produits, chat, enchères (v2), diffusion vidéo (v2 et v3), interface web. Le prototype est une API, prouvée par des tests d'appel et d'acceptation, comme le permettent les consignes. L'exigence de conformité au RGAA (référentiel général d'amélioration de l'accessibilité) est traitée dans la stratégie de tests de l'étape 2.

## 3. Décisions

| # | Sujet | Décision | Statut | Fiche |
|---|---|---|---|---|
| 1 | Fonctionnalité métier | Annonce de troc ou de don, notification des membres intéressés | À valider | [0001](adr/0001-fonctionnalite-metier.md) |
| 2 | Back-end | Node.js, TypeScript, NestJS | Acceptée | [0002](adr/0002-stack-back-end.md) |
| 3 | Hébergement | k3d en local, puis k3s sur une machine virtuelle en Europe | Acceptée sous réserve | [0003](adr/0003-hebergement-et-orchestration.md) |
| 4 | CI/CD et qualité | GitHub Actions, dépôt public, SonarQube Cloud | Acceptée | [0004](adr/0004-ci-cd-et-analyse-qualite.md) |

Organisation du code : un seul dépôt pour les deux services, les manifestes et la documentation. Un prototype tenu par une seule personne y gagne un pipeline unique et des modifications cohérentes entre services. L'alternative, un dépôt par service, se justifiera quand plusieurs équipes livreront à des rythmes différents.

## 4. Contraintes

| Contrainte | Origine | Effet sur le projet |
|---|---|---|
| Hébergement en Europe | Contexte | Choix du fournisseur de la cible (fiche 0003) |
| Sécurité forte, plateforme commerciale | Contexte | Démarche DevSecOps dès l'étape 2, audit à l'étape 8 |
| Équipe de deux développeurs juniors et un lead | Contexte | Stack à un seul langage, cartographie des compétences et formation à l'étape 2 |
| Conformité au RGAA | Contexte | Tests de conformité dans la stratégie de tests |
| Évolutions prévues (enchères, diffusion vidéo) | Contexte | Architecture découpée en services et pilotée par événements |
| Poste de 8 Go de mémoire, processeur arm64 | Matériel | Stack légère, outils de qualité en service cloud, images pour deux architectures |

## 5. Questions ouvertes

| Question | Destinataire | Échéance | Conséquence |
|---|---|---|---|
| La grille demande un « environnement managé ». Un k3s installé sur une machine virtuelle suffit-il, ou faut-il un service Kubernetes opéré par un fournisseur ? | Intervenant | 20 décembre 2026 | Si un service managé est exigé : option de repli de la fiche 0003 |
| Combien d'heures par semaine puis-je consacrer au projet ? | Moi | Dès maintenant | Calibrage du rétroplanning |

## 6. Risques du projet

| Risque | Effet | Parade |
|---|---|---|
| Mémoire du poste insuffisante | Le cluster local ne fait pas tourner toute la pile | Mesure à l'étape 4 ; les composants qui ne tiennent pas ne tournent que sur l'environnement distant |
| Architectures différentes entre le poste (arm64) et la cible | Une image construite pour l'une ne démarre pas sur l'autre | Images construites pour les deux architectures par le pipeline |
| Secret publié dans le dépôt public | Le secret est compromis définitivement, même après suppression | Aucun secret versionné, `.gitignore` dès le premier commit, détection de secrets dans le pipeline |
| Panne pendant la démonstration | Démonstration interrompue devant le jury | Script de démonstration, liste de vérifications, vidéo de secours, gel du code le 5 avril 2027 |
| Réponse tardive sur l'« environnement managé » | Environnement cible à refaire | Échéance au 20 décembre ; manifestes identiques quelle que soit l'option |

## 7. Suite

Le calendrier est dans le [rétroplanning](retroplanning.md). L'étape 2 commence après validation de ce cadrage.
