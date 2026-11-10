# Rétroplanning

Point de départ : mardi 10 novembre 2026. Soutenance : mardi 13 et mercredi 14 avril 2027. Il y a 22 semaines entre les deux.

Hypothèse à confirmer : ma disponibilité hebdomadaire. Le calendrier ci-dessous est exprimé en semaines et devra être recalé une fois ce chiffre connu.

## Calendrier

| Semaines | Dates | Étape | Jalon de fin |
|---|---|---|---|
| S1 | 10 au 15 novembre | 1. Cadrage | Décisions validées, dépôt en ligne |
| S2 à S4 | 16 novembre au 6 décembre | 2. Processus de développement | Indicateurs, cycle DevSecOps, schéma CI/CD, stratégie de tests, compétences et formation |
| S5 à S6 | 7 au 20 décembre | 3. Exigences et architecture | Backlog et schéma d'architecture validés |
| S7 à S8 | 21 décembre au 3 janvier | Marge (fêtes de fin d'année) | — |
| S9 à S11 | 4 au 24 janvier | 4. Bac à sable | Trois protocoles d'expérimentation rédigés |
| S12 à S14 | 25 janvier au 14 février | 5. Développement du prototype | Chaque critère d'acceptation prouvé par un test |
| S15 à S16 | 15 au 28 février | 6. Pipeline CI/CD | Pipeline réussi de bout en bout |
| S17 à S18 | 1er au 14 mars | 7. Déploiement, observabilité, charge | Test de charge joué sur l'environnement cible |
| S19 | 15 au 21 mars | 8. Audit et remédiation | Plan de remédiation priorisé |
| S20 à S21 | 22 mars au 4 avril | 9. Soutenance | Support, script de démonstration, vidéo de secours |
| S22 | 5 au 12 avril | Gel du code et répétitions | Deux répétitions chronométrées, plus aucune modification du code |
| — | 13 et 14 avril | Soutenance | — |

## Marges

- Deux semaines aux fêtes de fin d'année, utilisables pour rattraper un retard des étapes 2 et 3.
- Une semaine de gel avant la soutenance : seules les répétitions et la vérification de l'environnement de démonstration y sont permises.

## Échéances qui conditionnent la suite

| Échéance | Décision ou action | Étape bloquée sinon |
|---|---|---|
| 20 décembre 2026 | Réponse de l'intervenant sur l'« environnement managé » | 7 (choix de l'environnement cible) |
| 3 janvier 2027 | Comptes et accès prêts : SonarQube Cloud relié au dépôt, moteur de conteneurs et k3d installés sur le poste | 4 (bac à sable) |
| 28 février 2027 | Environnement cible commandé (machine virtuelle ou Kubernetes managé) | 7 (déploiement) |
| 5 avril 2027 | Gel du code, vidéo de secours enregistrée | Soutenance |

## Diagramme de Gantt

```mermaid
gantt
    title Rétroplanning jusqu'à la soutenance des 13 et 14 avril 2027
    dateFormat YYYY-MM-DD
    axisFormat %d/%m
    tickInterval 2week

    section Phase 1
    1. Cadrage                          :e1, 2026-11-10, 2026-11-16
    2. Processus de développement       :e2, 2026-11-16, 2026-12-07

    section Phase 2
    3. Exigences et architecture        :e3, 2026-12-07, 2026-12-21
    Marge (fêtes)                       :m1, 2026-12-21, 2027-01-04
    4. Bac à sable                      :e4, 2027-01-04, 2027-01-25
    5. Développement du prototype       :e5, 2027-01-25, 2027-02-15
    6. Pipeline CI/CD                   :e6, 2027-02-15, 2027-03-01
    7. Déploiement, observabilité, charge :e7, 2027-03-01, 2027-03-15

    section Phase 3
    8. Audit et remédiation             :e8, 2027-03-15, 2027-03-22

    section Soutenance
    9. Préparation de la soutenance     :e9, 2027-03-22, 2027-04-05
    Gel du code et répétitions          :crit, g1, 2027-04-05, 2027-04-13
    Soutenance                          :milestone, s1, 2027-04-13, 0d
```
