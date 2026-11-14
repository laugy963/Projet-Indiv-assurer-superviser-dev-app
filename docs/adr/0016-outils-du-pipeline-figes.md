# 0016 — Outils du pipeline figés par leur empreinte

- Statut : acceptée
- Date : 14 novembre 2026

## Contexte

- Le processus de développement pose la règle « versions des outils du pipeline figées » (paragraphe 4.6), sans dire comment.
- Le pipeline exécute du code écrit par d'autres : neuf actions GitHub (briques réutilisables d'un workflow) et trois analyseurs de sécurité. Ce code tourne avec le jeton du pipeline. Dans le job `build-image`, ce jeton a le droit d'écrire dans le registre d'images.
- Une étiquette de version (`v7`, `0.76.2`) est un nom. Le propriétaire du dépôt, ou celui qui a volé ses accès, peut la déplacer vers un autre contenu.
- C'est arrivé à l'un des outils retenus. Le 19 mars 2026, un attaquant a déplacé 76 des 77 étiquettes de l'action `aquasecurity/trivy-action` vers un code qui volait les secrets des pipelines, puis publié de fausses versions de Trivy (avis de sécurité GHSA-69fq-xp46-6x23, CVE-2026-33634, lu le 14 novembre 2026). L'avis recommande de désigner les actions par l'empreinte complète de leur commit, et précise que les images désignées par leur empreinte n'étaient pas touchées.
- L'équipe compte deux développeurs juniors : ils doivent pouvoir rejouer un contrôle sur leur poste et lire la version d'un outil sans chercher.

## Décision

| Élément | Désignation | Exemple |
|---|---|---|
| Action GitHub | Empreinte SHA du commit ; la version est en commentaire | `actions/checkout@3d3c42e5… # v7.0.1` |
| Analyseur : Gitleaks, Semgrep, Trivy | Image de conteneur officielle ; étiquette de version suivie de l'empreinte sha256 | `aquasec/trivy:0.76.2@sha256:8f6bb947…` |

Empreinte : résultat d'un calcul sur le contenu lui-même. Deux contenus différents n'ont pas la même empreinte.

Trois règles complètent la décision :

1. Les analyseurs ne passent pas par une action. Le pipeline appelle `tests/securite/analyses.sh` : le même script, la même commande et la même version que sur le poste.
2. Le jeton du pipeline ne peut que lire le dépôt (`permissions: contents: read`). Un job qui a besoin d'un droit de plus le déclare pour lui seul : `packages: write` pour `build-image`, `packages: read` pour `scan-image` et `acceptation`.
3. Aucune valeur venue de l'extérieur (titre d'une pull request, nom de branche) n'est recopiée dans une commande du pipeline.

## Pourquoi ce choix

- Une empreinte désigne un contenu, pas un nom : personne ne peut la déplacer. Le code relu aujourd'hui est celui qui s'exécutera demain.
- C'est la consigne de GitHub (« Pin actions to a full-length commit SHA », guide de durcissement de GitHub Actions) et celle de l'éditeur de Trivy après l'attaque.
- Un seul script pour le poste et le pipeline : un développeur reproduit un échec sans attendre le pipeline, et les versions ne sont écrites qu'à un endroit.
- Deux actions tierces de moins : c'est autant de code étranger qui ne s'exécute pas avec le jeton.

## Alternatives écartées

| Alternative | Raison du rejet |
|---|---|
| Étiquette de version (`actions/checkout@v7`) | Plus lisible, et les correctifs arrivent seuls. Mais l'étiquette est déplaçable : c'est exactement le mécanisme de l'attaque de mars 2026 |
| Actions officielles des analyseurs (`aquasecurity/trivy-action`, `gitleaks/gitleaks-action`) | Moins de lignes dans le workflow. Mais du code tiers de plus, une commande différente de celle du poste, et `gitleaks-action` demande une licence dès que le dépôt appartient à une organisation, ce qui serait le cas de l'entreprise |
| Installer les analyseurs sur chaque poste et sur l'exécuteur | Les versions divergent d'un poste à l'autre. Avec les conteneurs, le seul prérequis est Docker, déjà nécessaire aux tests |

## Conséquences

- Une empreinte ne se met pas à jour seule. Sans outil, les versions vieillissent en silence. La mise à jour automatique (Dependabot, déjà classé « cible » au paragraphe 4.7 du processus) sait remplacer une empreinte et son commentaire. D'ici là, les versions sont relevées à la main ; la marche à suivre est dans le document de l'étape 6.
- Ce qui n'est pas figé, et c'est voulu : les règles de Semgrep et la base de vulnérabilités de Trivy sont téléchargées à chaque exécution. Un contrôle doit connaître les failles publiées la veille. Le pipeline peut donc passer au rouge sans qu'une ligne de code ait changé.
- Limite : l'image de base des services (`node:26.13.1-alpine`) et les images de l'environnement de test sont désignées par une étiquette de version exacte, pas par une empreinte. Le point est repris à l'audit de l'étape 8.
- À justifier devant le jury : une ligne comme `actions/checkout@3d3c42e5…` est moins lisible qu'un numéro de version. Le commentaire en fin de ligne donne la version ; l'empreinte donne la garantie.
