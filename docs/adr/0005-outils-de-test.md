# 0005 — Outils de test

- Statut : acceptée
- Date : 12 novembre 2026

## Contexte

- La fiche 0002 a retenu NestJS et laissé les outils de test « à confirmer dans la stratégie de tests de l'étape 2 ».
- Les consignes demandent au moins deux types de tests dans le pipeline, qui alimentent les indicateurs de qualité, et un test de charge présenté en soutenance.
- Chaque critère d'acceptation du backlog doit être prouvé par un test d'appel ou d'acceptation.
- L'équipe compte deux développeurs juniors. Le poste de développement a 8 Go de mémoire.
- L'étape 5 (développement du prototype) dispose de 42 heures.

## Décision

| Besoin | Outil |
|---|---|
| Tests unitaires | Jest |
| Tests d'intégration (tests d'appel) | Jest + Supertest |
| Tests d'acceptation | Jest + Supertest. Chaque test porte l'identifiant du critère d'acceptation qu'il prouve |
| Test de charge | k6 |

Définitions :

- Jest : outil qui exécute les tests, fournit les assertions et les doubles de test (objets qui remplacent une dépendance), et mesure la couverture.
- Supertest : bibliothèque qui envoie de vraies requêtes HTTP à un service et vérifie la réponse.
- k6 : outil de test de charge. Le scénario est écrit en JavaScript ; des seuils font échouer le test s'ils sont dépassés.

## Pourquoi ce choix

- Jest est l'outil livré avec NestJS : un projet créé par l'outil en ligne de commande de NestJS est déjà configuré pour lui. Les juniors n'ont rien à assembler.
- Un seul outil couvre les trois niveaux de tests fonctionnels. Une seule syntaxe à apprendre, un seul format de rapport pour le pipeline.
- Jest mesure la couverture, dont SonarQube Cloud a besoin pour l'indicateur de maintenabilité.
- k6 s'écrit dans le langage du back-end : un développeur relit le scénario de charge comme n'importe quel fichier du projet.
- Les seuils de k6 (temps de réponse au 95e centile, taux d'erreur) correspondent aux indicateurs de performance et de fiabilité. Un seuil dépassé fait échouer le job.
- k6 est un programme autonome, sans machine virtuelle Java : il pèse peu sur un poste de 8 Go.

## Alternatives écartées

| Alternative | Raison du rejet |
|---|---|
| Mocha, cité dans le cours Tests et recettes | Il n'exécute que les tests. Il faut lui ajouter une bibliothèque d'assertions, une de doubles de test et un outil de couverture, puis refaire la configuration que NestJS fournit pour Jest. Le choix n'est pas équivalent : la règle « outil vu en cours » ne s'applique pas |
| Gherkin et Cucumber pour les tests d'acceptation, cités dans le cours | Les scénarios seraient lisibles par la maîtrise d'ouvrage. Mais c'est un outil et une couche de code de plus, à prendre sur les 42 heures de l'étape 5. La lisibilité est obtenue autrement : les critères sont rédigés en « Étant donné / Quand / Alors » dans le backlog |
| JMeter, cité par les consignes et le cours | Il tourne sur une machine virtuelle Java, gourmande en mémoire. Ses scénarios sont des fichiers XML produits dans une interface graphique, difficiles à relire dans une pull request |
| Siege, cité par les consignes | Il rejoue une liste d'adresses. Il ne permet pas d'écrire un scénario en plusieurs étapes (obtenir un jeton, puis publier), ni de faire échouer le test sur un seuil |

## Conséquences

- Jest n'apparaît pas dans le cours : l'écart est à justifier devant le jury par les arguments ci-dessus.
- Les consignes citent « Siege, JMeter… » : k6 entre dans les points de suspension, et le cours Tests et recettes le présente comme « conçu pour CI/CD ».
- Le backlog de l'étape 3 donne un identifiant à chaque critère d'acceptation et les rédige en « Étant donné / Quand / Alors ».
- La distinction entre les trois niveaux de tests ne vient pas de l'outil : elle vient de ce qui est lancé (une fonction, un service avec ses dépendances, les deux services ensemble). Elle doit se voir dans l'arborescence des tests.
- Cette fiche complète la fiche 0002, qu'elle ne remplace pas.
