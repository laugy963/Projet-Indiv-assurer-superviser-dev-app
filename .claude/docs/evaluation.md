# Évaluation : consignes et grille

Source : `Contexte et Consigne - Indiv/Consignes eval bloc Superviser et Assurer Développment.pdf` et `INFMAALSIA2V_Grille dévaluation bloc - Superviser dev des apps logicielles.xlsx`.

## Mission

Lead Developer de l'entreprise du contexte. Livrer une v1 avec :

- un pipeline CI/CD avec tests automatisés ;
- un déploiement par un orchestrateur ou un fournisseur cloud ;
- une sécurité minimale : HTTPS, authentification / autorisation, scan de vulnérabilités ;
- au moins une fonctionnalité métier (pas toute l'application).

Trois phases, puis soutenance : 1. processus de développement ; 2. développement et déploiement du POC ; 3. analyse sécurité et plan de remédiation.

## Phase 1 — Processus de développement

- Indicateurs : 4 indicateurs ou métriques de conformité aux exigences de qualité (ISO 25010 possible). Justifier comment leur suivi évite l'accumulation de dette technique.
- Cycle de vie DevSecOps : mesures de sécurité pour chaque étape clé.
- Schéma détaillé du processus CI/CD.
- Tests automatisés dans le pipeline : types (unitaires, intégration…), outils (frameworks de test, analyse de code). Montrer comment ces outils suivent les indicateurs.
- Compétences : cartographier les compétences nécessaires, proposer au moins une action de formation. Pas de contrainte de budget ni d'effectif, mais profils réalistes (pas de « mouton à 5 pattes »).

## Phase 2 — POC

- Exigences : reformuler les exigences fonctionnelles ; backlog de la fonctionnalité (user stories + critères d'acceptation).
- Schéma d'architecture technique intégrant la sécurité et les choix (base de données, protocole, framework…).
- Bac à sable : tester les technologies critiques (plateformes support des composants) avant de développer. Synthèse du protocole : environnement de test, étapes pour reproduire, résultats, difficultés, limites, décision d'adopter ou de rejeter.
  - Valides : plateforme CI/CD avec qualité de code et tests, service mesh, API gateway / résilience / découverte de services, broker de messages sur Kubernetes avec test de publication-consommation, cert-manager pour un Ingress, clustering de SGBD, observabilité, serverless, traitement distribué multi-nœuds.
  - Non valides : tester un langage, la communication front/back (REST, gRPC, WebSocket), des tests unitaires en local, un composant écrit avec un framework (MVC, ORM, service REST).
- Développement (niveau prototype) :
  - fonctionnalité conforme au backlog, prouvée par des tests d'appel voire d'acceptation (ils peuvent compter parmi les 2 types de tests du pipeline) ;
  - composants conformes à l'architecture et aux choix retenus ;
  - une solution de sécurité (HTTPS/TLS, authentification et autorisation via un serveur type Keycloak, détection de vulnérabilités) ;
  - une composante d'observabilité (logs centralisés, métriques ou traces distribuées) ;
  - pipeline CI/CD avec au minimum 2 types de tests qui alimentent les métriques. Pas de pénalité si l'étape de déploiement en (pré)production manque.
- Montée en charge : présentée en soutenance par un test de charge (Siege, JMeter…). Intégration au pipeline facultative.

## Phase 3 — Remédiation

- Analyser les résultats des tests et les métriques collectées.
- Identifier les vulnérabilités potentielles, notamment à partir des tests de charge.
- Préconisations justifiées et adaptées au contexte. La grille vise le parc applicatif du SI, pas seulement le POC (voir `contexte-entreprise.md`).

## Soutenance

- 20 min + 15 min d'échange. Évaluation technique : jury de spécialistes, pas de vulgarisation, termes précis.
- Schémas lisibles et complets ; la forme du support n'est pas notée.
- Démo préparée pour éviter « l'effet démo » ; vidéo de secours conseillée.

## Grille sur 20

| Thème | Critère | Pts |
|---|---|---|
| Expertise | Protocole bac à sable : technologies testées et leurs interactions, difficultés, résultats qui valident l'adoption | 2 |
| Expertise | POC valide la faisabilité des points clés de l'architecture (découpage, communication interservice, sécurité, hébergement, orchestration) et il est documenté | 4 |
| Expertise | La fonctionnalité métier répond aux besoins de la maîtrise d'ouvrage | 1 |
| Pilotage | Livraison continue schématisée, conforme aux exigences ; le POC intègre la plateforme comme décrit | 3 |
| Pilotage | Compétences recensées, expertises à acquérir identifiées, au moins une action de formation | 1 |
| Pilotage | POC exécuté dans un environnement managé ; disponibilité et montée en charge démontrées | 2 |
| Qualité | Au moins 4 indicateurs (fonctionnalité, performance, maintenabilité, fiabilité) dont la mesure révèle des axes de réduction de la dette | 1 |
| Qualité | Processus de test formalisé (types, outils, parties prenantes) ; au moins 2 types appliqués au POC, exécutés avec succès | 2 |
| Qualité | Plan de remédiation priorisé sur les risques critiques du parc applicatif du SI ; au moins 2 bonnes pratiques de sécurité dans le POC | 2 |
| Oral | Schémas et tableaux lisibles, au service de l'oral | 1 |
| Oral | Prestation fluide, structurée, vocabulaire précis | 1 |

Lettres : A acquis ; B acquis avec écarts mineurs ; C non acquis, écarts majeurs ; D non acquis, écarts critiques.
