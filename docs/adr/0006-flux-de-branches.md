# 0006 — Flux de branches

- Statut : acceptée
- Date : 12 novembre 2026

## Contexte

- Le pipeline CI/CD doit savoir quand s'exécuter et quand déployer. Cela dépend de la façon dont l'équipe utilise les branches Git.
- L'équipe compte deux développeurs juniors : leur code doit être relu avant d'entrer dans la branche principale.
- L'offre gratuite de SonarQube Cloud n'analyse que la branche principale et les pull requests qui la ciblent (fiche 0004).
- Le cours DevSecOps demande une branche principale protégée, sans push direct, et une validation humaine.

## Décision

Le projet suit le GitHub flow.

| Règle | Détail |
|---|---|
| Une branche par changement | Créée depuis `main`, courte, nommée d'après son objet |
| Une pull request vers `main` | Elle déclenche le pipeline et porte la relecture |
| Fusion sous conditions | Contrôles bloquants du pipeline verts, et relecture par un pair |
| `main` protégée | Aucun push direct. `main` est toujours dans un état livrable |
| Déploiement depuis `main` seulement | Après une validation humaine |

Pull request : demande de fusion d'une branche, contrôlée par le pipeline et relue avant d'être acceptée.

## Pourquoi ce choix

- Un seul point d'entrée vers `main` : c'est là que se placent les contrôles bloquants et la relecture.
- Des branches courtes donnent de petites livraisons fréquentes. Un défaut est trouvé dans un petit changement, plus simple à corriger.
- Le flux correspond exactement à ce que SonarQube Cloud analyse gratuitement : `main` et les pull requests vers `main`.
- Il n'y a qu'une règle à retenir pour des juniors : on ne travaille jamais directement sur `main`.

## Alternatives écartées

| Alternative | Raison du rejet |
|---|---|
| Gitflow (branches longues `develop`, `release`, `hotfix`) | Conçu pour des versions planifiées et maintenues en parallèle. Les branches longues retardent l'intégration et multiplient les fusions. Une branche `develop` ne serait pas analysée par l'offre gratuite de SonarQube Cloud |
| Développement directement sur `main`, sans pull request | Aucun point de relecture, et aucune barrière avant la branche livrable |

## Conséquences

- La protection de `main` est activée à l'étape 6, quand les contrôles du pipeline existent. Jusque-là, les fusions sont faites à la main.
- Seul sur le prototype, je ne peux pas approuver mes propres pull requests. La relecture par un pair vaut pour l'équipe ; dans le prototype, la pull request sert à déclencher le pipeline et à garder la trace du changement.
- Un correctif urgent suit le même chemin : une branche courte, une pull request, le pipeline.
