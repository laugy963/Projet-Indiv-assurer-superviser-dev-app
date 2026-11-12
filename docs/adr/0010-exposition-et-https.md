# 0010 — Exposition de l'API et HTTPS

- Statut : acceptée
- Date : 12 novembre 2026

## Contexte

- Les consignes demandent une sécurité minimale qui comprend HTTPS.
- Le prototype est une API, prouvée par des tests d'appel et mise sous charge.
- k3s fournit le contrôleur Ingress Traefik (fiche 0003).
- Le cours Kubernetes indique qu'en production les certificats viennent de cert-manager, et non d'une commande manuelle.

## Décision

| Sujet | Choix |
|---|---|
| Style d'API | REST, en JSON |
| Point d'entrée | Un seul : l'Ingress, appliqué par Traefik. Un Ingress est un ensemble de règles de routage HTTP vers les services du cluster |
| Routage | Par chemin vers les deux services ; un nom d'hôte distinct pour Keycloak |
| HTTPS | Terminé par Traefik ; HTTP est redirigé vers HTTPS |
| Certificats | Émis et renouvelés par cert-manager : un certificat auto-signé en local, un certificat d'une autorité publique sur l'environnement distant |

## Pourquoi ce choix

- REST est simple à appeler, à tester avec Supertest et à mettre sous charge avec k6. Les juniors le connaissent.
- Un seul point d'entrée : un seul endroit où chiffrer, router et surveiller le trafic externe.
- Traefik est déjà dans k3s : rien à installer, et le même contrôleur en local et à distance.
- cert-manager automatise l'émission et le renouvellement : pas de certificat expiré par oubli.

## Alternatives écartées

| Alternative | Raison du rejet |
|---|---|
| GraphQL | Sa souplesse sert une interface riche, absente du prototype. Il est plus difficile à limiter et à sécuriser |
| gRPC | Performant entre services, mais un client web ne l'appelle pas directement. Les deux services ne s'appellent pas : ils passent par le broker |
| Un Service de type LoadBalancer par service | Plusieurs points d'entrée à chiffrer et à protéger, un par application |
| Certificat créé à la main | Aucun renouvellement automatique ; pratique déconseillée par le cours |
| Passerelle d'API dédiée, en plus de l'Ingress | Elle apporte la limitation de débit et la gestion de clés. Utile en cible ; un composant de plus pour le prototype |

## Conséquences

- Le trafic est en clair à l'intérieur du cluster. Les NetworkPolicy limitent qui peut parler à qui ; le chiffrement interne est en cible.
- Un certificat d'une autorité publique demande un nom de domaine qui pointe sur l'environnement distant : à prévoir avant l'étape 7.
- Les réglages fins de Traefik (redirection, réécriture de chemin) lui sont propres : ils ne se transposent pas tels quels à un autre contrôleur.
- La Gateway API, qui succède à l'Ingress, n'est pas retenue : l'Ingress suffit au prototype et c'est l'objet vu en cours.
