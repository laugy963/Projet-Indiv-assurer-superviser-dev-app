# Étape 8 — Audit de sécurité et plan de remédiation

- Date : 16 novembre 2026
- Statut : validé le 16 novembre 2026
- Références : [analyse de risques de l'étape 3](03-architecture.md#83-analyse-de-risques), [limites du prototype](05-developpement-poc.md), [limites du pipeline](06-pipeline-ci-cd.md), [test de charge et limites du déploiement](07-deploiement-observabilite-charge.md)
- Fichiers : [audit.sh](../tests/securite/audit.sh), [analyses.sh](../tests/securite/analyses.sh)
- Preuve : [audit-securite.txt](../tests/resultats/audit-securite.txt), inventaire de sécurité rejoué le 16 novembre 2026 ; [pull request n° 5](https://github.com/laugy963/Projet-Indiv-assurer-superviser-dev-app/pull/5)
- Décision prise à cette étape : aucune fiche. L'audit ne change pas l'architecture ; chaque changement proposé est une action du plan, à décider à son échéance

## 1. Objet

Ce document répond à la phase 3 des consignes : analyser les résultats des tests, des scans et des métriques, identifier les vulnérabilités de la première version et du parc applicatif existant, puis proposer un plan de remédiation priorisé.

Résultat, en quatre points :

1. Les contrôles automatiques sont verts : aucun secret, aucun constat d'analyse statique, aucune vulnérabilité haute ou critique dans le code et les images des deux services. Les indicateurs I1 à I4 sont tenus à la charge nominale.
2. L'audit relève pourtant 23 constats sur la première version. Un est critique : rien ne limite le débit à l'entrée, et la plateforme sature à quatre fois sa charge nominale. Six sont élevés. Ils viennent du test de charge, de la relecture des manifestes et de ce que le pipeline ne regarde pas : les images tierces.
3. Le parc existant de l'entreprise porte 12 risques, déduits du contexte. Un est critique : le site vitrine, seul composant ouvert à tout Internet, tenu par un seul technicien. Huit sont élevés.
4. Le plan compte 36 actions, classées par niveau de risque, chacune avec sa justification, son effort et son échéance. Six actions sur le prototype sont à ma portée avant la soutenance.

Ce qui n'est pas mesuré est dit comme tel : le parc existant est fictif et n'a pas pu être scanné, aucun test dynamique n'a été lancé, et la pointe de charge n'a été mesurée que sur un poste de 8 Go (paragraphe 12).

## 2. Paramètres fixés à cette étape

Quatre paramètres n'étaient fixés par aucun document. Choix du 16 novembre 2026.

| Paramètre | Choix | Alternative écartée | Conséquence |
|---|---|---|---|
| Périmètre | Audit et plan seuls : le prototype n'est pas modifié | Corriger dans la même étape les constats peu coûteux | Les constats restent ouverts, mais planifiés. La grille note le plan ; les corrections rapides sont datées « avant la soutenance » |
| Mesures nouvelles | Rejouer les contrôles du dépôt, sans cluster, et y ajouter les images tierces | Y ajouter un test dynamique (OWASP ZAP) sur le prototype déployé | Le test dynamique reste une action du plan. Le poste de 8 Go n'est pas mis en risque une troisième fois |
| Parc existant | Risques déduits des faits du contexte ; ce qu'il ne dit pas est marqué « à vérifier » | Enrichir le scénario d'hypothèses (nom du CMS, versions) | Aucun fait inventé. La première action du plan est un inventaire |
| Échéances | Par jalons | Dates calendaires, à partir d'une date de mise en production supposée | Le contexte ne donne aucune date : le plan donne un ordre et des dépendances, pas un calendrier |

## 3. Méthode

### 3.1 Démarche

La démarche est celle du cours de sécurité : la gestion des risques de la norme ISO 27005 (norme qui décrit comment identifier, évaluer et traiter les risques d'un système d'information).

| # | Étape | Dans ce document |
|---|---|---|
| 1 | Identifier les actifs : ce qui a de la valeur | Le prototype et ses données (paragraphe 5) ; les applications et les données de l'entreprise (paragraphe 6) |
| 2 | Analyser les menaces et les vulnérabilités | Résultats des tests, des scans et des métriques (paragraphe 4) ; relecture du code et des manifestes ; faits du contexte |
| 3 | Évaluer : combiner la probabilité et l'impact | Matrice du paragraphe 3.2 ; synthèse au paragraphe 7 |
| 4 | Traiter : réduire, éviter, transférer ou accepter | Plan de remédiation (paragraphe 8) |
| 5 | Suivre et réviser | Suivi du plan (paragraphe 8.7) |

Vocabulaire :

- Risque : une menace exploite une vulnérabilité et cause un impact sur un actif.
- Constat : une vulnérabilité relevée par l'audit, avec sa preuve.
- CVE : identifiant public d'une vulnérabilité connue d'un logiciel. CVSS : note de gravité d'une CVE, de 0 à 10 ; Trivy la traduit en quatre classes, de « basse » à « critique ».
- OWASP Top 10 : liste des dix familles de failles les plus courantes des applications web. L'édition en vigueur est celle de 2025 (site de l'OWASP, consulté le 16 novembre 2026). Elle sert de liste de contrôle au paragraphe 5.3.

La gravité donnée par un outil et le niveau de risque ne sont pas la même chose. Le CVSS note la faille seule. Le niveau de risque tient compte du contexte : la faille est-elle atteignable, et que perd-on ? Une vulnérabilité « critique » dans un programme qui ne s'exécute jamais pèse moins qu'une vulnérabilité « moyenne » sur une route ouverte à tous.

### 3.2 Échelles et matrice

Ce sont les échelles de l'analyse de l'étape 3, pour que les niveaux se comparent.

| Probabilité | Critère |
|---|---|
| Faible | Demande un accès déjà obtenu au cluster ou un concours de circonstances ; jamais observé |
| Moyenne | À la portée d'un utilisateur authentifié, ou déclenché par un événement prévisible (panne, pointe). C'est aussi la valeur retenue quand l'information manque |
| Élevée | Déjà observé pendant les tests ; ou exposé à tout Internet sans protection ; ou vulnérabilité publiée et non suivie |

| Impact | Critère |
|---|---|
| Faible | Gêne ; ni arrêt, ni perte de données |
| Modéré | Service dégradé ou arrêt court ; perte limitée (une notification, une vente) ; données non sensibles |
| Élevé | Arrêt prolongé de la plateforme ; perte ou fuite de données personnelles ou de paiement ; atteinte à l'image ; sanction au titre du RGPD (règlement européen sur la protection des données personnelles) |

Matrice du cours :

| Impact \ Probabilité | Faible | Moyenne | Élevée |
|---|---|---|---|
| Élevé | Modéré | Élevé | Critique |
| Modéré | Faible | Modéré | Élevé |
| Faible | Faible | Faible | Modéré |

Règle de priorité du cours : les risques critiques et élevés demandent un traitement immédiat ; les risques modérés se traitent à moyen terme.

### 3.3 Sources analysées

| Source | Date | Contenu |
|---|---|---|
| Tests unitaires, d'intégration et d'acceptation | 13 au 16 novembre 2026 | 150, 113 et 12 tests réussis ; rejoués par le pipeline à chaque pull request |
| SonarQube Cloud, branche `main` | 16 novembre | Analyse du commit `ed00682` |
| Inventaire de sécurité (`tests/securite/audit.sh`) | 16 novembre, 10 h 23 | Gitleaks, Semgrep, Trivy sur les dépendances, les manifestes, les images des services et les images tierces ; `npm audit` |
| Vérification du déploiement | 15 novembre | 49 contrôles sur le cluster |
| Test de charge, trois exécutions | 15 novembre | Indicateurs I2 et I4, mise à l'échelle, cinq défauts |
| Réglages du dépôt GitHub | 16 novembre | Protection de `main`, alertes, exécutions du scan planifié, lus par l'API |
| Relecture du code, des manifestes et du royaume Keycloak | 16 novembre | Points renvoyés à l'audit par les étapes 5 à 7 |
| Journal de bord | 10 au 16 novembre | Incidents et corrections |
| Contexte de l'entreprise | Version du 6 mars 2025 | Seule source sur le parc existant |

## 4. Analyse des résultats

### 4.1 Tests et indicateur I1

| Mesure | Valeur | Lecture pour l'audit |
|---|---|---|
| I1 : critères d'acceptation prouvés | 19 sur 19, soit 100 % | La fonctionnalité fait ce que le backlog demande |
| Tests de contrôle d'accès (CA-01, CA-02) | 47 : 40 refus faute de jeton valide, 7 faute du rôle, sur les six routes | Le risque R1 de l'étape 3 est couvert par des preuves |
| Tests de validation des entrées (CA-05, CA-08) | 17 | Liste blanche prouvée, événement du broker compris |
| Cloisonnement entre membres (CA-10) | 5 | L'identité vient du jeton, jamais de la requête |

Ce que les tests ne prouvent pas, relevé à l'étape 5 et toujours vrai :

| Angle mort | Conséquence |
|---|---|
| Jeton expiré ou falsifié : testé avec l'émetteur de jetons de test, pas avec Keycloak | La garde est prouvée, sa liaison à Keycloak ne l'est que pour deux cas |
| Changement des clés de signature de Keycloak : jamais testé | Comportement inconnu le jour où les clés changent |
| Panne de la base pendant le traitement d'un message : test unitaire seulement | Le test de charge a montré le cas réel (constat C6) |

### 4.2 Qualité du code et indicateur I3

Mesures de SonarQube Cloud sur `main`, le 16 novembre 2026.

| Mesure | Valeur | Seuil | Verdict |
|---|---|---|---|
| I3 : ratio de dette technique | 0,0 % | ≤ 5 % | Tenu |
| Bugs, vulnérabilités, défauts de maintenabilité | 0, 0, 0 | Note A | Tenu |
| Points sensibles de sécurité à relire | 0 | 100 % relus | Tenu |
| Couverture | 92,5 % (lignes 98,9 %, branches 80,8 %) | ≥ 80 % | Tenu |
| Duplication | 0,0 % | ≤ 3 % | Tenu |
| Volume | 5 369 lignes | — | — |

Lecture : I3 mesure la dette du code, et elle est nulle. Il ne mesure pas la dette d'architecture ni la dette d'exploitation : une base sans sauvegarde ou un point d'entrée sans limite de débit ne sont pas des lignes de code. Cette dette-là est l'objet des paragraphes 5 et 8.

### 4.3 Contrôles de sécurité

Inventaire rejoué le 16 novembre 2026 par `tests/securite/audit.sh`. Le pipeline bloque sur « haute ou critique, avec correctif » ; l'audit compte tout, toutes gravités, avec ou sans correctif.

| Contrôle | Étapes 6 et 7 | 16 novembre | Lecture |
|---|---|---|---|
| Gitleaks, tout l'historique | 45 commits, aucun secret | 54 commits, aucun secret | Tenu |
| Semgrep | 266 règles, 220 fichiers, aucun constat | 266 règles, 224 fichiers, aucun constat ; 48 fichiers écartés par défaut | Tenu, avec un angle mort (constat C15) |
| Trivy, dépendances | 4 moyennes | 4 moyennes : `glob` et `minimatch`, dépendances de développement | Sous le seuil ; constat C14 |
| `npm audit` | 28 : 4 faibles, 24 modérées | Identique ; 0 en production | Constat C14 |
| Trivy, images des services, 4 variantes | 1 moyenne | 1 moyenne par variante : `zlib`, CVE-2026-4738, corrigée dans la version 1.4 | Sous le seuil ; constat C12 |
| Trivy, manifestes | 3 constats hauts | 28 contrôles en échec sur 1 116 : 3 hauts, 6 moyens, 19 faibles | Hors pipeline ; constats C15 et C21 |
| Trivy, `postgres:18.7-alpine` | 1 critique, 25 hautes | Identique : 62 vulnérabilités, toutes dans l'utilitaire `gosu`, toutes corrigées en amont | Constat C10 |
| Trivy, Keycloak 26.8.2 | « 1 haute » | 6 hautes : 1 avec correctif (`guava`), 5 sans ; 27 moyennes, 27 faibles | Constat C10 |
| Trivy, RabbitMQ 4.4.0 | Aucune haute ni critique | 1 moyenne (`zlib`) | — |

Trois précisions :

- Keycloak. Le chiffre de l'étape 6, « 1 haute », ne comptait que les vulnérabilités qui ont un correctif : c'est la politique du pipeline. L'inventaire complet du 14 novembre en comptait 7 ; il en compte 6 le 16 novembre, l'une d'elles ayant disparu de la base de Trivy entre-temps. Cinq sont dans l'image de base de l'éditeur : 4 dans `sqlite-libs`, 1 dans OpenJDK, que l'éditeur ne corrigera pas.
- PostgreSQL. `gosu` sert à quitter le compte root au démarrage du conteneur. Le point d'entrée de l'image ne l'appelle que si le conteneur démarre en root (lu dans l'image). Sur le cluster, PostgreSQL démarre sous l'utilisateur 70 : `gosu` est présent, mais il n'est pas exécuté.
- Manifestes. Les 5 constats faibles « espace de noms par défaut » sont des faux positifs : l'espace de noms `epouvante` est posé par Kustomize, que l'analyse des fichiers bruts ne voit pas.

Réglages du dépôt, lus par l'API de GitHub le 16 novembre :

| Réglage | État |
|---|---|
| Protection de `main` | Pull request obligatoire, 10 contrôles exigés, branche à jour, règle appliquée à l'administrateur ; 0 approbation exigée ; signature des commits non exigée |
| Détection de secrets par GitHub, blocage au push | Activés ; aucune alerte |
| Alertes Dependabot (alertes de GitHub sur les dépendances vulnérables) | Désactivées |
| Scan planifié, prévu à 3 h 23 UTC | Le 15 novembre : déclenché à 11 h 13 UTC, soit 7 h 50 de retard. Le 16 novembre : déclenché à 11 h 44 UTC, soit 8 h 21 de retard |

La documentation de GitHub, consultée le 16 novembre, prévient qu'un workflow planifié peut être retardé ou abandonné quand la charge est forte, et qu'il est désactivé après 60 jours sans activité sur un dépôt public.

### 4.4 Métriques, test de charge, indicateurs I2 et I4

| Indicateur | Seuil | Charge nominale, 50 utilisateurs | Pointe, 200 utilisateurs | Retour à 50 |
|---|---|---|---|---|
| I2 : 95e centile d'une publication | < 500 ms | 45 ms | 3,17 s | 989 ms |
| I4 : requêtes réussies | ≥ 99 % | 100 % | 99,98 % | 88,8 % |
| Délai de notification, 95e centile | < 5 s | 212 ms | 7,0 s | 3,1 s |

Les consignes demandent d'identifier les vulnérabilités à partir du test de charge. Chacun de ses cinq défauts devient un constat :

| Défaut du test de charge (étape 7, paragraphe 8.8) | Constat |
|---|---|
| 1. La mise à l'échelle arrive trop tard : 6 minutes pour un pod | C3 |
| 2. Le nombre de connexions à PostgreSQL n'est borné nulle part | C2 |
| 3. Un nœud déclaré indisponible une minute : 84 erreurs 500 | C4, C6 |
| 4. Un événement en échec deux fois n'est jamais repris | C7 |
| 5. Les journaux d'un pod retiré sont perdus | C8 |

Le test de charge ajoute un sixième enseignement, le plus lourd : à 200 utilisateurs le poste sature, et rien à l'entrée ne retient la charge. La disponibilité est une propriété de sécurité au même titre que la confidentialité : saturer un service est une attaque. C'est le constat C1.

Réserve : ces mesures viennent d'un poste de 8 Go où le générateur de charge et le cluster partagent les mêmes cœurs. Elles valent pour la charge nominale. La pointe est à rejouer sur l'environnement distant (action A1).

### 4.5 Ce que les contrôles ne voient pas

| Angle mort | Preuve |
|---|---|
| Les images tierces : PostgreSQL, RabbitMQ, Keycloak | Ni le pipeline ni le scan planifié ne les analysent. L'inventaire y trouve 1 vulnérabilité critique et 31 hautes |
| L'application en marche | Aucun test dynamique. Les en-têtes HTTP n'ont jamais été examinés |
| Les manifestes | Analysés sur le poste, pas dans le pipeline |
| Le code de test et ses scripts | Semgrep écarte par défaut les dossiers `test/` et `tests/` : 48 fichiers. SonarQube Cloud, lui, les analyse |
| Une injection de commande | Semgrep ne l'a pas vue lors du défaut volontaire de l'étape 6 |
| L'architecture et l'exploitation | Aucun outil ne signale une base sans sauvegarde |

Même leçon qu'aux étapes 5 à 7 : un contrôle vert ne prouve que ce qu'il regarde.

## 5. Vulnérabilités de la première version

### 5.1 Révision de l'analyse de risques de l'étape 3

L'étape 3 avait estimé neuf risques avant toute exécution, et annoncé leur révision à l'audit.

| # | Risque | Niveau estimé | Niveau révisé | Ce qui a changé |
|---|---|---|---|---|
| R1 | Action par un utilisateur non autorisé | Élevé | Modéré | 47 tests de refus, refus par défaut, 6 contrôles d'exposition sur le cluster : la probabilité passe à faible. Restent C17 et C18 |
| R2 | Injection SQL | Élevé | Modéré | Requêtes paramétrées, 17 tests de validation, aucun constat de Semgrep ni de SonarQube Cloud. Reste C15 |
| R3 | Fuite d'un secret | Élevé | Modéré | 54 commits sans secret ; blocage au push activé chez GitHub ; Secrets tirés au hasard. Restent C18 et C19 |
| R4 | Vulnérabilité connue d'une image ou d'une dépendance | Élevé | Élevé | Les deux services sont propres. Les images tierces ne sont pas suivies : C10, C11 |
| R5 | Lecture des notifications d'un autre membre | Modéré | Faible | 5 tests de cloisonnement |
| R6 | Vol puis réutilisation d'un jeton | Modéré | Modéré | HTTPS prouvé en local, jeton de 120 secondes. Reste C20 |
| R7 | Accès à la base ou au broker depuis un pod compromis | Modéré | Modéré | 10 contrôles de règles réseau, comptes refusés hors de leurs droits. Restent C19, C20, C21 |
| R8 | Saturation par un afflux de requêtes | Modéré | Critique | Observée deux fois. C'est le constat C1 |
| R9 | Contenu illicite ou script injecté dans une annonce | Modéré | Modéré | Longueurs bornées, modération prouvée. L'échappement à l'affichage reste à la charge de la future interface |

Trois risques baissent parce qu'une preuve existe. Un seul monte : celui que seul le test de charge pouvait mesurer.

### 5.2 Constats

Chaque niveau répond à la question : que risque-t-on si la première version part en production dans cet état ? P : probabilité. I : impact.

Disponibilité et tenue en charge :

| # | Constat | Preuve | P | I | Niveau |
|---|---|---|---|---|---|
| C1 | Aucune limitation de débit à l'entrée : la plateforme sature en pointe, serveur d'identité compris | Test de charge : 3,17 s à 200 utilisateurs, nœud indisponible, 11,19 % d'échecs au retour ; première exécution : Keycloak arrêté, 91 % d'échecs. Aucune règle de débit dans `deploy/k8s/` | Élevée | Élevé | Critique |
| C2 | Connexions à PostgreSQL non bornées : 8 pods à 10 connexions, plus Keycloak, pour 100 places | « too many clients already », 45 refus en une minute. Aucun réglage dans `base-de-donnees.ts` ni dans `keycloak.yaml` | Élevée | Modéré | Élevé |
| C3 | Mise à l'échelle trop tardive ; chaque pod rejoue les migrations à son démarrage | 6 minutes pour un troisième pod, plus que la durée de la pointe | Moyenne | Modéré | Modéré |
| C4 | Points de défaillance uniques : un nœud, une instance PostgreSQL, un broker, un Keycloak | Manifestes ; une minute d'indisponibilité du nœud a donné 84 erreurs 500 | Moyenne | Élevé | Élevé |
| C5 | Aucune sauvegarde des bases, aucun test de restauration | Aucun objet de sauvegarde dans `deploy/k8s/` ; volumes locaux d'un seul nœud | Moyenne | Élevé | Élevé |
| C6 | Les services répondent 500 au lieu de réessayer quand la base est injoignable un instant | « getaddrinfo ENOTFOUND postgresql », 84 fois ; aucun nouvel essai dans le code | Moyenne | Modéré | Modéré |
| C7 | Événements perdus : broker arrêté au moment de publier ; message en échec deux fois jamais repris | Étape 5 : annonce créée, personne notifié. Test de charge : un message resté dans la file des échecs | Moyenne | Modéré | Modéré |
| C8 | Détection absente : journaux non centralisés et perdus avec le pod, aucune alerte, 24 heures de métriques sans volume, connexions à Keycloak non enregistrées | Test de charge : une partie des erreurs n'a pas pu être lue. `valeurs.yaml` ; royaume Keycloak sans enregistrement des événements | Élevée | Modéré | Élevé |
| C9 | La liste des annonces compte toutes les annonces à chaque appel | `findAndCount` dans `depot-annonces.typeorm.ts` | Moyenne | Faible | Faible |

Chaîne d'approvisionnement : tout ce que le projet ne produit pas lui-même, mais exécute.

| # | Constat | Preuve | P | I | Niveau |
|---|---|---|---|---|---|
| C10 | Images tierces hors de tout contrôle automatique | Inventaire : PostgreSQL, 1 critique et 25 hautes ; Keycloak, 6 hautes. Atténuation : `gosu` n'est pas exécuté | Élevée | Modéré | Élevé |
| C11 | Veille incomplète : alertes Dependabot désactivées, scan planifié en retard de 7 h 50 puis de 8 h 21, désactivable par GitHub après 60 jours ; mises à jour manuelles | API de GitHub, 15 et 16 novembre | Moyenne | Modéré | Modéré |
| C12 | Image de base et images tierces désignées par une étiquette, que son éditeur peut déplacer ; une vulnérabilité moyenne de `zlib` dans les 4 variantes | `services/Dockerfile`, manifestes ; inventaire | Faible | Élevé | Modéré |
| C13 | Ni inventaire des composants, ni signature des images ; images des pull requests publiques, jamais nettoyées | Étape 6, paragraphe 11. Leur nombre n'a pas pu être relevé : le jeton du poste n'a pas le droit de lire les paquets | Faible | Modéré | Faible |
| C14 | Dépendances de développement : 4 vulnérabilités moyennes, sans correctif applicable | Inventaire. `npm audit` propose un retour à Jest 25, soit cinq versions majeures en arrière | Faible | Faible | Faible |
| C15 | Angles morts de l'analyse : pas de test dynamique, manifestes hors pipeline, règles publiques de Semgrep | Paragraphe 4.5 | Moyenne | Modéré | Modéré |

Identité et accès :

| # | Constat | Preuve | P | I | Niveau |
|---|---|---|---|---|---|
| C16 | Keycloak tel qu'il est déployé : compte d'administration provisoire encore actif, client `tests` à connexion directe, 212 comptes de charge, aucune politique de mot de passe, pas de second facteur | `deployer.sh`, royaume versionné, étape 7. Atténuations : console non exposée, protection contre les essais répétés activée, jeton de 120 secondes | Moyenne | Élevé | Élevé |
| C17 | Contrôle d'accès incomplètement prouvé face à Keycloak ; changement de clés jamais testé | Paragraphe 4.1 | Faible | Élevé | Modéré |
| C18 | Aucune relecture exigée, commits non signés ; jeton d'analyse personnel, qui expire | Protection de `main` : 0 approbation. Étape 6, paragraphe 11 | Moyenne | Modéré | Modéré |

Cluster, réseau et données :

| # | Constat | Preuve | P | I | Niveau |
|---|---|---|---|---|---|
| C19 | Secrets Kubernetes encodés, non chiffrés, dans la base du cluster ; aucune rotation | Aucune option de chiffrement dans `deploy/k3d/cluster.yaml` | Faible | Élevé | Modéré |
| C20 | Trafic interne en clair : du point d'entrée aux pods, des services à la base, au broker et à Keycloak | Manifestes ; limite écrite dès l'étape 3 | Faible | Élevé | Modéré |
| C21 | PostgreSQL, RabbitMQ et Keycloak ont un système de fichiers inscriptible ; l'espace de noms `monitoring` n'a ni règles réseau ni niveau `restricted` | Trivy : 3 constats hauts. Étape 7, paragraphe 12 | Faible | Élevé | Modéré |
| C22 | Aucun en-tête de sécurité HTTP n'est réglé, ni dans les services ni au point d'entrée | Relecture du code et de l'Ingress. Non mesuré : aucun test dynamique | Moyenne | Faible | Faible |
| C23 | Données personnelles : aucune procédure d'effacement d'un membre ; les notifications d'une annonce retirée restent visibles | Six routes, aucune d'effacement ; étape 3, paragraphe 12 | Moyenne | Modéré | Modéré |

Bilan : 1 constat critique, 6 élevés, 12 modérés, 4 faibles.

### 5.3 Lecture par l'OWASP Top 10

Les noms des familles sont ceux de l'édition 2025, en anglais : le site ne publie pas de traduction française.

| Famille | Ce que le prototype fait | Constats ouverts |
|---|---|---|
| A01 Broken Access Control : contrôle d'accès défaillant | Rôle vérifié dans chaque service, refus par défaut, identité tirée du jeton | C17 |
| A02 Security Misconfiguration : mauvaise configuration | Conteneurs non root, niveau `restricted`, règles réseau, routes internes non exposées | C16, C19, C21, C22 |
| A03 Software Supply Chain Failures : chaîne d'approvisionnement | Versions figées, actions et analyseurs désignés par leur empreinte, Trivy à chaque pull request | C10 à C14 |
| A04 Cryptographic Failures : chiffrement défaillant | HTTPS au point d'entrée, seul l'algorithme RS256 est accepté | C19, C20 |
| A05 Injection | Requêtes paramétrées, entrées validées par liste blanche, analyse statique | C15 |
| A06 Insecure Design : conception non sûre | Analyse de risques dès l'étape 3, listes bornées, services sans état | C1, C2, C4, C5 |
| A07 Authentication Failures : authentification défaillante | Authentification déléguée à Keycloak, jeton court, destinataire vérifié | C16 |
| A08 Software or Data Integrity Failures : intégrité du logiciel et des données | Image construite une fois et désignée par son empreinte, `npm ci --ignore-scripts`, traitement idempotent | C7, C13, C18 |
| A09 Security Logging and Alerting Failures : journalisation et alerte | Journaux structurés, métriques, motif des refus journalisé | C8 |
| A10 Mishandling of Exceptional Conditions : conditions exceptionnelles mal gérées | Erreurs sans détail technique, file des messages en échec, arrêt propre | C3, C6 |

## 6. Parc applicatif existant

### 6.1 Périmètre et réserve

La grille demande un plan qui porte sur le parc applicatif du système d'information, pas seulement sur le prototype. Ce parc est fictif : il n'existe que par le texte du contexte. Rien n'a pu y être scanné ni testé.

Règle suivie : chaque risque part d'un fait écrit dans le contexte. Ce que le contexte ne dit pas est listé au paragraphe 6.3, et la probabilité est alors prise à « moyenne ». Elle n'est « élevée » que si le contexte donne lui-même un fait aggravant.

| Actif | Fait du contexte | Données portées |
|---|---|---|
| Site vitrine | Sur un CMS (logiciel de gestion de contenu) ; abonnement au fanzine et lettre d'information | Abonnés : identité, adresse |
| Gestion de stock, gestion des fournisseurs, CRM (gestion de la relation client) | Hébergés chez un fournisseur cloud français | Clients, fournisseurs, stocks |
| Échanges entre applications | Manuels, par fichiers CSV | Toutes les précédentes |
| Messagerie | Gmail | Correspondance, pièces jointes |
| Caisses des magasins | Une caisse et un stock par magasin ; quatre magasins, dont Londres | Ventes, paiements |
| Serveur de fichiers | Ubuntu, dans le site parisien, accessible en VPN, sauvegardé avec Veeam | Documents de l'entreprise |
| Postes | PC et portables sous Ubuntu ; une station Mac pour le fanzine et les lettres d'information | Fichiers de travail |
| Infrastructure d'Evil Ed | Stations de montage ; serveur multimédia redondé sur 2 nœuds, dans le bureau parisien | Rushes, masters, film en restauration |
| Organisation | Un technicien, aidé « sporadiquement » par deux fondateurs ; un SI « très hétérogène, fragmenté » | — |

### 6.2 Risques

| # | Actif | Menace | Vulnérabilité | P | I | Niveau |
|---|---|---|---|---|---|---|
| S1 | Site vitrine | Prise de contrôle : page défigurée, vol du fichier des abonnés, rebond vers le reste du SI | Seule application ouverte à tout Internet ; un CMS et ses extensions demandent des mises à jour fréquentes ; un seul technicien | Élevée | Élevé | Critique |
| S2 | Stock, fournisseurs, CRM | Accès frauduleux, fuite du fichier clients, arrêt du service | Authentification, sauvegardes et clauses du contrat d'hébergement inconnues | Moyenne | Élevé | Élevé |
| S3 | Échanges par CSV | Erreur ou falsification d'un fichier : stock faux, vente d'un article absent ; fuite d'un fichier copié sur un poste ou envoyé par courriel | Traitement manuel, sans contrôle ni trace ; formule piégée exécutée à l'ouverture dans un tableur | Élevée | Modéré | Élevé |
| S4 | Messagerie Gmail | Hameçonnage, puis prise d'un compte : fraude au fournisseur, accès aux pièces jointes | Second facteur et type de contrat inconnus | Moyenne | Élevé | Élevé |
| S5 | Serveur de fichiers | Rançongiciel (logiciel qui chiffre les données et exige une rançon), vol ou sinistre du local | Serveur dans un magasin ; sauvegardes « internes » : rien ne dit qu'une copie existe hors du site | Moyenne | Élevé | Élevé |
| S6 | Infrastructure d'Evil Ed | Perte des rushes ou d'un master : suppression par erreur, rançongiciel, sinistre du bureau | Deux nœuds dans le même bureau : la redondance protège d'une panne de disque, pas d'un effacement. Aucune sauvegarde n'est citée | Moyenne | Élevé | Élevé |
| S7 | Organisation | Absence du technicien, erreur non détectée, accès jamais retirés | Une seule personne ; aide sporadique ; ni inventaire ni procédure cités | Élevée | Modéré | Élevé |
| S8 | Caisses | Arrêt des ventes d'un magasin ; fuite de données de paiement | Éditeur, mises à jour et séparation du réseau inconnus | Moyenne | Élevé | Élevé |
| S9 | Postes | Vol d'un portable ; panne de l'unique station Mac | Chiffrement des disques et sauvegarde de la station inconnus | Moyenne | Modéré | Modéré |
| S10 | Identités | Compte oublié après un départ ; mot de passe réutilisé d'une application à l'autre | SI fragmenté : un compte par application, pas d'authentification unique | Moyenne | Modéré | Modéré |
| S11 | Conformité au RGPD | Plainte ou contrôle ; données conservées sans limite | Registre des traitements, contrats de sous-traitance et transferts vers Londres inconnus | Moyenne | Modéré | Modéré |
| S12 | Raccordement de la plateforme au parc | La vente en ligne a besoin du stock et des clients : elle hérite de S3 | Aucune interface entre les applications ; les abonnés du site sont à reprendre | Élevée | Modéré | Élevé |

Bilan : 1 risque critique, 8 élevés, 3 modérés.

Deux remarques. S7 est une cause plus qu'un risque : elle aggrave tous les autres. S12 est le seul qui naît du projet lui-même, et il est à traiter dans la conception de la plateforme, pas après.

### 6.3 Points à vérifier

L'inventaire (action B1) doit répondre à ces questions. Chaque réponse peut changer un niveau.

| Actif | Questions |
|---|---|
| Site vitrine | Quel CMS, quelle version, quelles extensions ? Qui met à jour, à quel rythme ? Le paiement de l'abonnement passe-t-il par le site ? |
| Applications hébergées | Sont-elles ouvertes à Internet ou seulement au VPN ? Comptes nominatifs ou partagés ? Second facteur ? Que dit le contrat sur les sauvegardes et la restitution des données ? |
| Gmail | Comptes gratuits ou contrat d'entreprise ? Second facteur imposé ? |
| Caisses | Quel éditeur ? Le terminal de paiement est-il séparé de la caisse ? Le réseau du magasin est-il partagé avec un accès Wi-Fi ? |
| Serveur de fichiers | Où sont les copies de Veeam ? Une restauration a-t-elle déjà été testée ? Qui a un accès VPN ? |
| Evil Ed | Existe-t-il une copie hors du bureau ? |
| Comptes | Les deux fondateurs ont-ils encore des accès d'administration ? Existe-t-il une liste des comptes ? |

## 7. Synthèse : matrice des risques

C : constats de la première version. S : risques du parc existant.

| Impact \ Probabilité | Faible | Moyenne | Élevée |
|---|---|---|---|
| Élevé | Modéré : C12, C17, C19, C20, C21 | Élevé : C4, C5, C16, S2, S4, S5, S6, S8 | Critique : C1, S1 |
| Modéré | Faible : C13 | Modéré : C3, C6, C7, C11, C15, C18, C23, S9, S10, S11 | Élevé : C2, C8, C10, S3, S7, S12 |
| Faible | Faible : C14 | Faible : C9, C22 | — |

| Niveau | Première version | Parc existant | Total |
|---|---|---|---|
| Critique | 1 | 1 | 2 |
| Élevé | 6 | 8 | 14 |
| Modéré | 12 | 3 | 15 |
| Faible | 4 | 0 | 4 |

Lecture : les deux risques critiques sont des risques de disponibilité et d'exposition, pas de code. Le code des services, lui, sort de l'audit sans constat élevé.

## 8. Plan de remédiation priorisé

### 8.1 Règles

| Règle | Application |
|---|---|
| Ordre | Par niveau de risque, comme le demande le cours : critiques, puis élevés, puis modérés |
| Départage à niveau égal | L'action la moins coûteuse d'abord ; puis celle qui en débloque d'autres |
| Traitement | Réduire, éviter (supprimer l'actif), transférer (à un tiers) ou accepter par écrit |
| Effort | En jours de travail d'une personne (j). Ce sont des estimations ; celles du parc existant sont à reprendre après l'inventaire |
| Preuve | Une action sur la plateforme n'est finie que si un test ou un contrôle du pipeline la prouve |

Jalons :

| Jalon | Sens |
|---|---|
| J1 | Avant la soutenance ; le code est gelé le 5 avril 2027. Pour le prototype : ce que je peux exécuter moi-même. Pour le parc existant : ce qui n'attend pas la plateforme |
| J2 | Avant la mise en production de la première version |
| J3 | Dans les trois mois qui suivent la mise en production |
| J4 | Avec la version 2 |

Porteurs : le lead developer, les deux développeurs, l'ingénieur DevOps dont le recrutement est proposé à l'étape 2, le technicien de l'entreprise, la direction.

### 8.2 Priorité 1 — risques critiques

| # | Risque | Action | Justification | Effort | Échéance | Porteur |
|---|---|---|---|---|---|---|
| A1 | C1 | Commander l'environnement distant et y rejouer la pointe à 200 utilisateurs | Le niveau critique vient d'un poste de 8 Go. Sans mesure sur la cible, on ne sait ni dimensionner ni prouver la correction. L'échéance du rétroplanning est le 28 février 2027 | 2 j | J1 | Lead developer |
| A2 | C1, C2 | Borner les connexions de chaque service et de Keycloak, pour que leur somme reste sous le maximum de PostgreSQL ; rejouer le test | Défaut observé ; un réglage ; l'effet se mesure | 0,5 j | J1 | Lead developer |
| A3 | C1 | Limiter le débit au point d'entrée, par adresse et par compte, délivrance des jetons comprise | Mesure préventive : la charge excessive est refusée avant d'atteindre les services. Elle se règle dans Traefik, sans toucher au code | 2 j | J2 | DevOps |
| B1 | S1 à S12 | Inventaire du parc : applications, versions, comptes, flux, sauvegardes, contrats | On ne protège pas ce que l'on ne connaît pas. Il lève les points du paragraphe 6.3 et peut changer les niveaux | 5 j | J1 | Lead developer, technicien |
| B2 | S1 | Site vitrine : mettre à jour le CMS et ses extensions, retirer les extensions inutiles, second facteur sur l'administration, sauvegarde testée | Le site reste en ligne jusqu'à l'ouverture de la plateforme : il faut le tenir d'ici là | 2 j | J1 | Technicien |
| B3 | S1 | Retirer le site vitrine à l'ouverture de la plateforme ; reprendre les abonnés en leur faisant choisir un nouveau mot de passe | Traitement « éviter » : un actif supprimé ne porte plus de risque. La plateforme le remplace, c'est l'objet du projet | 3 j | J2 | Lead developer, technicien |

### 8.3 Priorité 2 — risques élevés

Première version :

| # | Risque | Action | Justification | Effort | Échéance | Porteur |
|---|---|---|---|---|---|---|
| A4 | C10, C11 | Ajouter les images tierces au scan planifié ; activer les alertes Dependabot ; inscrire dans `.trivyignore` les risques acceptés, avec leur date | Le contrôle existe déjà : il suffit de l'étendre. La règle de l'étape 2 s'applique : on corrige, ou on accepte par écrit | 0,5 j | J1 | Lead developer |
| A5 | C16 | Supprimer le compte d'administration provisoire après le déploiement ; ne plus charger le client `tests` ni les comptes de charge hors des environnements de test | Ce qui sert aux tests ne doit pas exister en production. Une ligne dans `deployer.sh`, un contrôle de plus dans `verifier.sh` | 0,5 j | J1 | Lead developer |
| A6 | C16 | Keycloak de production : connexion par le flux « Authorization Code » de la future interface, politique de mot de passe, second facteur pour les modérateurs et les administrateurs, comptes d'administration nominatifs | Cible écrite dans la fiche 0009. Un modérateur peut retirer n'importe quelle annonce : son compte vaut plus qu'un compte de membre | 3 j | J2 | Développeurs |
| A7 | C4, C5 | Cluster à plusieurs nœuds en Europe ; PostgreSQL répliqué et sauvegardé hors du cluster, restauration testée ; broker à trois nœuds ; deux pods Keycloak | Une plateforme commerciale ne peut pas dépendre d'une machine. Chaque brique est à éprouver au bac à sable avant d'être adoptée, comme à l'étape 4 | 10 j | J2 | DevOps |
| A8 | C8 | Journaux centralisés ; alertes sur le taux d'erreur, les refus d'accès anormaux, la file des échecs et les redémarrages ; volume pour Prometheus ; événements de connexion de Keycloak enregistrés | Mesure de détection : aujourd'hui, un incident ne serait vu que par un client qui se plaint. Limite écrite depuis l'étape 3 | 5 j | J2 | DevOps |

Parc existant :

| # | Risque | Action | Justification | Effort | Échéance | Porteur |
|---|---|---|---|---|---|---|
| B4 | S2, S4, S7 | Second facteur sur Gmail, sur l'administration des applications hébergées et sur le VPN ; fin des comptes partagés ; retrait des accès qui n'ont plus lieu d'être ; gestionnaire de mots de passe | La mesure la moins chère contre le vol de compte. Elle ne demande aucun développement | 3 j | J1 | Technicien |
| B5 | S5, S6 | Sauvegardes : trois copies, sur deux supports, dont une hors du site, chiffrée ; serveur de fichiers et rushes d'Evil Ed ; restauration testée chaque trimestre | Une sauvegarde rangée à côté du serveur disparaît avec lui. Une sauvegarde jamais restaurée n'est pas une preuve | 4 j | J1 | Technicien |
| B6 | S7 | Désigner un référent sécurité ; documenter l'exploitation ; second administrateur ou contrat d'infogérance ; procédure d'arrivée et de départ | Traitement « transférer » ou « réduire » : la connaissance ne doit plus tenir dans une seule tête | 3 j | J2 | Direction |
| B7 | S3, S12 | Remplacer les échanges CSV par des flux automatiques entre le stock, le CRM et la plateforme : interfaces, ou événements sur le broker | L'architecture le permet déjà : un nouvel abonné se branche sur un événement sans toucher à l'émetteur. En attendant : dossier partagé à accès restreint, contrôle du format à l'import | 12 j, dont 6 pour le stock | J2 pour le stock, J3 pour le reste | Lead developer, développeurs |
| B8 | S2 | Applications hébergées : revue du contrat (sauvegardes, restitution des données, localisation, journal des accès) ; mises à jour | Traitement « transférer » : le risque n'est transféré que si le contrat le dit | 2 j | J2 | Direction, technicien |
| B9 | S8 | Caisses : relever l'éditeur et la version, séparer leur réseau, vérifier la conformité du terminal de paiement à la norme PCI DSS (norme de sécurité des données de cartes bancaires) | Le niveau est « élevé » par défaut d'information : l'inventaire peut le faire baisser | 2 j | J2 | Technicien |

### 8.4 Priorité 3 — risques modérés

| # | Risque | Action | Justification | Effort | Échéance | Porteur |
|---|---|---|---|---|---|---|
| A9 | C15, C21 | Analyse des manifestes dans le pipeline : d'abord en mode « informer », puis bloquante | Le contrôle existe sur le poste. C'est le principe du cliquet de l'étape 2 | 0,5 j | J1 | Lead developer |
| A10 | C12 | Désigner l'image de base et les images tierces par leur empreinte | Même règle que pour les actions et les analyseurs (fiche 0016) | 0,5 j | J1 | Lead developer |
| A11 | C7 | Motif « outbox » : l'événement est écrit dans la même transaction que l'annonce, puis publié par un relais ; procédure de reprise de la file des échecs | Cible écrite à l'étape 3. Sans lui, une annonce peut exister sans que personne soit notifié | 4 j | J2 | Développeurs |
| A12 | C3, C6 | Migrations jouées par un Job, une fois par déploiement ; nouvel essai de connexion à la base ; pods ajoutés à l'avance avant un événement annoncé | Un pod qui démarre plus vite arrive avant la fin de la pointe. Le festival et une figurine exclusive sont des pointes connues d'avance | 3 j | J2 | Développeurs, DevOps |
| A13 | C15 | Test dynamique avec OWASP ZAP sur l'environnement de démonstration, après chaque déploiement ; règle Semgrep propre au projet pour l'injection de commande ; test d'intrusion par un tiers avant l'ouverture | Le cours place le test dynamique après le déploiement : il voit ce que l'analyse du code ne voit pas | 3 j, plus la prestation | J2 | DevOps |
| A14 | C17 | Tests de refus avec de vrais jetons de Keycloak ; test du changement de clés | Fermer les angles morts du paragraphe 4.1 | 1 j | J2 | Développeurs |
| A15 | C18 | Une approbation exigée dès que l'équipe est constituée ; jeton d'analyse rattaché à un compte de service | Un réglage de la protection de `main`. Seul, je ne peux pas approuver mes propres pull requests | 0,5 j | J2 | Lead developer |
| A16 | C19 | Chiffrer les Secrets au repos, ou les confier à un gestionnaire de secrets ; procédure de rotation | Un Secret encodé se lit par quiconque atteint la base du cluster | 2 j | J2 | DevOps |
| A17 | C21, C22 | Système de fichiers en lecture seule pour PostgreSQL, RabbitMQ et Keycloak ; règles réseau et niveau `restricted` pour `monitoring` ; en-têtes de sécurité au point d'entrée | Aligner les composants tiers sur ce que les deux services respectent déjà | 2 j | J2 | DevOps |
| A18 | C23, S11 | Procédure d'effacement d'un membre ; événement `annonce.retiree` ; registre des traitements de la plateforme | Le droit à l'effacement est une obligation du RGPD ; l'exigence ENF-09 l'annonçait | 3 j | J2 | Développeurs |
| A19 | C20 | Chiffrer le trafic interne : d'abord vers PostgreSQL et RabbitMQ | Limite écrite à l'étape 3. Les règles réseau réduisent déjà le risque : il peut attendre J3 | 5 j | J3 | DevOps |
| A20 | C11 | Mises à jour automatiques des dépendances, des images et des empreintes | Ce que je fais à la main sur un prototype ne tient pas sur la durée | 1 j | J3 | DevOps |
| B10 | S11 | Registre des traitements du parc, contrats de sous-traitance, durées de conservation, consentement à la lettre d'information, transferts vers Londres | La plateforme ajoute des traitements : mieux vaut un registre à jour avant | 4 j | J2 | Direction |
| B11 | S9 | Chiffrer les disques des portables, mises à jour automatiques, sauvegarde de la station Mac | Mesures de base, sans développement | 2 j | J2 | Technicien |
| B12 | S10 | Authentification unique : brancher sur Keycloak les applications internes qui le permettent | Le serveur d'identité du projet sert alors aussi au parc : un seul compte à fermer lors d'un départ | 5 j | J3 | DevOps |
| B13 | S4, S7 | Sensibilisation de tout le personnel à l'hameçonnage ; plan de continuité et plan de reprise d'activité : qui fait quoi si la messagerie, l'hébergeur ou le serveur de fichiers tombe | Le cours traite ces plans : ils se préparent avant la panne | 4 j | J3 | Direction, lead developer |

### 8.5 Risques faibles et risques acceptés

| # | Risque | Décision | Raison | Révision |
|---|---|---|---|---|
| A21 | C9 | Réduire : pagination sans comptage total | Sans effet à ce volume ; 1 j | J3 |
| A22 | C13 | Réduire : inventaire des composants et signature des images ; nettoyage des images des pull requests | Utile à partir de plusieurs versions en production ; 2 j | J3 |
| — | C14 | Accepter | Dépendances de développement, absentes de l'image ; le correctif proposé est un retour en arrière. Le scan planifié dira quand un correctif existe | À chaque montée de version de Jest ou d'ESLint |
| — | C10, pour `gosu` seulement | Accepter, par écrit, dans `.trivyignore` (action A4) | Le programme n'est pas exécuté sur le cluster. Les autres vulnérabilités de C10 sont traitées par A4 | À chaque nouvelle version de l'image |
| — | C22 | Accepter jusqu'à l'interface web | Une API qui ne renvoie que du JSON ; le risque naît avec les pages web | Avec l'interface |
| — | Constats faibles des manifestes | Accepter | Numéros d'utilisateur inférieurs à 10 000 : les conteneurs ne sont pas root, c'est ce qui compte. Espace de noms par défaut : faux positif | À l'action A9 |
| A23 | Tous | Refaire l'analyse de risques avant les enchères et la diffusion : paiement, contenus protégés | Une nouvelle fonctionnalité apporte ses menaces | J4 |

### 8.6 Charge par jalon

| Jalon | Première version | Parc existant | Total |
|---|---|---|---|
| J1 | A1, A2, A4, A5, A9, A10 : 4,5 j | B1, B2, B4, B5 : 14 j | 18,5 j |
| J2 | A3, A6, A7, A8, A11 à A18 : 38,5 j | B3, B6, B7 pour le stock, B8 à B11 : 22 j | 60,5 j |
| J3 | A19 à A22 : 9 j | B7 pour le reste, B12, B13 : 15 j | 24 j |
| J4 | A23 : à estimer | — | — |

Lecture :

- J1, côté prototype : 4,5 jours, soit une trentaine d'heures. À deux heures par jour, c'est tenable avant le gel du code. Ces six actions sont celles que je m'engage à pouvoir montrer au jury.
- J1, côté parc : 14 jours du technicien et du lead developer. Aucune ne demande de développement.
- J2 est le vrai coût de la mise en production : une soixantaine de jours, dont 19 pour l'ingénieur DevOps sur les seules actions A3, A7, A8 et A16. C'est un argument de plus pour son recrutement.

### 8.7 Suivi du plan

| Pratique | Application |
|---|---|
| Chaque action devient un ticket du backlog | Avec son risque, sa preuve attendue et son jalon |
| Revue des risques | À chaque jalon, et à chaque date d'expiration d'un risque accepté |
| Indicateur de suivi | Nombre de risques critiques et élevés ouverts : 16 aujourd'hui ; cible, 0 à la mise en production |
| Audit suivant | Après J2, avec le test dynamique et le test d'intrusion |

## 9. Bonnes pratiques de sécurité du prototype

La grille en demande au moins deux. L'étape 3 en prévoyait cinq ; toutes sont prouvées.

| # | Bonne pratique | Preuve |
|---|---|---|
| 1 | Authentification déléguée à Keycloak, autorisation par rôle vérifiée dans chaque service | 47 tests CA-01 et CA-02, CA-18 ; volets 3 et 4 de la vérification du déploiement |
| 2 | Validation des entrées par liste blanche | 12 tests CA-05, 5 tests CA-08 |
| 3 | Aucun secret dans le code ni dans l'image | Gitleaks : 54 commits, aucun secret ; Secrets tirés au hasard par `deployer.sh` |
| 4 | Échanges externes chiffrés | Volet 2 de la vérification : redirection, chaîne de certificats, refus sans l'autorité |
| 5 | Moindre privilège | Volets 5 et 6 : utilisateur 1000, lecture seule, aucun jeton de l'API ; 7 flux interdits refusés ; un compte par service |

S'y ajoute la chaîne de livraison : analyse statique, analyse des dépendances et des images à chaque pull request, outils désignés par leur empreinte, jeton du pipeline en lecture seule.

## 10. Maturité

Le cours propose l'échelle d'OpenSAMM (modèle de maturité de la sécurité logicielle de l'OWASP) : niveau 1, pratiques informelles ; niveau 2, pratiques définies et répétables, mais manuelles ; niveau 3, pratiques automatisées. Les niveaux ci-dessous sont mon appréciation, pas une mesure.

| Domaine | Projet de plateforme | Parc existant | Cible du plan |
|---|---|---|---|
| Gouvernance | 2 : processus écrit, risques suivis, pas de politique d'entreprise | 1 : rien de formalisé n'est cité | 2 pour le parc : référent, inventaire, registre (B1, B6, B10) |
| Construction | 3 : contrôles automatiques à chaque pull request | Sans objet : logiciels achetés ou hébergés | 3, maintenu |
| Vérification | 2 : analyse statique automatique ; ni test dynamique, ni test d'intrusion | 1 | 3 pour la plateforme (A9, A13) |
| Déploiement | 2 : déploiement par script rejouable, lancé à la main ; pas d'alerte | 1 : un technicien, sauvegardes non vérifiées | 3 pour la plateforme (A7, A8) ; 2 pour le parc (B4, B5) |

## 11. Difficultés rencontrées

| # | Symptôme | Cause | Solution |
|---|---|---|---|
| 1 | Les scans d'images répondent en 1 à 4 secondes | Trivy garde en cache l'analyse des couches et sa base de vulnérabilités, qu'il ne retélécharge qu'une fois par jour | Vérifié dans les rapports : image, architecture et nombre de vulnérabilités. La base date du 15 novembre, 12 h 50 UTC : l'inventaire dit l'état connu à cette date |
| 2 | Keycloak : « 1 haute » à l'étape 6, 6 dans l'inventaire | Le chiffre de l'étape 6 venait du contrôle bloquant, qui ignore les vulnérabilités sans correctif | L'audit lit le rapport complet. `audit.sh` affiche les deux nombres |
| 3 | Un ancien rapport pouvait passer pour un nouveau | `analyses.sh` écrit toujours dans le même fichier | `audit.sh` supprime le rapport avant chaque contrôle et échoue s'il n'est pas recréé |
| 4 | Le nombre d'images publiées n'a pas pu être relevé | Le jeton du poste n'a pas le droit de lire les paquets | Dit comme tel dans le constat C13 |
| 5 | Le scan planifié n'a pas tourné à l'heure dite | GitHub retarde les workflows planifiés quand la charge est forte (lu dans sa documentation) | Devenu le constat C11 |

Leçon, la même qu'aux étapes précédentes : avant de citer un chiffre, vérifier ce que l'outil a réellement compté.

## 12. Limites de l'audit

| Sujet | État |
|---|---|
| Parc existant | Fictif : aucun scan, aucun entretien. Les risques sont déduits du contexte ; les niveaux sont à reprendre après l'inventaire |
| Test dynamique, test d'intrusion | Non exécutés |
| Pointe de charge | Mesurée sur le poste seulement |
| Environnement distant, certificat d'une autorité publique, hébergement en Europe | Non réalisés : l'environnement n'est pas commandé |
| Base de vulnérabilités | État du 15 novembre 2026 ; une vulnérabilité publiée depuis n'apparaît pas |
| En-têtes HTTP | Constat C22 établi par relecture, non mesuré |
| Efforts du plan | Estimations, sans retour d'expérience de l'équipe |
| Probabilités | Appréciations qualitatives, comme le veut la méthode. Une seule est mesurée : la saturation |
| Corrections | Aucune n'est faite à cette étape : choix du paragraphe 2 |

## 13. Reproduire

Depuis la racine du dépôt. Commandes exécutées avec succès le 16 novembre 2026. Prérequis : Docker, `jq`, `gh`.

| Action | Commande |
|---|---|
| Rejouer l'inventaire de sécurité et réécrire la preuve | `tests/securite/audit.sh` (50 secondes) |
| Un seul contrôle | `tests/securite/analyses.sh secrets`, `sast`, `dependances`, `manifestes`, `image <image>` |
| Mesures de SonarQube Cloud sur `main` | `curl -s "https://sonarcloud.io/api/measures/component?component=laugy963_Projet-Indiv-assurer-superviser-dev-app&branch=main&metricKeys=bugs,vulnerabilities,coverage,sqale_debt_ratio"` |
| Protection de `main` | `gh api repos/laugy963/Projet-Indiv-assurer-superviser-dev-app/branches/main/protection` |
| Exécutions du scan planifié | `gh run list --workflow scan-planifie.yml` |

## 14. Après la fusion

| Point | Réalisation | Preuve |
|---|---|---|
| Pipeline sur la pull request n° 5 | Trois exécutions, toutes réussies, en 5 min 0 s à 5 min 29 s. Aucun constat de SonarQube Cloud sur les 178 lignes nouvelles | Exécutions 43841080783, 43841957924, 43879185670 |
| Fusion | Pull request n° 5 fusionnée le 16 novembre 2026, après validation de l'étape, par un commit de fusion | Commit `1ed324d` |
| Pipeline sur `main` | Déclenché par la fusion : 10 jobs réussis en 5 min 56 s | [Exécution 43880172545](https://github.com/laugy963/Projet-Indiv-assurer-superviser-dev-app/actions/runs/43880172545) |
| Quality gate de `main` | Tenu : 0 bug, 0 vulnérabilité, 0 défaut de maintenabilité, dette 0,0 %, couverture 92,5 %, duplication 0,0 % | SonarQube Cloud, analyse du commit `1ed324d` |

Cette section a été ajoutée par la pull request de l'étape 9 : `main` est protégée.

## 15. Suite

L'étape 9 prépare la soutenance. Elle reprendra de cet audit la matrice du paragraphe 7, les deux risques critiques et les six actions du jalon J1.
