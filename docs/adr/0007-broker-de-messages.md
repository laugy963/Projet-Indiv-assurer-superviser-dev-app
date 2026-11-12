# 0007 — Broker de messages

- Statut : acceptée
- Date : 12 novembre 2026

## Contexte

- La fiche 0001 relie les services « annonces » et « notifications » par un broker de messages (intergiciel qui reçoit les messages d'un service émetteur et les distribue aux services abonnés).
- La grille note la communication entre services. Les consignes citent, comme expérimentation valide, un broker sur Kubernetes avec un test de publication-consommation.
- L'équipe compte deux développeurs juniors, sans pratique de la messagerie (compétence C6).
- Le poste de développement a 8 Go de mémoire.
- Des évolutions sont annoncées : d'autres services voudront réagir aux mêmes événements (enchères, recommandation).
- Aucun broker n'est vu en cours.

## Décision

Le broker est RabbitMQ, avec le protocole AMQP.

| Élément | Choix |
|---|---|
| Exchange (point d'aiguillage des messages) | `annonces`, de type topic : il aiguille selon une clé de routage |
| Clé de routage | Le type de l'événement, par exemple `annonce.publiee` |
| File | Une file durable par service abonné |
| Accusé de réception | Manuel : envoyé par le service après le traitement du message |
| Message en échec | Envoyé vers une file des messages en échec |

## Pourquoi ce choix

- Livraison « au moins une fois ». Avec une file durable et un accusé de réception manuel, un message non traité est remis. La documentation de NestJS le décrit : si un consommateur s'arrête sans accuser réception, RabbitMQ remet le message en file (consultée le 12 novembre 2026).
- Évolutivité. Avec un exchange de type topic, un nouvel abonné crée sa file et la lie à l'exchange. Le service émetteur n'est pas modifié.
- Intégration. NestJS fournit un transport RabbitMQ, qui gère l'exchange, la clé de routage et l'accusé de réception manuel (même documentation).
- Démonstration. RabbitMQ a une console web : on y voit les files et les messages en attente pendant la soutenance.
- Équipe. C'est un outil très répandu, bien documenté, accessible à des juniors.

## Alternatives écartées

| Alternative | Raison du rejet |
|---|---|
| Appel HTTP direct du service annonces vers le service notifications | Couplage : la publication échoue ou ralentit quand le service notifications est indisponible. Ne démontre pas la communication asynchrone |
| NATS | Très léger en mémoire. Mais la documentation du transport NATS de NestJS ne mentionne pas la conservation des messages : il faudrait l'ajouter par une bibliothèque tierce. Outil moins répandu |
| Kafka | Conserve un journal d'événements que l'on peut rejouer : adapté à de gros volumes. Plus lourd en mémoire (machine virtuelle Java) et plus complexe à exploiter : disproportionné pour un prototype sur 8 Go |
| Redis, en mode publication-abonnement | Aucune conservation : un message émis quand l'abonné est arrêté est perdu |

## Conséquences

- Un message peut être remis deux fois : le traitement doit être idempotent (le rejouer ne change pas le résultat). Une contrainte d'unicité sur les notifications y pourvoit.
- Par défaut, le transport de NestJS n'attend pas d'accusé de réception : le mode manuel est à activer.
- La file des messages en échec n'est pas décrite par la documentation de NestJS. Elle se configure côté RabbitMQ, de préférence par une règle (« policy »), comme le recommande sa documentation.
- L'événement est publié après l'enregistrement de l'annonce. Si le broker est injoignable à cet instant, l'annonce existe sans événement. Limite acceptée pour le prototype ; la cible est le motif « outbox » (document d'architecture, paragraphe 12).
- Un seul nœud RabbitMQ dans le prototype : c'est un point de défaillance unique.
- Un composant de plus à exploiter et à surveiller. Sa consommation de mémoire est à mesurer à l'étape 4.
