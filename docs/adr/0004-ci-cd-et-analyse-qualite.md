# 0004 — Plateforme CI/CD et analyse de la qualité

- Statut : acceptée
- Date : 10 novembre 2026

## Contexte

- Les consignes demandent un pipeline CI/CD avec des tests automatisés, dont au moins deux types de tests qui alimentent les indicateurs de qualité, et un scan de vulnérabilités.
- Aucun serveur n'est disponible pour héberger des outils : le poste de développement a 8 Go de mémoire et l'équipe n'a pas de profil d'exploitation.
- Mes dépôts existants sont hébergés sur GitHub.

## Décision

- Plateforme CI/CD : GitHub Actions.
- Dépôt : public, sur GitHub.
- Analyse de la qualité du code : SonarQube Cloud.

Définitions :

- CI/CD : l'intégration continue compile, teste et analyse automatiquement chaque modification ; la livraison et le déploiement continus emballent puis déploient automatiquement le logiciel validé.
- Quality gate : ensemble de seuils de qualité qui fait échouer l'analyse lorsqu'ils ne sont pas tenus.

## Pourquoi ce choix

- Les exécuteurs hébergés par GitHub sont gratuits pour un dépôt public, y compris en arm64 (vérifié le 10 novembre 2026). Il n'y a rien à héberger.
- Le code, le pipeline et les alertes sont au même endroit.
- SonarQube Cloud analyse gratuitement et sans limite les projets publics (documentation officielle consultée le 10 novembre 2026).

## Alternatives écartées

| Alternative | Raison du rejet |
|---|---|
| GitLab CI (outil du TP DevSecOps) | Fonctionnellement équivalent. Écarté pour ne pas répartir le projet sur deux forges. Les notions du cours se transposent : étapes et jobs deviennent des jobs liés par `needs`, les `services` restent des `services`, `when: manual` devient un environnement soumis à approbation, le pipeline planifié devient `on: schedule`. |
| Jenkins | Un serveur à héberger, à sécuriser et à maintenir. |
| SonarQube Server auto-hébergé | Il demande plusieurs gigaoctets de mémoire, ce que le poste ne peut pas offrir. |

## Limites acceptées

- L'offre gratuite de SonarQube Cloud n'analyse que la branche principale et les pull requests qui la ciblent, et n'autorise pas de quality gate personnalisé. Le pipeline utilise donc le gate intégré et impose lui-même nos seuils (par exemple la couverture minimale, dans la configuration des tests).
- Le dépôt est public : le code et tout son historique sont lisibles par tous. Aucun secret n'est versionné, et la détection de secrets entre dans le pipeline à l'étape 6. En production, le dépôt serait privé.
- GitHub est un fournisseur américain. L'exigence d'hébergement en Europe porte sur l'application et ses données ; la forge n'héberge que le code et les exécutions du pipeline. Le point est repris dans l'audit de l'étape 8.
