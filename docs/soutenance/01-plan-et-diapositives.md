# Soutenance — Plan chronométré et contenu des diapositives

- Date : 16 novembre 2026
- Statut : en attente de validation
- Durée : 20 minutes de présentation, puis 15 minutes de questions
- Complété par : [démonstration](02-demonstration.md), [questions du jury](03-questions-du-jury.md)

## 1. Parti pris

| Choix | Raison |
|---|---|
| Suivre les trois phases des consignes : processus, prototype, remédiation | Le jury retrouve sa grille dans l'ordre |
| Une diapositive, une idée, un visuel | La grille note la lisibilité des schémas et des tableaux, pas la forme du support |
| Chaque chiffre affiché vient d'une exécution réelle | Le document source est cité sous chaque diapositive |
| Dire ce qui n'est pas fait | L'environnement distant n'est pas commandé : mieux vaut l'annoncer que le laisser découvrir |
| Vocabulaire technique, sans vulgarisation | Le jury est composé de spécialistes du développement |

Le support n'est pas monté ici : ce document donne le contenu exact de chaque diapositive. Je le monte moi-même dans l'outil de mon choix.

## 2. Plan chronométré

| # | Diapositive | Durée | Fin à | Critère de la grille | Points |
|---|---|---|---|---|---|
| 0 | Titre | 0 min 20 | 0 min 20 | — | — |
| 1 | Contexte et mission | 1 min 00 | 1 min 20 | — | — |
| 2 | Quatre indicateurs de qualité | 1 min 15 | 2 min 35 | Indicateurs et dette | 1 |
| 3 | Cycle DevSecOps et stratégie de tests | 1 min 15 | 3 min 50 | Processus de test | 2 |
| 4 | Pipeline CI/CD | 1 min 45 | 5 min 35 | Livraison continue | 3 |
| 5 | Compétences et formation | 0 min 45 | 6 min 20 | Compétences | 1 |
| 6 | Exigences et backlog | 0 min 45 | 7 min 05 | Fonctionnalité métier | 1 |
| 7 | Architecture technique | 1 min 45 | 8 min 50 | Points clés de l'architecture | 4 |
| 8 | Bac à sable | 1 min 10 | 10 min 00 | Protocole d'expérimentation | 2 |
| 9 | Prototype réalisé | 0 min 55 | 10 min 55 | Points clés ; bonnes pratiques de sécurité | — |
| 10 | Déploiement et disponibilité | 1 min 00 | 11 min 55 | Environnement, disponibilité | 2 |
| 11 | Démonstration en direct | 3 min 30 | 15 min 25 | Points clés ; fonctionnalité ; disponibilité | — |
| 12 | Montée en charge | 1 min 30 | 16 min 55 | Montée en charge | — |
| 13 | Audit de sécurité | 1 min 15 | 18 min 10 | Plan de remédiation | 2 |
| 14 | Plan de remédiation | 1 min 05 | 19 min 15 | Plan de remédiation | — |
| 15 | Bilan | 0 min 45 | 20 min 00 | — | — |

Les deux points d'oral (schémas lisibles, prestation fluide) portent sur l'ensemble.

Repères pour tenir le temps :

| Repère | Heure attendue | Si je suis en retard |
|---|---|---|
| Fin du pipeline (diapositive 4) | 5 min 35 | Réduire la diapositive 5 à une phrase : « un recrutement, une formation » |
| Avant le déploiement (diapositive 10) | 10 min 55 | Ne pas commenter le tableau de la diapositive 10 : il est repris par la démonstration |
| Fin de la démonstration | 15 min 25 | Sauter le navigateur à la fin de la démonstration |
| Avant le plan (diapositive 14) | 18 min 10 | Ne citer que les deux risques critiques |

Durées mesurées : la partie technique de la démonstration dure 14 à 16 secondes (trois répétitions du 16 novembre 2026). Tout le reste est de la parole : ces durées sont des cibles, à vérifier par deux répétitions chronométrées à voix haute.

## 3. Contenu des diapositives

### Diapositive 0 — Titre (0 min 20)

À l'écran :

- La Petite Maison de l'Épouvante — superviser et assurer le développement de la plateforme
- Prototype : annonces de troc et de don, notification des membres intéressés
- Nom, MAALSI, date

Je dis : « Je suis le lead developer de l'entreprise. Je présente le processus de développement, le prototype qui en prouve l'architecture, puis l'audit de sécurité et son plan de remédiation. »

### Diapositive 1 — Contexte et mission (1 min 00)

À l'écran :

| Élément | Contenu |
|---|---|
| Besoin | Remplacer un site vitrine par une plateforme de vente en ligne avec un espace communautaire |
| Contraintes | Hébergement en Europe ; sécurité forte ; RGAA ; enchères et diffusion vidéo en version 2 et 3 |
| Équipe | Un lead developer, deux développeurs juniors |
| Prototype | Une fonctionnalité : publier une annonce de troc ou de don, notifier les membres intéressés |

Je dis :

- Les consignes demandent une fonctionnalité, pas l'application.
- J'ai choisi celle-ci parce qu'elle exerce toute l'architecture : deux services, un échange asynchrone, une autorisation par rôle.
- La vente en ligne a été écartée : le paiement impose la norme PCI DSS, hors de portée d'un prototype.

Source : [cadrage](../01-cadrage.md), [fiche 0001](../adr/0001-fonctionnalite-metier.md).

### Diapositive 2 — Quatre indicateurs de qualité (1 min 15)

À l'écran :

| # | Caractéristique ISO 25010 | Indicateur | Seuil | Mesuré | Outil |
|---|---|---|---|---|---|
| I1 | Adéquation fonctionnelle | Critères d'acceptation prouvés par un test | 100 % | 19 sur 19 | Jest, Supertest |
| I2 | Performance | 95e centile d'une publication, à 50 utilisateurs | < 500 ms | 45 ms | k6 |
| I3 | Maintenabilité | Ratio de dette technique du nouveau code | ≤ 5 % | 0,0 % | SonarQube Cloud |
| I4 | Fiabilité | Requêtes réussies sous charge | ≥ 99 % | 100 % | k6 |

Je dis :

- Chaque indicateur a un seuil et une action : en dessous, la fusion ou la livraison est bloquée.
- C'est ce blocage qui empêche la dette de s'accumuler : un critère sans test, une dette au-dessus de 5 % ne passent pas dans `main`.
- Le 95e centile plutôt que la moyenne : il dit ce que vivent les utilisateurs les moins bien servis.
- Limite que l'audit a montrée : I3 mesure la dette du code, pas celle de l'architecture.

Source : [processus, paragraphe 2](../02-processus-developpement.md), [audit, paragraphe 4](../08-audit-et-remediation.md).

### Diapositive 3 — Cycle DevSecOps et stratégie de tests (1 min 15)

Visuel : [cycle-devsecops.png](../schemas/cycle-devsecops.png), sur les deux tiers de la diapositive.

À l'écran, à côté du schéma :

| Type de test | Outil | Tests réussis | Indicateur |
|---|---|---|---|
| Unitaire | Jest | 150 | I3, par la couverture |
| Intégration | Jest, Supertest, base et broker réels | 113 | I1, I4 |
| Acceptation | Jest, Supertest, Keycloak réel | 12 | I1 |
| Sécurité | Semgrep, Gitleaks, Trivy | À chaque pull request | — |
| Charge | k6 | Avant chaque livraison | I2, I4 |

Je dis :

- La sécurité est placée à chaque étape du cycle, le plus tôt possible : c'est le « shift-left ».
- Trois niveaux de tests, distingués par ce qui est lancé : une règle seule, un service avec sa vraie base et son vrai broker, puis les deux services ensemble.
- Les tests ont été écrits avant le code : l'historique Git garde un commit « rouge » avant chaque commit « vert ».
- Les rôles sont répartis : la maîtrise d'ouvrage approuve les critères d'acceptation et prononce la recette.

Source : [processus, paragraphes 3 et 5](../02-processus-developpement.md), [prototype, paragraphe 5](../05-developpement-poc.md).

### Diapositive 4 — Pipeline CI/CD (1 min 45)

Visuel : [pipeline-realise.png](../schemas/pipeline-realise.png), en pleine largeur.

À l'écran, sous le schéma :

- 10 jobs, tous bloquants, à chaque pull request et sur `main` ; 5 à 12 minutes
- Construire une fois : l'image scannée et testée est désignée par son empreinte
- Ce que le pipeline a bloqué : une couverture de 53 %, 12 constats de SonarQube Cloud, 6 vulnérabilités hautes dans l'image de base

Je dis :

- Trois temps tournent dans le pipeline : les contrôles du code en parallèle, l'image pour arm64 et amd64, puis les tests d'acceptation sur cette image.
- En gris, ce qui est fait à la main : le déploiement et le test de charge. Les exécuteurs de GitHub ne joignent pas mon poste, et l'environnement distant n'est pas commandé.
- Le pipeline a réellement bloqué : sur les deux pull requests du prototype, 7 exécutions sur 13 ont échoué, chaque fois sur un défaut réel, corrigé dans la même pull request.
- Un défaut placé exprès a montré une limite : Semgrep n'a pas vu une injection de commande. Un pipeline vert ne prouve pas l'absence de faille.
- `main` est protégée : même une correction de documentation passe par les 10 jobs.

Source : [pipeline](../06-pipeline-ci-cd.md), [schéma du pipeline réalisé](../schemas/pipeline-realise.md).

### Diapositive 5 — Compétences et formation (0 min 45)

À l'écran :

| Écart | Réponse |
|---|---|
| Personne ne sait exploiter Kubernetes ni l'observer | Recruter un ingénieur DevOps, 3 à 5 ans d'expérience |
| Les juniors ont des notions de sécurité applicative | Former : l'OWASP Top 10 appliqué à NestJS, 3 jours, évaluée à chaud et à froid |
| Les juniors ne sont pas autonomes en tests | Accompagner : binôme avec le lead, revue de chaque pull request |

Je dis :

- 13 compétences cartographiées sur quatre niveaux, avec une règle : un référent et une deuxième personne autonome par compétence critique.
- Un seul recrutement, sur un profil cohérent : conteneurs, orchestration, pipeline, supervision. Pas de « mouton à cinq pattes ».
- L'audit confirme ce choix : 19 jours du plan reviennent à ce profil.

Source : [compétences et formation](../02-competences-et-formation.md).

### Diapositive 6 — Exigences et backlog (0 min 45)

À l'écran :

| Élément | Nombre | Exemple |
|---|---|---|
| Exigences fonctionnelles reformulées | 15 | EF-07 : un membre est notifié quand un article correspond à ses centres d'intérêt |
| Exigences non fonctionnelles | 9 | ENF-05 : une panne du service notifications n'empêche pas de publier |
| User stories | 6 | US-04 : être notifié d'une annonce qui m'intéresse |
| Critères d'acceptation | 19 | CA-11 : le membre B est notifié en moins de 5 secondes |

Je dis :

- Chaque critère est écrit en « Étant donné, quand, alors », et chaque test porte l'identifiant du critère qu'il prouve.
- Le contexte laissait des points ouverts : cinq hypothèses sont écrites, à faire valider par la maîtrise d'ouvrage.

Source : [exigences et backlog](../03-exigences-et-backlog.md).

### Diapositive 7 — Architecture technique (1 min 45)

Visuel : [architecture-technique.png](../schemas/architecture-technique.png), en pleine diapositive.

Je dis, en suivant les flèches numérotées du schéma :

- Un seul point d'entrée, Traefik, qui termine le HTTPS. Le certificat est émis par cert-manager.
- Keycloak délivre un jeton signé. Chaque service vérifie lui-même la signature, le destinataire et le rôle : un service joint depuis l'intérieur du cluster ne fait confiance à personne.
- Les deux services ne s'appellent jamais. Le service annonces émet l'événement `annonce.publiee` sur RabbitMQ ; le service notifications le consomme.
- Conséquence : publier ne dépend pas du service notifications. Et un futur service d'enchères s'abonnera au même événement sans toucher à l'émetteur.
- Une base et un compte par service : aucun service ne lit les données de l'autre.

Choix à défendre si le jury le demande : RabbitMQ plutôt que Kafka (mémoire, prototype sur 8 Go) ; une instance PostgreSQL pour deux bases (la cible est une instance par service) ; vérification du jeton dans chaque service plutôt qu'au point d'entrée.

Source : [architecture](../03-architecture.md), fiches [0007](../adr/0007-broker-de-messages.md), [0008](../adr/0008-persistance.md), [0009](../adr/0009-authentification-et-autorisation.md).

### Diapositive 8 — Bac à sable (1 min 10)

À l'écran :

| Expérimentation | Interactions testées | Contrôles réussis | Décision |
|---|---|---|---|
| RabbitMQ sur Kubernetes | Producteur, broker, consommateur ; stockage | 10 sur 10 | Adopter |
| Ingress HTTPS : Traefik et cert-manager | Émission du certificat, redirection | 12 sur 12 | Adopter |
| Keycloak : jeton, rôles, vérification | Keycloak, PostgreSQL, Ingress, service | 18 sur 18 | Adopter |

Je dis :

- Trois technologies critiques éprouvées avant d'écrire le prototype, chacune rejouable par un script.
- L'intérêt est dans les difficultés : sept, toutes résolues. Quatre auraient cassé le prototype plus tard.
- Exemple : un pod Node.js mettait 30 secondes à s'arrêter et continuait de consommer des messages. La règle « traiter le signal d'arrêt » vient de là.
- La mémoire a été mesurée : le nœud consomme 2 043 Mio pour 921 Mio de pods. C'est ce qui a dimensionné la suite.

Source : [synthèse du bac à sable](../experimentations/README.md).

### Diapositive 9 — Prototype réalisé (0 min 55)

À l'écran :

| Point clé de l'architecture | Preuve |
|---|---|
| Découpage | Deux services, deux bases, deux comptes ; aucun import d'un service vers l'autre |
| Communication entre services | Événement lu sur le broker réel ; traitement idempotent ; message remis après une panne de l'abonné |
| Sécurité | 47 tests de refus d'accès ; cinq bonnes pratiques prouvées |
| Fonctionnalité | 19 critères d'acceptation sur 19 |

Je dis :

- Même structure en couches dans les deux services : les règles métier se testent sans base ni broker.
- Les cinq bonnes pratiques de sécurité : authentification déléguée à Keycloak, validation des entrées par liste blanche, aucun secret dans le code, échanges chiffrés, moindre privilège.
- Un test qui réussit ne prouve rien si l'on n'a pas vérifié ce qu'il exécute : un défaut placé exprès a bien fait échouer le test attendu.

Source : [prototype, paragraphes 6, 8 et 9](../05-developpement-poc.md).

### Diapositive 10 — Déploiement et disponibilité (1 min 00)

À l'écran :

| Besoin | Réponse sur Kubernetes | Preuve |
|---|---|---|
| Disponibilité | 2 à 4 pods par service ; trois sondes | Perte d'un pod : 400 appels, aucune erreur |
| Mise à jour sans coupure | Remplacement progressif | 382 appels pendant la mise à jour, tous servis |
| Montée en charge | HPA : cible à 70 % du processeur réservé | Diapositive 12 |
| Cloisonnement | 6 règles réseau : tout fermé, puis un flux à la fois | 7 flux interdits refusés |
| Moindre privilège | Conteneurs non root, lecture seule, niveau `restricted` | Un pod privilégié est refusé |

Je dis :

- Le déploiement est un script rejouable, et 49 contrôles automatiques le vérifient.
- Ce qui n'est pas fait : l'environnement distant. Le prototype tourne sur k3d, sur mon poste. Les manifestes sont assemblés par Kustomize pour que la variante distante n'ait à changer que les noms d'hôte et l'émetteur de certificats.
- Je vous montre le prototype déployé.

Source : [déploiement, paragraphes 4 à 6](../07-deploiement-observabilite-charge.md).

### Diapositive 11 — Démonstration en direct (3 min 30)

À l'écran : le terminal, en plein écran. Déroulé et paroles dans le [script de démonstration](02-demonstration.md).

| Temps | Ce que le jury voit |
|---|---|
| 1 | Deux pods par service, mise à l'échelle prête |
| 2 | HTTP redirigé vers HTTPS ; 401 sans jeton |
| 3 | Jeton de Keycloak : émetteur, destinataire, rôle, 120 secondes |
| 4 à 6 | Le membre B déclare un centre d'intérêt ; le membre A publie ; B est notifié |
| 7 | Un membre ne retire pas l'annonce (403) ; le modérateur si (204) |
| 8 | Un pod supprimé : 40 appels, aucun en erreur |

En cas de panne : la vidéo de secours, puis les questions.

### Diapositive 12 — Montée en charge (1 min 30)

Visuel : [charge-50-200-pods-et-hpa.png](../captures/charge-50-200-pods-et-hpa.png) et [charge-50-200-i2-temps-de-reponse.png](../captures/charge-50-200-i2-temps-de-reponse.png), côte à côte.

À l'écran, sous les captures :

| Mesure | 50 utilisateurs | 200 utilisateurs | Retour à 50 |
|---|---|---|---|
| 95e centile d'une publication | 45 ms | 3,17 s | 989 ms |
| Requêtes en échec | 0,00 % | 0,02 % | 11,19 % |
| Pods prêts par service | 2 | 2 | 3, puis 4 |

Je dis :

- Test de charge avec k6, à travers l'Ingress, en HTTPS, avec de vrais jetons : 41 884 requêtes en 13 minutes.
- À la charge nominale, les deux indicateurs sont tenus avec le minimum de pods.
- En pointe, le HPA réagit comme réglé : il demande un pod de plus dès 92 % de processeur. Mais sur un nœud saturé, ce pod met 6 minutes à être prêt.
- Ces mesures viennent d'un poste de 8 Go : elles valent pour la charge nominale. La pointe est à rejouer sur l'environnement distant.
- Le premier essai a fait tomber le nœud. Je l'ai gardé : il dit où est la limite, et il a donné la correction du HPA.

Source : [déploiement, paragraphe 8](../07-deploiement-observabilite-charge.md), [captures](../captures/README.md).

### Diapositive 13 — Audit de sécurité (1 min 15)

À l'écran : la matrice des risques.

| Impact \ Probabilité | Faible | Moyenne | Élevée |
|---|---|---|---|
| Élevé | 5 risques modérés | 8 risques élevés | 2 risques critiques |
| Modéré | 1 risque faible | 10 risques modérés | 6 risques élevés |
| Faible | 1 risque faible | 2 risques faibles | — |

Sous la matrice :

- Critique, première version : aucune limitation de débit à l'entrée ; la plateforme sature en pointe
- Critique, parc existant : le site vitrine sur CMS, seul composant ouvert à tout Internet, tenu par un seul technicien

Je dis :

- Méthode du cours : ISO 27005. Un actif, une menace, une vulnérabilité, puis un niveau tiré de la probabilité et de l'impact.
- Tous les contrôles automatiques sont verts, et l'audit relève pourtant 23 constats sur la première version : les contrôles ne prouvent que ce qu'ils regardent.
- Exemple : l'image de PostgreSQL porte 1 vulnérabilité critique et 25 hautes, et ni le pipeline ni le scan de nuit ne la regardaient.
- Le parc existant est fictif : ses 12 risques sont déduits des faits du contexte, et ce qu'il ne dit pas est marqué « à vérifier ».

Source : [audit, paragraphes 5 à 7](../08-audit-et-remediation.md).

### Diapositive 14 — Plan de remédiation (1 min 05)

À l'écran :

| Priorité | Risque | Action | Effort | Échéance |
|---|---|---|---|---|
| 1 | Saturation en pointe | Rejouer la pointe sur l'environnement distant ; borner les connexions à la base | 2,5 j | Avant la soutenance |
| 1 | Saturation en pointe | Limiter le débit au point d'entrée | 2 j | Avant la mise en production |
| 1 | Site vitrine | Inventaire du parc ; mise à jour du CMS, second facteur | 7 j | Sans attendre la plateforme |
| 1 | Site vitrine | Le retirer à l'ouverture de la plateforme | 3 j | À la mise en production |
| 2 | Comptes, sauvegardes | Second facteur partout ; copie hors site, restauration testée | 7 j | Sans attendre la plateforme |

Je dis :

- 36 actions, classées par niveau de risque, chacune avec sa justification, son effort et son échéance.
- Le traitement n'est pas toujours « réduire » : le site vitrine sera retiré, c'est « éviter ». Certains risques sont acceptés par écrit, avec une date de révision.
- La mise en production coûte une soixantaine de jours de travail, dont 19 pour l'ingénieur DevOps.
- Le plan relie le projet au parc : le serveur d'identité de la plateforme peut devenir l'authentification unique des applications internes.

Source : [audit, paragraphe 8](../08-audit-et-remediation.md).

### Diapositive 15 — Bilan (0 min 45)

À l'écran :

| Prouvé | Pas encore prouvé |
|---|---|
| 19 critères d'acceptation sur 19, par des tests | Environnement distant, hébergé en Europe |
| Pipeline de 10 jobs bloquants, `main` protégée | Certificat d'une autorité publique |
| Déploiement Kubernetes rejouable, HTTPS, 49 contrôles | Déploiement par le pipeline |
| Disponibilité : perte d'un pod, mise à jour sans coupure | Pointe de charge sur la cible |
| Indicateurs tenus à la charge nominale | Test dynamique de sécurité |

Je dis :

- Trois leçons. Un contrôle ne prouve que ce qu'il regarde. Mesurer perturbe. Un test de charge révèle ce qu'aucun analyseur ne voit.
- La suite est dans le plan : l'environnement distant d'abord, parce qu'il lève quatre des cinq lignes de droite.

## 4. Correspondance avec la grille

| Critère | Points | Diapositives | Preuve montrée |
|---|---|---|---|
| Protocole du bac à sable | 2 | 8 | Trois protocoles, 40 contrôles, sept difficultés |
| Le prototype valide les points clés de l'architecture | 4 | 7, 9, 10, 11 | Schéma, tableau des points clés, démonstration |
| La fonctionnalité répond au besoin | 1 | 6, 11 | 19 critères ; chaîne jouée en direct |
| Livraison continue schématisée, intégrée au prototype | 3 | 4 | Schéma du pipeline réalisé |
| Compétences et formation | 1 | 5 | Écarts, recrutement, formation |
| Environnement managé, disponibilité, montée en charge | 2 | 10, 11, 12 | Perte d'un pod en direct ; captures de la charge. L'environnement managé n'est pas réalisé : dit à la diapositive 10 |
| Quatre indicateurs et dette | 1 | 2 | Tableau des indicateurs |
| Processus de test, deux types appliqués | 2 | 3, 4 | Trois niveaux, 275 tests |
| Plan de remédiation ; deux bonnes pratiques de sécurité | 2 | 9, 13, 14 | Matrice, plan, cinq pratiques |
| Schémas et tableaux lisibles | 1 | 3, 4, 7, 12, 13 | Quatre schémas, deux captures |
| Prestation fluide, vocabulaire précis | 1 | Toutes | Deux répétitions chronométrées |
