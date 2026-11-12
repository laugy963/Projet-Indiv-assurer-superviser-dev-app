# Étape 2 — Compétences et formation

- Date : 12 novembre 2026
- Statut : validé le 12 novembre 2026
- Complète : [processus de développement](02-processus-developpement.md)

## 1. Objet

Recenser les compétences que le projet demande, les comparer à celles de l'équipe, et décider comment combler chaque écart : recruter, former ou accompagner.

## 2. Hypothèses

Le contexte dit peu de chose de l'équipe : un architecte logiciel ancien lead developer, deux développeurs juniors sortant de cinq ans d'alternance, des recrutements possibles. Il ne décrit pas leurs compétences.

Les niveaux ci-dessous sont donc des hypothèses de travail. Dans une vraie équipe, ils seraient établis par une auto-évaluation de chacun, puis confirmés en entretien.

| Niveau | Sens |
|---|---|
| 0 | Aucune pratique |
| 1 | Notions : a besoin d'aide pour produire |
| 2 | Autonome : produit seul, au niveau attendu |
| 3 | Référent : décide, relit le travail des autres, peut former |

Règle de couverture : chaque compétence critique doit avoir un référent (niveau 3) et une deuxième personne autonome (niveau 2). Une compétence tenue par une seule personne est un risque : son absence arrête le projet.

## 3. Cartographie

« Recrue » : l'ingénieur DevOps proposé au paragraphe 5, au niveau attendu à son arrivée.

| # | Compétence | Pourquoi le projet en a besoin | Lead | Junior A | Junior B | Recrue | Couverture |
|---|---|---|---|---|---|---|---|
| C1 | TypeScript et NestJS | Langage et framework du back-end (fiche 0002) | 3 | 2 | 2 | 0 | Atteinte |
| C2 | Tests automatisés : Jest, Supertest, tests écrits avant le code | Stratégie de tests, indicateur I1 | 3 | 1 | 1 | 1 | Pas de deuxième personne autonome |
| C3 | Qualité du code et revue : principes SOLID, lecture d'un rapport SonarQube | Indicateur I3 | 3 | 1 | 1 | 1 | Pas de deuxième personne autonome |
| C4 | Sécurité applicative : OWASP Top Ten, codage sûr, lecture d'un rapport d'analyse | Contrainte de sécurité forte du contexte | 2 | 1 | 1 | 2 | Pas de référent |
| C5 | Authentification et autorisation : OpenID Connect, rôles | Accès réservé aux membres, rôle de modérateur | 2 | 0 | 0 | 1 | Pas de référent |
| C6 | Messagerie asynchrone : broker de messages | Communication entre les deux services (fiche 0001) | 2 | 0 | 0 | 1 | Pas de référent |
| C7 | Base de données relationnelle | Stockage des annonces et des notifications | 2 | 2 | 2 | 1 | Pas de référent, mais trois personnes autonomes |
| C8 | Conteneurs : Docker, Dockerfile durci | Livrable du pipeline | 2 | 1 | 1 | 3 | Atteinte avec la recrue |
| C9 | Kubernetes : déploiement et exploitation du cluster | Hébergement et orchestration (fiche 0003) | 1 | 0 | 0 | 3 | Atteinte avec la recrue, sans deuxième personne autonome |
| C10 | CI/CD : GitHub Actions | Pipeline (fiche 0004) | 2 | 1 | 1 | 3 | Atteinte avec la recrue |
| C11 | Observabilité : métriques, journaux, alertes | Indicateurs I2 et I4 en exploitation | 1 | 0 | 0 | 3 | Atteinte avec la recrue, sans deuxième personne autonome |
| C12 | Test de charge : k6 | Indicateurs I2 et I4 | 1 | 0 | 0 | 2 | Pas de référent |
| C13 | Interface web et accessibilité (RGAA) | Exigence du contexte, hors prototype | 1 | 1 | 1 | 0 | Personne d'autonome |

Définitions : OpenID Connect est un protocole d'authentification bâti sur OAuth 2.0. SOLID désigne cinq principes de conception qui rendent un code facile à faire évoluer.

## 4. Écarts et réponses

| Priorité | Écart | Risque pour le projet | Réponse |
|---|---|---|---|
| 1 | C9, C11 : personne ne sait exploiter un cluster Kubernetes ni l'observer | Le prototype ne se déploie pas, ou personne ne sait le réparer | Recruter un ingénieur DevOps (paragraphe 5). Il forme ensuite l'équipe (action F2) |
| 2 | C4 : les juniors écrivent le code d'une plateforme commerciale avec des notions de sécurité | Des failles entrent dans le code ; le lead devient le seul filtre | Former les trois développeurs (action F1, détaillée au paragraphe 6) |
| 3 | C2, C3 : les juniors ne sont pas autonomes en tests ni en qualité | Les indicateurs I1 et I3 reposent sur le lead seul | Accompagner : travail en binôme avec le lead sur les premières user stories, revue de chaque pull request (action F3) |
| 4 | C5, C6, C12 : technologies nouvelles pour l'équipe | Blocage pendant le développement | Les éprouver d'abord en bac à sable (étape 4), puis partager le résultat en atelier interne |
| 5 | C13 : aucune compétence en accessibilité | La plateforme complète ne serait pas conforme au RGAA | Former un junior comme référent accessibilité (action F4) ; audit externe avant la mise en production |

## 5. Recrutement proposé

Un seul recrutement : un ingénieur DevOps confirmé.

| Rubrique | Contenu |
|---|---|
| Intitulé | Ingénieur DevOps |
| Expérience | 3 à 5 ans |
| Missions | Installer et exploiter le cluster Kubernetes ; construire et maintenir le pipeline CI/CD ; mettre en place l'observabilité ; écrire les tests de charge avec le lead ; former les développeurs au déploiement |
| Compétences attendues | C8, C9, C10, C11 au niveau 3 ; C4 et C12 au niveau 2 |
| Ce qui n'est pas demandé | Développer en NestJS ; être expert en sécurité applicative ; concevoir l'interface |

Pourquoi ce profil est réaliste : il réunit des compétences qui vont ensemble dans le métier (conteneurs, orchestration, pipeline, supervision). Il ne lui est demandé ni de développer la plateforme ni de porter la sécurité applicative.

| Alternative écartée | Raison du rejet |
|---|---|
| Aucun recrutement : le lead se forme à Kubernetes | Le lead porte déjà l'architecture, la revue de code et le rôle de Security Champion. C9 et C11 resteraient tenues par une seule personne, au niveau débutant |
| Ingénieur DevOps et développeur front-end confirmé | Couvre mieux C13, mais porte l'équipe à cinq personnes pour une première version. L'interface peut être tenue par les juniors, formés à l'accessibilité |
| Un seul profil « DevOps, sécurité et développement » | C'est le profil introuvable que les consignes demandent d'éviter |

## 6. Action de formation détaillée (F1)

Sécurité applicative pour développeurs : l'OWASP Top Ten appliqué à NestJS.

| Rubrique | Contenu |
|---|---|
| Écart visé | C4 |
| Public | Les deux développeurs juniors et le lead |
| Objectif | Juniors : passer du niveau 1 au niveau 2. Lead : passer du niveau 2 au niveau 3, pour tenir le rôle de Security Champion |
| Prérequis | C1 au niveau 2 |
| Durée et rythme | 3 jours : 2 jours consécutifs avant le début du développement, 1 jour un mois plus tard |
| Formateur | Jours 1 et 2 : organisme de formation spécialisé en sécurité applicative. Jour 3 : le lead |
| Coût | 9 jours de travail (3 personnes × 3 jours), plus le tarif de l'organisme, à demander sur devis |

À la fin de la formation, chaque développeur sait :

1. expliquer les dix familles de failles de l'OWASP Top Ten, avec un exemple pour chacune ;
2. écrire en NestJS une route protégée : entrées validées, accès contrôlé par rôle, aucun secret dans le code ;
3. lire un rapport de Semgrep ou de Trivy et décider : corriger, ou accepter le risque par écrit ;
4. écrire le test qui prouve qu'un contrôle d'accès fonctionne.

| Jour | Programme |
|---|---|
| 1 | Les dix familles de l'OWASP Top Ten. Démonstration d'attaques sur OWASP Juice Shop, une application volontairement vulnérable écrite en Node.js |
| 2 | Atelier sur le code du projet : validation des entrées, contrôle d'accès par rôle, gestion des secrets. Lecture des rapports du pipeline et traitement d'une alerte |
| 3 | Un mois plus tard : revue de sécurité croisée du code écrit depuis la formation, puis évaluation |

| Évaluation | Méthode | Critère de réussite |
|---|---|---|
| À chaud, en fin de jour 2 | Exercice : trouver et corriger trois failles placées dans une branche d'exercice du projet | Trois failles corrigées, chacune avec le test qui la prouve |
| À froid, au jour 3 | Revue croisée ; le lead observe le traitement d'une alerte réelle du pipeline | Le développeur traite l'alerte sans aide |
| Dans la durée | Nombre d'alertes de sécurité introduites par pull request | En baisse d'un mois sur l'autre |

Lien avec le processus : cette action réduit les défauts à la source, donc les blocages du pipeline, et elle répartit la revue de sécurité sur toute l'équipe au lieu du seul lead.

## 7. Autres actions du plan

| Action | Écart | Public | Format | Formateur |
|---|---|---|---|---|
| F2 — Kubernetes pour développeurs | C9, C11 | Le lead et les deux juniors | Atelier interne de 2 jours sur le cluster du projet | L'ingénieur DevOps |
| F3 — Tests automatisés | C2, C3 | Les deux juniors | Travail en binôme sur les premières user stories ; revue de chaque pull request | Le lead |
| F4 — Accessibilité et RGAA | C13 | Un junior, futur référent accessibilité | Formation externe | Organisme spécialisé |

## 8. Cartographie visée après les actions

| # | Compétence | Lead | Junior A | Junior B | Ingénieur DevOps | Couverture |
|---|---|---|---|---|---|---|
| C2, C3 | Tests et qualité du code | 3 | 2 | 2 | 1 | Atteinte |
| C4 | Sécurité applicative | 3 | 2 | 2 | 2 | Atteinte |
| C9, C11 | Kubernetes et observabilité | 2 | 1 | 1 | 3 | Atteinte |
| C13 | Interface et accessibilité | 1 | 2 | 1 | 0 | Une personne autonome ; audit externe en complément |

Les compétences C5, C6 et C12 sont réévaluées après le bac à sable de l'étape 4.
