# 0014 — Vérification du destinataire du jeton

- Statut : acceptée
- Date : 13 novembre 2026

## Contexte

- La fiche 0009 fait vérifier par chaque service la signature du jeton, son émetteur, sa date d'expiration, puis le rôle.
- Le bac à sable a laissé un point ouvert : « le destinataire du jeton (`aud`) n'est pas vérifié : à décider à l'étape 5 ».
- Un même royaume Keycloak servira plusieurs applications : l'API, l'interface web, plus tard la boutique. Un jeton émis pour l'une porte la même signature et le même émetteur que les autres.
- La sécurité est une contrainte forte du contexte.

## Décision

Chaque service exige que la revendication `aud` du jeton (l'audience : la liste des destinataires pour lesquels le jeton a été émis) contienne `api-epouvante`. Sinon la réponse est 401.

| Élément | Choix |
|---|---|
| Valeur de l'audience | `api-epouvante`, la même pour les deux services |
| Côté Keycloak | Un « mapper » d'audience sur le client : il ajoute `api-epouvante` aux jetons que ce client obtient |
| Côté service | Un réglage `OIDC_AUDIENCE`, lu dans l'environnement |

## Pourquoi ce choix

- Défense en profondeur : un jeton obtenu pour une autre application du royaume ne donne pas accès à l'API.
- C'est le comportement que prévoit la norme des JWT (RFC 7519) : un service refuse un jeton dont l'audience ne le désigne pas.
- Le coût est faible : un réglage du royaume, une option de la bibliothèque de vérification, un cas de test par route.

## Alternatives écartées

| Alternative | Raison du rejet |
|---|---|
| Ne pas vérifier l'audience, comme au bac à sable | Plus simple. Mais tout jeton du royaume serait accepté, quelle que soit l'application visée : une limite de plus à inscrire à l'audit |
| Une audience par service | Un jeton volé ne vaudrait que pour un service. Mais deux réglages à tenir, alors que le même client appelle les deux services |
| Vérifier le client qui a obtenu le jeton (`azp`) | Chaque service devrait connaître la liste des clients : un nouveau client imposerait de reconfigurer les services |

## Conséquences

- Chaque nouveau client Keycloak, par exemple celui de l'interface web, doit recevoir le mapper d'audience. Sans lui, tous ses appels reçoivent 401.
- Le royaume versionné (`deploy/keycloak/epouvante-realm.json`) porte ce mapper sur le client `tests`.
- Preuves : un test « jeton émis pour une autre application » sur chacune des six routes, et un test d'acceptation qui lit l'audience dans un vrai jeton de Keycloak.
- Un jeton reste valable pour les deux services : c'est voulu, le même client les appelle tous les deux.
- Cette fiche complète la fiche 0009, qu'elle ne remplace pas.
