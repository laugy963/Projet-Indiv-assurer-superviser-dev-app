# Soutenance — Vingt questions probables du jury

- Date : 16 novembre 2026
- Statut : en attente de validation
- Cadre : 15 minutes d'échange, après les 20 minutes de présentation ; jury de spécialistes du développement

## 1. Règles de réponse

| Règle | Raison |
|---|---|
| Répondre en trois temps : le choix, sa raison, sa limite | Le jury note la capacité à justifier, pas à réciter |
| Citer la preuve : un test, un chiffre, un fichier | Chaque réponse ci-dessous renvoie à sa preuve |
| Nommer l'alternative écartée | Chaque fiche de décision en cite au moins une |
| Dire « ce n'est pas fait » quand ce n'est pas fait | L'environnement distant, le test dynamique et la pointe sur la cible ne sont pas réalisés |
| Une minute par réponse | Quinze minutes pour une dizaine de questions |

## 2. Phase 1 — Processus de développement

### Question 1 — Pourquoi cette fonctionnalité, et pas la vente en ligne, qui est le cœur du besoin ?

- La vente impose le paiement : un prestataire à intégrer et la norme PCI DSS. Hors de portée d'un prototype.
- Sans paiement, il ne reste que des lectures et des écritures synchrones : elles n'exercent pas l'architecture.
- Une annonce et sa notification exercent tout : deux services, un échange asynchrone, une autorisation par rôle, une charge mesurable.
- Limite : la fonctionnalité ne vaut qu'un point de la grille. Je l'ai choisie pour les quatre points de l'architecture.

Preuve : [fiche 0001](../adr/0001-fonctionnalite-metier.md).

### Question 2 — En quoi vos indicateurs réduisent-ils la dette technique, concrètement ?

- Chaque indicateur a un seuil qui bloque. Un critère sans test bloque la fusion. Une dette au-dessus de 5 % sur le nouveau code la bloque aussi : la dette ne peut plus augmenter.
- Exemple réel : le quality gate a refusé 4,6 % de lignes dupliquées, pour un seuil de 3 %. Le scénario de test répété a été écrit une seule fois dans le socle.
- I2 et I4 donnent une ligne de base : 45 ms, 100 %. Une dérive se rattache à la livraison qui l'introduit.
- Limite, montrée par l'audit : I3 vaut 0,0 %, et il reste 23 constats. Il mesure la dette du code, pas celle de l'architecture ni de l'exploitation.

Preuve : [processus, paragraphe 2.3](../02-processus-developpement.md) ; [déploiement, paragraphe 5](../07-deploiement-observabilite-charge.md) ; [audit, paragraphe 4.2](../08-audit-et-remediation.md).

### Question 3 — Vos tests unitaires ne couvrent que 36 % et 48 % des services. N'est-ce pas insuffisant ?

- C'est voulu. Les trois niveaux se distinguent par ce qui est lancé : une règle seule ; un service avec sa vraie base et son vrai broker ; les deux services avec Keycloak.
- Les adaptateurs et les contrôleurs sont prouvés au deuxième niveau. Remplacer la base par un double ne prouverait que le double.
- Le seuil de 80 % porte sur les deux niveaux réunis, dans le quality gate : 92,5 %, soit 98,9 % des lignes et 80,8 % des branches.
- Limite : les tests d'intégration demandent des conteneurs. Le job dure 54 secondes, contre 28 pour les tests unitaires.

Preuve : [pipeline, paragraphes 4 et 7](../06-pipeline-ci-cd.md) ; [fiche 0013](../adr/0013-environnement-et-jetons-des-tests.md).

### Question 4 — Votre pipeline ne déploie pas. Est-ce vraiment de la livraison continue ?

- Il livre : une image construite une fois, scannée, testée, publiée, désignée par son empreinte. Rien d'autre ne peut être déployé.
- Il ne déploie pas : les exécuteurs de GitHub ne joignent pas mon poste, et l'environnement distant n'est pas commandé.
- Le déploiement est une commande, qui prend les images du pipeline par leur empreinte : 46 secondes. La vérification en est une autre : 49 contrôles.
- Les consignes ne pénalisent pas l'absence de cette étape. Le schéma la prévoit, après une validation humaine.

Preuve : [schéma du pipeline réalisé](../schemas/pipeline-realise.md) ; [déploiement, paragraphe 4.2](../07-deploiement-observabilite-charge.md).

### Question 5 — SonarQube Cloud, Semgrep, Trivy, Gitleaks : n'est-ce pas redondant ?

- Ils ne regardent pas la même chose : la qualité et la dette ; les motifs de code dangereux ; les composants tiers ; les secrets.
- La preuve qu'ils ne se recouvrent pas : le scan de l'image a trouvé 6 vulnérabilités hautes dans le `npm` de l'image de base, que le scan des dépendances ne pouvait pas voir.
- Autre preuve : un défaut placé exprès. ESLint a vu l'injection de commande, Semgrep non.
- Limite : aucun ne regarde l'application en marche. Le test dynamique est une action du plan.

Preuve : [pipeline, paragraphe 6](../06-pipeline-ci-cd.md).

### Question 6 — Comment protégez-vous le pipeline lui-même ?

- Moindre privilège : le jeton du pipeline ne peut que lire. Seul le job qui publie l'image reçoit le droit d'écrire dans le registre.
- Code tiers figé : 9 actions désignées par l'empreinte de leur commit, 3 analyseurs par l'empreinte de leur image. Une étiquette se déplace, une empreinte non.
- `npm ci --ignore-scripts` : une dépendance compromise n'exécute rien à son installation.
- `main` est protégée, administrateur compris : personne ne modifie le pipeline sans passer par lui.
- Limite : l'image de base et les images tierces sont encore désignées par une étiquette. C'est le constat C12.

Preuve : [pipeline, paragraphe 8](../06-pipeline-ci-cd.md) ; [fiche 0016](../adr/0016-outils-du-pipeline-figes.md).

### Question 7 — Pourquoi recruter un ingénieur DevOps plutôt que vous former à Kubernetes ?

- Je porte déjà l'architecture, la revue de code et le rôle de référent sécurité. Kubernetes et l'observabilité resteraient tenus par une seule personne, débutante.
- Ma règle de couverture : un référent et une deuxième personne autonome par compétence critique.
- Le profil est réaliste : conteneurs, orchestration, pipeline, supervision vont ensemble dans le métier. Il forme ensuite l'équipe.
- Le prototype le confirme : j'ai tenu ce rôle seul, et l'audit compte 19 jours de travail de ce profil avant la mise en production.

Preuve : [compétences et formation, paragraphes 4 et 5](../02-competences-et-formation.md) ; [audit, paragraphe 8.6](../08-audit-et-remediation.md).

## 3. Phase 2 — Prototype

### Question 8 — Pourquoi RabbitMQ, plutôt qu'un appel HTTP direct ou que Kafka ?

- Un appel direct couple les services : la publication échoue ou ralentit quand le service notifications est indisponible.
- Avec le broker, publier ne dépend pas de l'abonné. C'est prouvé : le service notifications arrêté, la publication répond 201, et la notification arrive à la relance.
- Kafka garde un journal que l'on peut rejouer : adapté aux gros volumes, mais lourd et complexe pour un prototype sur 8 Go. RabbitMQ pèse 104 Mio.
- Limite : un seul nœud RabbitMQ. La cible en compte trois.

Preuve : [fiche 0007](../adr/0007-broker-de-messages.md) ; critère CA-15.

### Question 9 — Que se passe-t-il si un message est remis deux fois, ou si le broker est arrêté ?

- La livraison est « au moins une fois » : l'accusé de réception part après l'enregistrement. Un message peut donc être remis deux fois.
- Le traitement est idempotent : une contrainte d'unicité sur le couple membre et annonce. Deux remises, une seule notification.
- Un message non conforme, ou en échec deux fois, part dans une file des messages en échec : il ne bloque pas les suivants.
- Limite observée : si le broker est arrêté au moment de publier, l'annonce est créée et l'événement est perdu. La cible est le motif « outbox ».

Preuve : critère CA-14 ; [prototype, paragraphe 12](../05-developpement-poc.md) ; constat C7, action A11.

### Question 10 — Pourquoi vérifier le jeton dans chaque service, et pas seulement au point d'entrée ?

- Un service joint depuis l'intérieur du cluster ne vérifierait rien. Chaque service ne fait confiance à aucune requête.
- La vérification est locale : le service garde les clés publiques de Keycloak. Pas d'appel réseau par requête ; une panne de Keycloak n'arrête pas les services.
- Il vérifie la signature, en RS256 seulement, l'émetteur, l'expiration, le destinataire et le rôle.
- Limite : un jeton révoqué reste valable jusqu'à son expiration. D'où une durée de vie de 120 secondes.

Preuve : [fiches 0009](../adr/0009-authentification-et-autorisation.md) et [0014](../adr/0014-audience-du-jeton.md) ; 47 tests CA-01 et CA-02.

### Question 11 — Vos tests obtiennent leurs jetons par mot de passe. Est-ce acceptable ?

- Pour une application réelle, non : Keycloak déconseille ce mode de connexion directe.
- C'est un compromis du prototype, qui n'a pas d'interface web. Un client Keycloak nommé `tests` lui est réservé.
- L'audit le relève : ce client et les comptes de test ne doivent pas exister en production. C'est le constat C16.
- La cible est le flux « Authorization Code », avec l'interface.

Preuve : [architecture, paragraphe 8.1](../03-architecture.md) ; actions A5 et A6.

### Question 12 — Une seule instance PostgreSQL pour deux services : est-ce encore « une base par service » ?

- Oui pour le cloisonnement : une base et un compte par service. Le compte du service annonces est refusé sur la base notifications ; c'est vérifié.
- Non pour la panne : l'instance tombée, les deux services tombent.
- Raison : la mémoire du poste. Une deuxième instance aurait doublé la consommation, pour un gain invisible dans un prototype.
- La cible est une instance par service, répliquée et sauvegardée.

Preuve : [fiche 0008](../adr/0008-persistance.md) ; constats C4 et C5, action A7.

### Question 13 — Vos trois expérimentations sont toutes adoptées. À quoi sert un bac à sable qui ne rejette rien ?

- Sa valeur est dans les difficultés : sept, trouvées avant le prototype. Quatre l'auraient cassé plus tard.
- Exemples : un conteneur « non root » qui ne démarre pas si l'utilisateur est désigné par un nom ; un pod qui met 30 secondes à s'arrêter.
- Le rejet était possible : chaque hypothèse de l'architecture avait sa conséquence écrite si elle était fausse.
- Les alternatives ont été écartées avant, sur leur documentation : NATS, Kafka, Redis.
- Ce qui n'a pas été exécuté est dit : le certificat d'une autorité publique, la supervision.

Preuve : [synthèse du bac à sable](../experimentations/README.md) ; [architecture, paragraphe 13](../03-architecture.md).

### Question 14 — La grille demande un environnement managé. Votre prototype tourne sur un portable. Qu'en dites-vous ?

- C'est le principal écart du projet, et je l'annonce. L'environnement distant n'est pas commandé.
- J'ai demandé à l'intervenant si un k3s sur une machine virtuelle suffisait, ou s'il fallait un Kubernetes opéré par un fournisseur. Je n'ai pas encore la réponse.
- Ce qui est prêt : k3d et k3s sont la même distribution ; les manifestes sont assemblés par Kustomize, une variante par environnement. La variante distante, qui reste à écrire, ne doit changer que les noms d'hôte et l'émetteur de certificats.
- Ce qui manque : la variante distante, le certificat d'une autorité publique, le déploiement par le pipeline, la pointe de charge sur la cible.
- C'est la première action du plan, échéance au 28 février 2027.

Preuve : [fiche 0003](../adr/0003-hebergement-et-orchestration.md) ; [déploiement, paragraphe 12](../07-deploiement-observabilite-charge.md) ; action A1.

### Question 15 — Comment le HPA décide-t-il, et pourquoi la mise à l'échelle est-elle arrivée trop tard ?

- Il compare le processeur consommé au processeur réservé. Pods voulus : arrondi supérieur de pods actuels × utilisation ÷ cible. La cible est 70 % de 250 millicœurs.
- Il a réagi vite : 9 secondes après le début de la pointe, à 92 %.
- Le retard vient du démarrage du pod, pas du HPA : 6 minutes sur un nœud saturé, avec les migrations à rejouer.
- Corrections : plusieurs nœuds, migrations dans un Job, pods ajoutés à l'avance avant un événement annoncé.
- Réglage tiré du premier essai : un pod de plus toutes les 30 secondes, au lieu d'un doublement.

Preuve : [déploiement, paragraphes 4.4 et 8.6](../07-deploiement-observabilite-charge.md) ; constat C3, action A12.

### Question 16 — Pourquoi votre sonde « vivant » ne teste-t-elle pas la base de données ?

- Une sonde « vivant » en échec fait redémarrer le conteneur. Si la base tombe, tous les pods redémarreraient en boucle, sans rien réparer.
- C'est la sonde « prêt » qui interroge la base : le pod sort du Service, sans redémarrer.
- Le broker n'est dans aucune des deux : les services s'y reconnectent seuls, et sa panne ne doit pas fermer les lectures.
- Leçon du projet : une sonde est un programme qui consomme. Celle de RabbitMQ a fait redémarrer le broker sur le poste chargé.

Preuve : [déploiement, paragraphes 4.3 et 10](../07-deploiement-observabilite-charge.md).

### Question 17 — Comment prouvez-vous que vos règles réseau bloquent vraiment ?

- Par des connexions tentées depuis les pods : 3 flux autorisés s'ouvrent, 7 flux interdits sont refusés.
- Parmi les interdits : d'un service à l'autre, vers Internet, vers l'API de Kubernetes, d'un autre espace de noms vers la base.
- Chaque flux interdit vise un port où un programme écoute : le refus vient de la règle, pas d'un port fermé.
- Méthode du cours : tout fermer, en entrée et en sortie, puis ouvrir flux par flux.

Preuve : volet 6 de [deploiement.txt](../../tests/resultats/deploiement.txt).

### Question 18 — Que vaut un test de charge joué sur un portable de 8 Go ?

- Il vaut pour la charge nominale : 45 ms et aucune erreur, recoupés par Prometheus côté serveur, à 44 ms.
- Il ne vaut pas pour dimensionner : le générateur de charge, le cluster et la supervision partagent les mêmes cœurs.
- Il a pourtant révélé cinq défauts qui ne dépendent pas du poste, comme les connexions à la base non bornées.
- L'hypothèse de charge est à faire valider : 5 000 membres, 1 % connectés en même temps, une pointe à quatre fois.

Preuve : [déploiement, paragraphes 8.6 à 8.8](../07-deploiement-observabilite-charge.md).

## 4. Phase 3 — Audit et remédiation

### Question 19 — Tous vos contrôles sont verts et vous relevez 23 constats. Pourquoi ?

- Un contrôle ne prouve que ce qu'il regarde : le code et les images des deux services.
- Il ne regarde ni les images tierces, ni l'application en marche, ni l'architecture. L'image de PostgreSQL porte 1 vulnérabilité critique et 25 hautes.
- Le constat critique vient du test de charge, pas d'un analyseur : rien ne limite le débit à l'entrée.
- La gravité d'un outil n'est pas le niveau de risque. Les 26 vulnérabilités de PostgreSQL sont dans un programme que le conteneur n'exécute pas.

Preuve : [audit, paragraphes 4.3 à 4.5](../08-audit-et-remediation.md).

### Question 20 — Comment auditer un parc applicatif que vous n'avez jamais vu, et comment avez-vous priorisé ?

- Par la méthode du cours, ISO 27005, à partir des seuls faits du contexte. Je n'ai inventé ni nom de CMS, ni version.
- La probabilité est « moyenne » par défaut, « élevée » seulement si le contexte donne un fait aggravant. Le site vitrine est ouvert à tout Internet et tenu par un seul technicien.
- Ce que le contexte ne dit pas est listé : la première action du plan est un inventaire, qui peut changer les niveaux.
- La priorité suit la matrice : critiques, puis élevés. À niveau égal, l'action la moins coûteuse d'abord : le second facteur, 3 jours sans développement, avant le chiffrement interne, 5 jours.

Preuve : [audit, paragraphes 6 et 8](../08-audit-et-remediation.md).

## 5. Si je ne sais pas

| Situation | Réponse |
|---|---|
| La question porte sur ce qui n'est pas fait | « Ce n'est pas réalisé. Voici pourquoi, et où c'est inscrit dans le plan. » |
| La question porte sur un chiffre que je n'ai pas en tête | L'ouvrir dans le dépôt : chaque chiffre a son fichier dans `tests/resultats/` |
| La question sort du périmètre : interface, paiement, enchères | Dire ce que l'architecture prévoit, sans prétendre l'avoir prouvé |
