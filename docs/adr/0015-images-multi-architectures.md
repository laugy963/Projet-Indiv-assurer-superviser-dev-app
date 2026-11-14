# 0015 — Images pour arm64 et amd64 : émulation QEMU dans un seul job

- Statut : acceptée
- Date : 14 novembre 2026

## Contexte

- La fiche 0003 demande des images pour deux architectures de processeur : arm64 pour le poste et le cluster local, amd64 pour la cible si elle est en amd64. À l'étape 5, les images n'ont été construites que pour arm64, sur le poste.
- Le schéma de l'étape 2 prévoit un job `build-image` : « Docker Buildx, arm64 et amd64 », une image par service, étiquetée par le SHA du commit.
- Les exécuteurs standards de GitHub Actions sont en amd64. Des exécuteurs arm64 existent aussi, gratuits pour un dépôt public (vérifié le 10 novembre 2026).
- Le fichier `services/Dockerfile` a trois étapes. Les deux premières exécutent `npm ci` et le compilateur TypeScript ; la dernière copie le résultat.
- L'équipe compte deux développeurs juniors : le job doit pouvoir être lu et expliqué.

## Décision

Un seul job, sur un exécuteur amd64, construit les deux variantes de chaque image. La variante arm64 est construite par émulation.

| Élément | Rôle |
|---|---|
| QEMU | Émulateur : il fait exécuter des instructions arm64 par un processeur amd64 |
| Docker Buildx | Construit l'image pour chaque architecture demandée (`platforms: linux/amd64,linux/arm64`) |
| Liste de manifestes | Index publié sous une seule étiquette : il associe à chaque architecture l'image qui lui correspond. Le moteur de conteneurs choisit seul la bonne variante |
| Cache de construction | Les couches inchangées sont reprises de l'exécution précédente (cache de GitHub Actions) |

## Pourquoi ce choix

- C'est la solution la plus courte : un job, une action de plus (`setup-qemu-action`), une ligne `platforms`. Le Dockerfile de l'étape 5 n'est pas modifié pour cela.
- Une seule étiquette et une seule empreinte par service. Les jobs `scan-image` et `acceptation` désignent l'image par cette empreinte : ils ne peuvent pas en utiliser une autre.
- La durée mesurée est acceptable pour un prototype : 5 min 31 s puis 6 min 28 s pour les deux services (exécutions n° 43588700036 et n° 43589500284), soit environ 3 minutes par service.

## Alternatives écartées

| Alternative | Raison du rejet |
|---|---|
| Deux exécuteurs natifs (amd64 et arm64), puis un job qui assemble les deux images | Plus rapide, et chaque variante est construite sur sa vraie architecture. Mais trois jobs au lieu d'un, une quarantaine de lignes de plus, et une notion de plus à maîtriser : l'assemblage des images par leur empreinte |
| Compilation croisée : faire tourner les étapes de construction sur l'architecture de l'exécuteur (`--platform=$BUILDPLATFORM`) | La plus rapide : plus rien n'est émulé. Mais elle suppose qu'aucune dépendance n'embarque de programme propre à une architecture. C'est vrai aujourd'hui (vérifié dans le fichier de verrou le 14 novembre 2026), mais à revérifier à chaque nouvelle dépendance, sous peine d'une image qui ne démarre pas |
| Construire pour amd64 seulement | L'image ne démarrerait ni sur le poste ni sur le cluster local, tous deux en arm64 : c'est un risque identifié au cadrage |

## Conséquences

- La construction est le job le plus long du pipeline : plus de la moitié des 11 min 44 s d'une exécution complète. Le cache n'a pas raccourci la seconde construction mesurée. Si elle devient gênante, la première alternative est la suite logique : elle ne change ni le Dockerfile ni les jobs suivants.
- Limite : dans le pipeline, les tests d'acceptation tournent sur un exécuteur amd64, donc sur la variante amd64. La variante arm64 est construite et scannée, mais elle n'y est pas exécutée. Elle l'a été sur le poste le 14 novembre 2026 : images tirées du registre, architecture arm64 constatée dans les conteneurs, 12 tests d'acceptation réussis. Elle le sera sur le cluster à l'étape 7.
- Le scan de l'image lit les deux variantes : quatre analyses par exécution, deux services fois deux architectures.
- Les images des pull requests sont poussées dans le registre, comme celles de `main`. Elles s'y accumulent : une règle de nettoyage est à prévoir, hors prototype.
