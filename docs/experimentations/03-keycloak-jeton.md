# Expérimentation 3 — Keycloak : jeton, rôles, vérification par un service

- Date : 13 novembre 2026
- Décision : adopter
- Code : [sandbox/03-keycloak-jeton/](../../sandbox/03-keycloak-jeton/)
- Preuve : [resultats/execution.txt](../../sandbox/03-keycloak-jeton/resultats/execution.txt)

## 1. Objectif

Vérifier le mécanisme d'authentification et d'autorisation de la fiche 0009, avant d'écrire le code des services.

| # | Hypothèse à vérifier |
|---|---|
| H1 | Keycloak, en mode production avec PostgreSQL, fonctionne derrière l'Ingress HTTPS et annonce la bonne adresse d'émetteur |
| H2 | Il délivre un jeton qui porte les rôles de l'utilisateur |
| H3 | Un service vérifie le jeton sans appeler Keycloak : signature, émetteur, expiration, puis rôle |
| H4 | Un jeton falsifié ou expiré est refusé |
| H5 | Le service continue de vérifier les jetons quand Keycloak est arrêté |
| H6 | Les comptes survivent au redémarrage de la base de données |
| H7 | Keycloak tient dans la mémoire du poste |

L'expérimentation porte sur des interactions : Keycloak avec PostgreSQL, avec l'Ingress HTTPS de l'expérimentation 2, et avec un service qui lit ses clés publiques par le réseau interne.

## 2. Environnement

| Élément | Valeur |
|---|---|
| Poste et cluster | Comme l'expérimentation 1 : k3d 5.9.0, k3s 1.35.5 |
| Keycloak | 26.8.2, image `quay.io/keycloak/keycloak:26.8.2`, lancé par `start --import-realm` |
| Base de données | PostgreSQL 18.7, image `postgres:18.7-alpine`, base `keycloak` |
| Service de vérification | Node.js 24.22.3, bibliothèque jose 6.2.17 |
| HTTPS | Ingress Traefik, certificat de l'autorité locale de l'expérimentation 2 |
| Espace de noms | `bac-a-sable-identite` |

| Objet déployé | Rôle |
|---|---|
| StatefulSet `postgresql`, volume de 1 Gio | La base de Keycloak |
| Deployment `keycloak` | Le serveur d'identité, joignable sur `https://auth.epouvante.test` |
| ConfigMap `royaume` | Le fichier [epouvante-realm.json](../../sandbox/03-keycloak-jeton/royaume/epouvante-realm.json), importé au premier démarrage |
| Deployment `verificateur` | Joue un service du prototype : routes `/membre` et `/moderateur`, sur `https://verificateur.epouvante.test` |
| Secrets `postgresql-compte`, `keycloak-admin` | Mots de passe aléatoires créés par le script |

Le royaume versionné contient deux rôles (`membre`, `moderateur`) et un client `tests`, réservé à la connexion directe des comptes de test. Il ne contient aucun utilisateur ni aucun mot de passe : le script crée les comptes de test avec l'outil d'administration de Keycloak, lancé dans le pod.

## 3. Reproduire

```bash
sandbox/02-ingress-https/run.sh      # prérequis : cert-manager et l'autorité locale
sandbox/03-keycloak-jeton/run.sh
```

Durée mesurée : 4 min 10 s, dont 98 s d'attente de l'expiration d'un jeton. Le script repart de zéro à chaque exécution.

| Étape du script | Action |
|---|---|
| Préparation | Construit l'image du service de vérification, déploie PostgreSQL, Keycloak, le service et l'Ingress, crée trois comptes de test |
| Test 1 | Lit l'adresse d'émetteur annoncée par Keycloak, en HTTPS |
| Test 2 | Demande un jeton et lit son contenu |
| Test 3 | Appelle le service : sans jeton, avec un jeton valide, falsifié, d'un rôle insuffisant |
| Test 4 | Arrête Keycloak, puis appelle le service avec un jeton encore valide |
| Test 5 | Attend l'expiration du premier jeton, puis l'utilise |
| Test 6 | Supprime le pod de PostgreSQL, attend son retour, redemande un jeton |
| Test 7 | Demande un jeton pour un compte sans courriel, prénom ni nom |
| Mesure | `kubectl top pod` |

## 4. Résultats

Exécution du 13 novembre 2026 à 12 h 24 : 18 contrôles, 18 réussis.

| Hypothèse | Contrôle | Attendu | Obtenu |
|---|---|---|---|
| H1 | Émetteur annoncé par Keycloak | `https://auth.epouvante.test/realms/epouvante` | identique |
| H2 | Jeton obtenu pour `membre-test` | oui | oui |
| H2 | Émetteur écrit dans le jeton | `https://auth.epouvante.test/realms/epouvante` | identique |
| H2 | Durée de vie du jeton, en secondes | 120 | 120 |
| H2 | Le jeton porte le rôle `membre` | `true` | `true` |
| H2 | Le jeton ne porte pas le rôle `moderateur` | `false` | `false` |
| H3 | `/membre` sans jeton | 401 | 401 |
| H3 | `/membre` avec le jeton d'un membre | 200 | 200 |
| H4 | `/membre` avec une signature falsifiée | 401 | 401 |
| H3 | `/moderateur` avec le jeton d'un membre | 403 | 403 |
| H4 | `/moderateur` avec un jeton modifié pour s'attribuer le rôle | 401 | 401 |
| H3 | `/moderateur` avec le jeton d'un modérateur | 200 | 200 |
| H5 | `/membre` avec un jeton valide, Keycloak arrêté | 200 | 200 |
| H5 | Demande d'un nouveau jeton, Keycloak arrêté | 503 | 503 |
| H4 | `/membre` avec un jeton expiré | 401 | 401 |
| H6 | Jeton obtenu après le redémarrage de la base | oui | oui |
| H6 | `/membre` avec ce nouveau jeton | 200 | 200 |
| — | Demande de jeton pour un compte incomplet | 400 | 400 |

Contenu utile du jeton de `membre-test`. Les rôles sont dans la revendication `realm_access.roles` ; Keycloak y ajoute trois rôles par défaut. Le jeton est signé avec l'algorithme RS256.

```json
{
  "iss": "https://auth.epouvante.test/realms/epouvante",
  "azp": "tests",
  "typ": "Bearer",
  "duree": 120,
  "roles": ["membre", "offline_access", "uma_authorization", "default-roles-epouvante"]
}
```

Motifs de refus, lus dans le journal du service. Ils ne sont jamais renvoyés au client, qui ne reçoit que « jeton invalide ».

```
2 {"etat":"jeton-refuse","motif":"ERR_JWS_SIGNATURE_VERIFICATION_FAILED"}
1 {"etat":"jeton-refuse","motif":"ERR_JWT_EXPIRED"}
```

| Mesure | Valeur |
|---|---|
| PostgreSQL prêt | 5 à 13 s |
| Keycloak prêt au premier démarrage, création de la base comprise | 26 à 36 s sur trois exécutions |
| Keycloak de nouveau prêt après un arrêt | 21 à 22 s |
| Jeton de nouveau délivré après le redémarrage de la base | 3 à 7 s |
| Mémoire de Keycloak (H7) | 488 à 510 Mio |
| Mémoire de PostgreSQL | 27 à 30 Mio |
| Mémoire du service de vérification | 47 à 75 Mio |

## 5. Difficultés rencontrées

| # | Symptôme | Cause | Solution |
|---|---|---|---|
| 1 | À la deuxième exécution, le jeton à la « signature falsifiée » est accepté : 200 au lieu de 401 | Le défaut était dans le test. Il modifiait le dernier caractère de la signature. Dans l'encodage base64, les derniers bits de ce caractère ne sont pas significatifs : selon le jeton, la signature décodée restait la même | Le test modifie le premier caractère de la signature. Refus obtenu à chaque exécution |
| 2 | Un compte créé sans courriel, prénom ni nom n'obtient pas de jeton : 400, « Account is not fully set up » | Keycloak exige un profil complet avant toute connexion | Les comptes de test sont créés avec courriel, prénom et nom. Le cas est devenu le test 7 |
| 3 | Deux adresses pour le même Keycloak | Le jeton porte l'adresse publique (`https://auth.epouvante.test/…`). Le service lit les clés par l'adresse interne (`http://keycloak:8080/…`) | Deux réglages distincts dans le service : l'émetteur attendu et l'adresse des clés. Côté Keycloak, `KC_HOSTNAME` fixe l'émetteur |

La difficulté 1 est la plus instructive : un test de sécurité mal construit peut réussir ou échouer au hasard. La première exécution avait donné 401, la deuxième 200, avec le même code.

Les règles tirées de l'expérimentation 1 ont été appliquées d'emblée : utilisateur désigné par son numéro, droits du volume de PostgreSQL non retouchés au redémarrage, traitement du signal d'arrêt. Aucune de ces trois pannes ne s'est reproduite.

## 6. Limites

| Limite | Conséquence |
|---|---|
| Les jetons sont obtenus par connexion directe | Mode déconseillé par Keycloak pour une application réelle : réservé au client `tests` (fiche 0009). Repris à l'audit |
| Le service de vérification est en Node.js, sans NestJS | La garde NestJS reste à écrire à l'étape 5. La bibliothèque et les revendications lues seront les mêmes |
| Keycloak n'a été arrêté que quelques secondes | La bibliothèque garde les clés publiques 10 minutes en cache (valeur lue dans son code). Au-delà, une panne de Keycloak bloque la vérification |
| Le destinataire du jeton (`aud`) n'est pas vérifié | À décider à l'étape 5 |
| Le changement des clés de Keycloak n'est pas testé | Comportement du cache à vérifier avant une mise en production |
| La désactivation d'un compte n'est pas testée | Un jeton déjà délivré reste valable jusqu'à son expiration : d'où la durée courte de 120 s |
| Le compte d'administration provisoire reste en place | À remplacer par un compte nominatif à l'étape 7 |
| Une seule instance de Keycloak ; la base ne contient que celle de Keycloak | Les bases des deux services ne sont pas encore sur l'instance |

## 7. Décision

Adopter Keycloak et la vérification locale des jetons. Les sept hypothèses sont confirmées : la fiche 0009 est maintenue.

Règles à reprendre à l'étape 5 :

1. Lire les rôles dans `realm_access.roles`, et l'identité dans `sub`.
2. Régler séparément l'émetteur attendu (adresse publique) et l'adresse des clés (adresse interne).
3. N'accepter que l'algorithme RS256.
4. Ne jamais renvoyer au client le motif précis d'un refus.
5. Créer les comptes de test avec un profil complet.
6. Dans les tests de sécurité, vérifier que la donnée falsifiée est vraiment différente de l'originale.
