# 0003 — Hébergement et orchestration

- Statut : acceptée sous réserve (voir la question ouverte)
- Date : 10 novembre 2026

## Contexte

- L'entreprise souhaite que l'application soit hébergée en Europe. Ses logiciels actuels sont déjà chez un fournisseur cloud français.
- Les consignes demandent un déploiement par un orchestrateur ou un fournisseur cloud, et la démonstration de la disponibilité et de la montée en charge.
- La grille parle d'un « environnement managé ».
- Le poste de développement a 8 Go de mémoire et un processeur arm64.

## Décision

- Développement et bac à sable : k3d sur le poste. k3d lance k3s dans des conteneurs Docker ; k3s est une distribution allégée de Kubernetes.
- Environnement de démonstration : k3s sur une machine virtuelle hébergée en Europe. Le fournisseur est choisi à l'étape 7.

## Pourquoi ce choix

- La distribution est la même en local et sur la cible. Les manifestes passent de l'un à l'autre sans modification, et les composants fournis sont identiques : Traefik comme contrôleur Ingress, metrics-server pour la mise à l'échelle automatique.
- k3d et k3s sont les outils du cours Kubernetes.
- Une machine virtuelle a une adresse IP publique. cert-manager peut donc y obtenir un certificat d'une autorité publique, alors qu'en local le certificat est auto-signé.

## Alternatives écartées

| Alternative | Raison du rejet |
|---|---|
| Docker Compose seul | Ce n'est pas un orchestrateur : ni mise à l'échelle automatique, ni mise à jour progressive, ni redémarrage piloté par des sondes. Il ne permet pas de démontrer la disponibilité et la montée en charge. |
| Minikube | Équivalent en local, mais la distribution diffère de la cible : contrôleur Ingress et stockage ne sont pas les mêmes, d'où des écarts possibles au déploiement. |
| Kubernetes managé d'un fournisseur américain (EKS, GKE, AKS) en région européenne | L'hébergement en Europe est possible, mais le fournisseur reste soumis au droit américain (CLOUD Act). C'est moins cohérent avec le souhait de l'entreprise et avec son hébergeur français actuel. |

## Option de repli

Kubernetes managé d'un fournisseur européen (Scaleway Kapsule, OVHcloud Managed Kubernetes). Elle remplace la machine virtuelle si l'intervenant confirme que « managé » désigne un service opéré par le fournisseur. Le coût des deux options n'a pas encore été comparé ; il le sera à l'étape 7.

## Question ouverte

Un k3s installé par nos soins sur une machine virtuelle est un orchestrateur, pas un service managé. La question est posée à l'intervenant, avec une réponse attendue avant le 20 décembre 2026.

## Conséquences

- Les images de conteneur sont construites pour deux architectures : arm64 pour le poste, amd64 pour la cible si elle est en amd64.
- La mémoire du poste est comptée. L'étape 4 mesure ce qui tient en local ; ce qui ne tient pas n'est lancé que sur l'environnement distant.
- Avec une machine virtuelle, l'exploitation du cluster (mises à jour, sauvegardes) revient à l'équipe. Cette compétence entre dans la cartographie de l'étape 2.
