# 0001 — Fonctionnalité métier du prototype

- Statut : acceptée le 12 novembre 2026
- Date : 10 novembre 2026

## Contexte

- Les consignes demandent d'implémenter au moins une fonctionnalité métier, décrite par un backlog et prouvée par des tests d'appel ou d'acceptation.
- La grille accorde 1 point à la fonctionnalité et 4 points à la preuve des points clés de l'architecture : découpage applicatif, communication interservice, sécurité, hébergement, orchestration.
- Le contexte de l'entreprise décrit un espace communautaire réservé aux utilisateurs authentifiés : un membre y propose des goodies à échanger ou à donner, et les inscrits reçoivent une notification automatique lorsqu'un article correspond à leurs centres d'intérêt. Cet espace doit être modéré.

## Décision

Le prototype implémente la fonctionnalité suivante :

> En tant que membre authentifié, je publie une annonce de troc ou de don. Les membres dont les centres d'intérêt correspondent à l'annonce reçoivent une notification.

Elle repose sur deux services, « annonces » et « notifications », reliés par un broker de messages (intergiciel qui reçoit les messages d'un service émetteur et les distribue aux services abonnés, sans que les deux se connaissent).

Dans le prototype, une notification est un enregistrement que le membre consulte par l'API. L'envoi par courriel ou par notification mobile est hors périmètre. Le détail (user stories et critères d'acceptation) est rédigé à l'étape 3.

## Pourquoi ce choix

- Elle figure explicitement dans les exigences de l'entreprise.
- Elle exerce chaque point clé noté par la grille : deux services distincts (découpage), un échange asynchrone par le broker (communication interservice), un accès réservé aux membres et un rôle de modérateur (sécurité).
- Elle se teste en charge sur une opération simple à décrire : la publication d'une annonce.

## Alternatives écartées

| Alternative | Raison du rejet |
|---|---|
| Vente d'un produit (catalogue, panier, paiement) | C'est le cœur du besoin, mais le paiement impose l'intégration d'un prestataire et le respect de PCI DSS (norme de sécurité des données de cartes de paiement), hors de portée d'un prototype. Sans paiement, il ne reste que des lectures et écritures synchrones, qui n'exercent pas la communication interservice. |
| Liseuse du fanzine | Le travail porte surtout sur l'interface et la protection des contenus ; il prouve peu de chose sur l'architecture. |
| Chat entre passionnés | Il repose sur des connexions persistantes, plus délicates à mettre sous charge avec les outils cités par les consignes (JMeter, Siege). |

## Conséquences

- Un broker de messages devient nécessaire : la technologie est choisie à l'étape 3 et éprouvée en bac à sable à l'étape 4.
- Deux rôles sont à gérer : membre (publier une annonce) et modérateur (retirer une annonce). Ils servent à démontrer l'autorisation.
- Le canal d'événements pourra être réutilisé par les évolutions annoncées (notifications selon la navigation, enchères en v2).
