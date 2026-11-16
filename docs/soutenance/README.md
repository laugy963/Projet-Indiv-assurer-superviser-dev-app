# Étape 9 — Soutenance

- Date : 16 novembre 2026
- Statut : en attente de validation
- Soutenance : 13 et 14 avril 2027 ; 20 minutes de présentation, 15 minutes de questions ; jury de spécialistes du développement
- Preuve : [demonstration.txt](../../tests/resultats/demonstration.txt), répétition du 16 novembre 2026

## 1. Objet

Préparer la soutenance : ce que je montre, dans quel ordre, en combien de temps, et ce que je réponds. Ce dossier ne contient pas le diaporama : il en donne le contenu exact, que je monte moi-même.

## 2. Paramètres fixés à cette étape

Choix du 16 novembre 2026.

| Paramètre | Choix | Alternative écartée | Conséquence |
|---|---|---|---|
| Forme du support | Contenu de chaque diapositive en Markdown | Y ajouter un fichier PowerPoint généré | La grille ne note pas la forme. Le montage me revient : 2 à 3 heures. Rien de binaire à tenir à jour d'ici avril |
| Démonstration | La chaîne complète, la sécurité, la perte d'un pod | Y ajouter un essai de charge k6 en direct | La montée en charge est montrée par les captures du 15 novembre. Le poste de 8 Go ne porte pas le cluster, k6 et le support ensemble |
| Répétition | Jouée et chronométrée le 16 novembre, sur le cluster local | Écrire le script sans le jouer | Les durées techniques sont mesurées. La répétition a trouvé un défaut de la vérification, corrigé |
| Conteneurs étrangers au projet | Arrêtés pendant la répétition, puis relancés | Les laisser tourner | Mesures plus fiables. À refaire le jour de la soutenance |

## 3. Livrables

| Livrable demandé | Emplacement |
|---|---|
| Plan chronométré sur 20 minutes | [01-plan-et-diapositives.md](01-plan-et-diapositives.md), paragraphe 2 |
| Contenu de chaque diapositive | [01-plan-et-diapositives.md](01-plan-et-diapositives.md), paragraphe 3 : 16 diapositives |
| Schémas lisibles | [architecture](../schemas/architecture-technique.md), [cycle DevSecOps](../schemas/cycle-devsecops.md), [pipeline réalisé](../schemas/pipeline-realise.md) (nouveau), [captures de la charge](../captures/README.md) |
| Script de démonstration | [deploy/k8s/demo.sh](../../deploy/k8s/demo.sh) ; déroulé et paroles dans [02-demonstration.md](02-demonstration.md), paragraphe 2 |
| Checklist avant la démonstration | [02-demonstration.md](02-demonstration.md), paragraphe 4 |
| Vidéo de secours | Non enregistrée : consignes dans [02-demonstration.md](02-demonstration.md), paragraphe 6 |
| Vingt questions probables du jury, avec leurs réponses | [03-questions-du-jury.md](03-questions-du-jury.md) |

## 4. Ce qui a été exécuté

| Action | Résultat |
|---|---|
| Vérification du déploiement après un démarrage du cluster | 48 contrôles sur 49 : un défaut de la vérification elle-même, corrigé ; puis 49 sur 49 en 55 s |
| Démonstration, trois répétitions sans pause | Aucun écart ; 14 à 16 s de durée technique |
| Démonstration, mode direct, touche Entrée simulée | Aucun écart |
| Export du schéma du pipeline réalisé | Image relue |

Détail et difficultés : [02-demonstration.md](02-demonstration.md), paragraphe 3.

## 5. Ce qui n'a pas été exécuté

| Sujet | État | Qui |
|---|---|---|
| Montage du diaporama | Non fait : choix du paragraphe 2 | Moi |
| Répétition à voix haute, chronométrée | Non faite : les durées de parole du plan sont des cibles | Moi, deux fois, dans la semaine du 5 avril 2027 |
| Vidéo de secours | Non enregistrée | Moi, après le gel du code du 5 avril 2027 |
| Captures d'écran du pipeline et de SonarQube Cloud | Non faites. GitHub ne garde les journaux que 90 jours | Moi, avant le 12 février 2027 pour les exécutions de novembre |
| Projection sur un second écran | Non essayée | Moi |

## 6. À mettre à jour avant la soutenance

Ce dossier est écrit cinq mois avant la soutenance. Il décrit l'état du 16 novembre 2026. Trois événements le feront changer.

| Événement | Ce qui change |
|---|---|
| L'environnement distant est commandé (échéance : 28 février 2027) | Diapositives 4, 10, 12 et 15 ; question 14 ; schéma du pipeline réalisé ; la démonstration peut viser l'environnement distant |
| Les six actions du jalon J1 de l'[audit](../08-audit-et-remediation.md) sont faites | Diapositives 13 et 14 : dire ce qui est corrigé, avec la preuve ; question 19 |
| L'intervenant répond sur l'« environnement managé » (échéance : 20 décembre 2026) | Question 14 ; diapositive 10 |

Règle : toute modification du prototype d'ici le gel du code impose de rejouer `deploy/k8s/verifier.sh` et `deploy/k8s/demo.sh repetition`.

## 7. Suite

Il n'y a pas d'étape 10. Restent le montage du support, les trois événements du paragraphe 6, le gel du code le 5 avril 2027, puis deux répétitions chronométrées.
