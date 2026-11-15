# 0017 — Déploiement : manifestes YAML et Kustomize

- Statut : acceptée
- Date : 15 novembre 2026

## Contexte

- Le prototype se déploie sur deux environnements : le cluster k3d du poste, puis un cluster k3s en Europe (fiche 0003). Les manifestes doivent être les mêmes ; seuls changent les noms d'hôte, l'émetteur de certificats et les images.
- Le schéma du pipeline, validé à l'étape 2, prévoit un job `deploiement` qui applique les manifestes avec `kubectl`.
- L'équipe compte deux développeurs juniors : ce qui est déployé doit se lire sans outil.
- Le cours Kubernetes enseigne Helm (TP 17) et le recommande pour empaqueter une application ; il cite Kustomize comme « variantes par environnement sans templates, alternative à Helm ».
- Les composants tiers (cert-manager, pile de supervision) sont déjà installés par Helm.

## Décision

Les manifestes du prototype sont des fichiers YAML ordinaires, assemblés par Kustomize, l'outil de variantes intégré à `kubectl` (`kubectl apply -k`).

| Dossier | Contenu |
|---|---|
| `deploy/k8s/base/` | Ce qui est identique partout : espace de noms, règles réseau, PostgreSQL, RabbitMQ, Keycloak, les deux services, leur HPA |
| `deploy/k8s/overlays/local/` | Variante du cluster k3d : noms d'hôte en `.localhost`, émetteur de certificats local, Ingress |
| `deploy/k8s/overlays/<cible>/` | Variante de l'environnement distant, écrite quand il existera |
| `deploy/k8s/cluster/` | Prérequis du cluster : redirection vers HTTPS, émetteur de certificats |
| `deploy/k8s/observabilite/` | Valeurs du chart Helm de supervision, objets de collecte, tableau de bord |

Ce que Kustomize fait ici, et rien d'autre :

| Fonction | Usage |
|---|---|
| `resources` | Assembler les fichiers de la base, puis la base dans une variante |
| `configMapGenerator` | Créer les ConfigMap des réglages ; `behavior: merge` remplace une clé dans une variante |
| Suffixe de contenu | Chaque ConfigMap généré porte un suffixe calculé sur son contenu : un réglage modifié change le nom, et Kubernetes remplace les pods un par un |
| `images` | Remplacer le nom d'image de la base par l'image voulue, désignée par son empreinte ou par une étiquette |
| `labels` | Marquer les objets de la phase 1 du déploiement (dépendances) |

Les Secrets ne passent pas par Kustomize : ils sont créés dans le cluster par `deploy/k8s/deployer.sh`, avec des mots de passe tirés au hasard. Aucun n'est dans le dépôt.

## Pourquoi ce choix

- Conforme au schéma validé : le déploiement se fait par `kubectl`, sans outil de plus à installer ni à figer.
- Ce qui est versionné est ce qui est appliqué. Un manifeste se lit et se montre tel quel ; `kubectl kustomize deploy/k8s/overlays/local` affiche le résultat exact avant de l'appliquer.
- Une variante ne contient que ses différences : deux réglages et un fichier d'Ingress pour la variante locale.
- Helm reste utilisé là où il apporte le plus : installer un logiciel tiers publié sous forme de chart.

## Alternatives écartées

| Alternative | Raison du rejet |
|---|---|
| Chart Helm du prototype, un fichier de valeurs par environnement | C'est l'outil du cours et sa recommandation. Mais il s'écarte du schéma validé à l'étape 2, et un gabarit Helm mêle YAML et instructions de gabarit : il ne se lit plus tel quel. Ses atouts (historique des versions, `helm rollback`) sont couverts ici par Git et par `kubectl rollout undo`. À reconsidérer si le prototype est distribué à d'autres équipes |
| Manifestes YAML seuls, valeurs remplacées par `sed` ou `envsubst` | Aucun outil, mais des remplacements de texte fragiles, et rien qui montre le résultat avant de l'appliquer |
| Un jeu de manifestes complet par environnement | Tout est écrit deux fois : les deux environnements divergent à la première modification oubliée |

## Conséquences

- L'écart avec la règle « à choix équivalent, l'outil vu en cours » est assumé : le choix n'est pas équivalent, le schéma validé pesant d'un côté. Kustomize est une compétence à ajouter au parcours des juniors ; les cinq fonctions du tableau suffisent.
- Les deux Deployment des services, très proches, sont écrits chacun dans son fichier. C'est une duplication acceptée : chaque fichier se lit seul.
- `kubectl apply -k` ne suffit pas à un premier déploiement : les Secrets et les comptes du broker doivent exister avant les services. `deployer.sh` porte cet ordre.
- Le job `deploiement` du pipeline appliquera la variante distante avec l'image du commit, par son empreinte. Il ne peut pas viser le cluster k3d : les exécuteurs de GitHub ne joignent pas le poste.
