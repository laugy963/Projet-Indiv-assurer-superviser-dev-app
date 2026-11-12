# Étape 3 — Exigences et backlog

- Date : 12 novembre 2026
- Statut : en attente de validation
- Complété par : [architecture technique](03-architecture.md)

## 1. Objet

Ce document reformule les exigences de la maîtrise d'ouvrage, puis décrit la fonctionnalité du prototype sous la forme d'un backlog.

| Terme | Définition |
|---|---|
| Backlog | Liste ordonnée de ce qui reste à réaliser |
| User story | Besoin exprimé du point de vue d'un utilisateur : « En tant que…, je veux…, afin de… » |
| Critère d'acceptation | Condition vérifiable qu'une user story doit remplir pour être déclarée finie. Il est rédigé en « Étant donné / Quand / Alors » (fiche 0005) |

## 2. Acteurs

| Acteur | Description | Authentifié | Dans le prototype |
|---|---|---|---|
| Visiteur | Internaute non connecté | Non | Oui : toutes ses requêtes sont refusées |
| Membre | Inscrit de l'espace communautaire | Oui, rôle `membre` | Oui |
| Modérateur | Personne chargée de faire respecter les règles de l'espace communautaire | Oui, rôle `moderateur` | Oui |
| Client | Acheteur de la boutique en ligne | Selon l'action | Non |

## 3. Exigences fonctionnelles reformulées

Source : le contexte de l'entreprise. Chaque exigence est réécrite en une phrase, avec son acteur.

| # | Exigence | Acteur | Version | Couverte par le prototype |
|---|---|---|---|---|
| EF-01 | Un client achète en ligne les produits vendus en magasin | Client | v1 | Non |
| EF-02 | Un client achète les figurines Evil Ed, vendues seulement sur le site | Client | v1 | Non |
| EF-03 | Un client achète un numéro numérisé du fanzine et le lit dans une liseuse intégrée à son espace | Client | v1 | Non |
| EF-04 | Un client s'abonne au fanzine, papier ou numérique, ou renouvelle son abonnement | Client | v1 | Non |
| EF-05 | Le site recommande des produits à partir des recherches et des achats du client | Client | v1 | Non |
| EF-06 | Un membre propose des articles à échanger ou à donner | Membre | v1 | Oui : US-01, US-05 |
| EF-07 | Un membre est notifié automatiquement quand un article proposé correspond à ses centres d'intérêt | Membre | v1 | Oui : US-02, US-03, US-04 |
| EF-08 | La notification tient aussi compte de la navigation du membre | Membre | v1, souhaitée (« idéalement ») | Non |
| EF-09 | L'espace communautaire est modéré | Modérateur | v1 | En partie : retrait d'une annonce (US-06) |
| EF-10 | Un utilisateur authentifié gère son espace : articles proposés et recherchés, réglage des notifications et des recommandations, suivi et historique des achats | Membre, client | v1 | En partie : centres d'intérêt (US-02), notifications reçues (US-03) |
| EF-11 | Les membres discutent entre eux par un chat | Membre | v1 | Non |
| EF-12 | Tout internaute lit les news et les articles de fond | Visiteur | v1 | Non |
| EF-13 | Un membre met un article aux enchères | Membre | v2 | Non |
| EF-14 | Le site diffuse les productions d'Evil Ed | Client | v2 | Non |
| EF-15 | Le site diffuse les films du festival en mode restreint : places limitées, plages horaires fixes | Client | v3, éventuelle | Non |

### Hypothèses de reformulation

Le contexte laisse des points ouverts. Le sujet est fictif : il autorise à les préciser, tant que la précision reste cohérente. Ces hypothèses seraient à faire valider par la maîtrise d'ouvrage.

| # | Point ouvert | Hypothèse retenue |
|---|---|---|
| H1 | Le contexte parle d'« une liste de goodies » | Une annonce porte sur un seul article. Proposer plusieurs articles revient à publier plusieurs annonces |
| H2 | Les « centres d'intérêt » ne sont pas définis | Un centre d'intérêt est une catégorie d'articles, prise dans une liste fermée |
| H3 | Le canal de notification n'est pas précisé | Une notification est un enregistrement que le membre consulte (fiche 0001). Courriel et notification mobile sont hors périmètre |
| H4 | Rien n'est dit de l'auteur | L'auteur n'est pas notifié de sa propre annonce |
| H5 | Le contexte demande une notification « automatique », sans délai | La notification est disponible en moins de 5 secondes. Ce délai est une cible de départ |

Catégories (H2), tirées des produits cités par le contexte :

| Code | Libellé |
|---|---|
| `figurines` | Figurines |
| `jeux-de-societe` | Jeux de société |
| `bd` | Bandes dessinées |
| `dvd-blu-ray` | DVD et Blu-ray |
| `fanzines` | Fanzines |
| `autres` | Autres goodies |

## 4. Exigences non fonctionnelles

| # | Exigence | Source | Réponse de l'architecture | Preuve prévue |
|---|---|---|---|---|
| ENF-01 | Sécurité forte : l'espace communautaire est réservé aux utilisateurs authentifiés, chaque action est limitée par le rôle, les échanges sont chiffrés | Contexte | Keycloak, rôles vérifiés dans chaque service, HTTPS, contrôles du pipeline | Tests des critères CA-01, CA-02, CA-10, CA-18 (étape 5) ; analyses du pipeline (étape 6) |
| ENF-02 | Hébergement en Europe | Contexte | Machine virtuelle en Europe (fiche 0003) | Déploiement (étape 7) |
| ENF-03 | Interface fluide, ergonomique, conforme au RGAA | Contexte | Hors prototype : le prototype est une API. Traité dans la stratégie de tests | — |
| ENF-04 | Performance : 95 % des publications répondent en moins de 500 ms à la charge nominale (indicateur I2) | Processus de développement | Services sans état, traitement des notifications hors de la requête | Test de charge (étape 7) |
| ENF-05 | Disponibilité : au moins 99 % de requêtes réussies sous charge (I4) ; une panne du service notifications n'empêche pas de publier | Consignes, processus | Les services ne communiquent que par le broker ; plusieurs pods ; sondes | CA-15 (étape 5) ; test de charge (étape 7) |
| ENF-06 | Montée en charge : le nombre de pods suit la charge | Consignes | Mise à l'échelle automatique (HPA) | Test de charge (étape 7) |
| ENF-07 | Évolutivité : accueillir les enchères et la diffusion vidéo sans refonte | Contexte (v2, v3) | Services indépendants ; un nouvel abonné se branche sur les événements sans toucher à l'émetteur | Architecture, paragraphe 11 |
| ENF-08 | Maintenabilité : un code homogène, à la portée de développeurs juniors ; dette ≤ 5 % sur le nouveau code (I3) | Contexte (équipe), processus | NestJS, même structure dans les deux services, quality gate | Pipeline (étape 6) |
| ENF-09 | Données personnelles : ne conserver que le nécessaire (RGPD) | Ajoutée : cohérente avec une plateforme commerciale qui gère des comptes | Les services ne stockent que l'identifiant technique du membre ; nom et courriel restent dans Keycloak | Modèle de données |

## 5. Backlog de la fonctionnalité

Fonctionnalité du prototype (fiche 0001) : un membre publie une annonce de troc ou de don ; les membres dont les centres d'intérêt correspondent sont notifiés.

### 5.1 Vue d'ensemble

Les stories sont numérotées dans l'ordre de réalisation.

| # | User story | Rôle | Service | Priorité | Exigences |
|---|---|---|---|---|---|
| US-01 | Publier une annonce | Membre | annonces | Indispensable | EF-06 |
| US-02 | Déclarer mes centres d'intérêt | Membre | notifications | Indispensable | EF-07, EF-10 |
| US-03 | Consulter mes notifications | Membre | notifications | Indispensable | EF-07, EF-10 |
| US-04 | Être notifié d'une annonce qui m'intéresse | Membre | les deux, par le broker | Indispensable | EF-07 |
| US-05 | Consulter les annonces publiées | Membre | annonces | Importante | EF-06 |
| US-06 | Retirer une annonce | Modérateur | annonces | Importante | EF-09 |

Les quatre premières forment la chaîne complète de la fiche 0001. Les deux dernières démontrent l'autorisation par rôle.

### 5.2 Critères communs à toutes les stories

| # | Étant donné | Quand | Alors | Test |
|---|---|---|---|---|
| CA-01 | Un appel sans jeton, ou avec un jeton expiré ou falsifié | Il vise n'importe quelle route de l'API | La réponse est 401 ; aucune donnée n'est lue ni modifiée | Intégration, une fois par route |
| CA-02 | Un utilisateur authentifié qui n'a pas le rôle exigé par la route | Il appelle cette route | La réponse est 403 ; aucune donnée n'est lue ni modifiée | Intégration, une fois par route |
| CA-03 | Une requête qui provoque une erreur : donnée invalide, ressource absente | Le service répond | La réponse porte un code HTTP et un message lisible, sans chemin de fichier, requête SQL ni trace d'exécution | Intégration |

Codes HTTP : 401 signifie « non authentifié », 403 « authentifié mais non autorisé », 400 « requête invalide », 404 « ressource absente ».

### 5.3 US-01 — Publier une annonce

En tant que membre, je veux publier une annonce de troc ou de don, afin de proposer un article aux autres membres.

Une annonce porte un titre (3 à 100 caractères), une description (10 à 2 000 caractères), une catégorie de la liste fermée et un type : `troc` ou `don`.

| # | Étant donné | Quand | Alors | Test |
|---|---|---|---|---|
| CA-04 | Un membre authentifié | Il publie une annonce valide | La réponse est 201. L'annonce est enregistrée au statut « publiée », avec ce membre pour auteur et la date de publication | Intégration |
| CA-05 | Un membre authentifié | Il publie une annonce invalide : titre vide ou trop long, catégorie ou type inconnus, champ non prévu | La réponse est 400 et nomme les champs en erreur. Aucune annonce n'est enregistrée, aucun événement n'est émis | Intégration |
| CA-06 | Un membre authentifié | Il publie une annonce valide | Un événement `annonce.publiee` est émis. Il porte l'identifiant, le titre, la catégorie, le type et l'auteur de l'annonce | Intégration, avec un broker réel |

### 5.4 US-02 — Déclarer mes centres d'intérêt

En tant que membre, je veux choisir les catégories qui m'intéressent, afin de n'être notifié que des annonces qui me concernent.

| # | Étant donné | Quand | Alors | Test |
|---|---|---|---|---|
| CA-07 | Un membre authentifié | Il enregistre une liste de catégories valides | La réponse est 200. La nouvelle liste remplace l'ancienne, et il la retrouve en la consultant | Intégration |
| CA-08 | Un membre qui a déjà une liste | Il envoie une liste qui contient une catégorie inconnue | La réponse est 400. L'ancienne liste est conservée | Intégration |

### 5.5 US-03 — Consulter mes notifications

En tant que membre, je veux consulter mes notifications, afin de voir les annonces qui correspondent à mes centres d'intérêt.

| # | Étant donné | Quand | Alors | Test |
|---|---|---|---|---|
| CA-09 | Un membre qui a reçu des notifications | Il consulte ses notifications | La réponse est 200. La liste va de la plus récente à la plus ancienne. Chaque notification porte l'identifiant, le titre, la catégorie et le type de l'annonce, et sa date | Intégration |
| CA-10 | Deux membres qui ont chacun des notifications | L'un des deux consulte ses notifications | Il ne voit aucune notification de l'autre. Aucun paramètre de la requête ne permet de choisir le membre : l'identité vient du jeton | Intégration |

### 5.6 US-04 — Être notifié d'une annonce qui m'intéresse

En tant que membre, je veux recevoir une notification quand une annonce correspond à l'un de mes centres d'intérêt, afin de ne pas manquer un article.

| # | Étant donné | Quand | Alors | Test |
|---|---|---|---|---|
| CA-11 | Le membre B a choisi la catégorie « figurines » | Le membre A publie une annonce de cette catégorie | B trouve une notification pour cette annonce dans sa liste, en moins de 5 secondes | Acceptation |
| CA-12 | Le membre C n'a pas choisi cette catégorie | Le membre A publie la même annonce | C ne reçoit aucune notification | Acceptation |
| CA-13 | Le membre A a lui-même choisi la catégorie « figurines » | Il publie une annonce de cette catégorie | A ne reçoit pas de notification pour sa propre annonce | Acceptation |
| CA-14 | B a déjà une notification pour une annonce | Le même événement est remis une seconde fois au service notifications | B n'a toujours qu'une seule notification pour cette annonce | Intégration, avec un broker réel |
| CA-15 | Le service notifications est arrêté | Le membre A publie une annonce de la catégorie choisie par B | La publication réussit (201). Au redémarrage du service notifications, B reçoit sa notification | Acceptation : le test arrête puis relance le service |

Le critère CA-15 prouve que la communication entre les services est asynchrone : l'un fonctionne sans l'autre, et aucun message n'est perdu.

### 5.7 US-05 — Consulter les annonces publiées

En tant que membre, je veux consulter les annonces publiées, afin de trouver un article qui m'intéresse.

| # | Étant donné | Quand | Alors | Test |
|---|---|---|---|---|
| CA-16 | Des annonces publiées et des annonces retirées | Un membre ou un modérateur consulte la liste | La réponse est 200. Seules les annonces publiées apparaissent, de la plus récente à la plus ancienne, par pages de 20 au plus | Intégration |

### 5.8 US-06 — Retirer une annonce

En tant que modérateur, je veux retirer une annonce qui ne respecte pas les règles, afin de garder l'espace communautaire conforme.

| # | Étant donné | Quand | Alors | Test |
|---|---|---|---|---|
| CA-17 | Un modérateur authentifié et une annonce publiée | Il retire l'annonce | La réponse est 204. L'annonce passe au statut « retirée », avec la date du retrait et l'identifiant du modérateur. Elle n'apparaît plus dans la liste | Intégration |
| CA-18 | Un membre qui n'a pas le rôle `moderateur` | Il tente de retirer une annonce, même la sienne | La réponse est 403. L'annonce reste publiée | Intégration |
| CA-19 | Un modérateur authentifié | Il retire une annonce qui n'existe pas | La réponse est 404 | Intégration |

### 5.9 Définition de « fini »

Une user story est finie quand :

1. chacun de ses critères d'acceptation est prouvé par un test automatisé réussi, qui porte l'identifiant du critère ;
2. les critères communs CA-01 à CA-03 sont vérifiés sur ses routes ;
3. le pipeline est vert, quality gate compris ;
4. la pull request a été relue.

L'indicateur I1 (taux de critères d'acceptation prouvés) se calcule sur les 19 critères de ce backlog.

### 5.10 Hors périmètre du backlog

| Sujet | Raison |
|---|---|
| Modifier ou retirer sa propre annonce | N'ajoute aucune preuve à l'architecture |
| Photos, recherche, filtres | Relèvent de l'interface et du stockage de fichiers |
| Prise de contact entre deux membres | C'est l'exigence EF-11 (chat) |
| Notification par courriel ou sur mobile | Hypothèse H3 |
| Notification selon la navigation | Exigence EF-08, seulement souhaitée |
| Marquer une notification comme lue | Confort d'usage, sans enjeu d'architecture |
| Retirer les notifications d'une annonce retirée | Demande un second événement ; noté dans les limites de l'architecture |
| Signaler une annonce au modérateur | Complète EF-09 ; le retrait suffit à démontrer le rôle |

## 6. Suite

L'[architecture technique](03-architecture.md) décrit comment ces stories sont réalisées. Les tests des critères d'acceptation sont écrits à l'étape 5, avant le code.
