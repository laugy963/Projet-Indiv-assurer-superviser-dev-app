# 0002 — Langage et framework du back-end

- Statut : acceptée
- Date : 10 novembre 2026

## Contexte

- L'équipe compte un lead et deux développeurs juniors issus de l'alternance.
- Le poste de développement est un MacBook Pro M1 doté de 8 Go de mémoire. Il doit faire tourner en même temps le cluster local, le serveur d'authentification, le broker, la base de données et les services.
- La soutenance doit montrer la mise à l'échelle automatique : les pods ajoutés doivent être prêts vite.
- Le jury attend une explication précise de chaque choix.

## Décision

Le back-end est écrit en TypeScript, exécuté par Node.js, avec le framework NestJS.

- Node.js : environnement d'exécution de JavaScript côté serveur.
- TypeScript : sur-ensemble de JavaScript qui ajoute des types vérifiés à la compilation.
- NestJS : framework qui structure l'application en modules et fournit l'injection de dépendances.

Les versions sont figées à l'étape 5, en prenant la version LTS (à support long) de Node.js en cours à cette date.

## Pourquoi ce choix

- Mémoire et démarrage : un service NestJS occupe de l'ordre de 100 à 150 Mo et démarre en 1 à 2 secondes, contre 350 à 500 Mo et 5 à 15 secondes pour un service Spring Boot. Ce sont des ordres de grandeur habituels, à mesurer à l'étape 4.
- Un seul langage pour le back-end et pour la future interface web : deux développeurs juniors ont moins de compétences à acquérir.
- NestJS impose une structure commune (modules, contrôleurs, services). Le code de deux juniors reste homogène, ce qui sert la maintenabilité au sens de l'ISO 25010 (modularité, analysabilité).
- Les outils de contrôle vus en cours existent pour cette stack : ESLint et son extension de sécurité, Semgrep, npm audit, Trivy.

## Alternative écartée

Java 21 avec Spring Boot 3. Ses intégrations sont plus complètes : Spring Security pour OpenID Connect, Actuator et Micrometer pour les sondes et les métriques, Spring AMQP pour le broker. Elle est écartée parce que son empreinte mémoire ne tient pas sur un poste de 8 Go une fois le serveur d'authentification et plusieurs réplicas lancés. Le test de charge ne pourrait alors être joué que sur l'environnement distant.

## Conséquences

- La validation des jetons OpenID Connect (protocole d'authentification bâti sur OAuth 2.0) et l'exposition des métriques ne sont pas fournies d'office : elles sont à câbler, et à savoir expliquer.
- L'arbre de dépendances npm est volumineux. L'analyse de composition logicielle (recherche de vulnérabilités connues dans les dépendances) est indispensable dans le pipeline.
- Les outils de test (Jest pour les tests unitaires, Supertest pour les appels HTTP) sont à confirmer dans la stratégie de tests de l'étape 2.
