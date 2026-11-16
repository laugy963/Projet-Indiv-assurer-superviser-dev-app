# Soutenance — Démonstration : script, checklist, repli

- Date : 16 novembre 2026
- Statut : en attente de validation
- Script : [deploy/k8s/demo.sh](../../deploy/k8s/demo.sh)
- Preuve de la répétition : [demonstration.txt](../../tests/resultats/demonstration.txt), [deploiement.txt](../../tests/resultats/deploiement.txt)
- Place dans la soutenance : diapositive 11 du [plan](01-plan-et-diapositives.md), 3 minutes 30

## 1. Parti pris

| Choix | Raison |
|---|---|
| Une seule commande, `deploy/k8s/demo.sh` | Rien à taper devant le jury : pas de faute de frappe, pas de jeton à copier |
| Huit temps, déclenchés par la touche Entrée | Je parle, puis je montre. Le rythme reste le mien |
| Chaque temps affiche la commande jouée, le résultat, et le compare au résultat attendu | Le jury voit de vraies commandes et un verdict, pas un film |
| Chaque temps redemande ses jetons | Un jeton vit 120 secondes : mes pauses ne doivent pas le faire expirer |
| Le script ne s'arrête pas sur un écart | En soutenance, on commente l'écart et on continue |
| La montée en charge n'est pas rejouée | Le test complet dure 13 minutes et sature le poste de 8 Go. Elle est montrée par les captures du 15 novembre, diapositive 12 |

Ce que la démonstration prouve, face à la grille :

| Point de la grille | Temps |
|---|---|
| Orchestration, hébergement sur Kubernetes | 1, 8 |
| Sécurité : HTTPS, authentification, autorisation | 2, 3, 7 |
| Découpage et communication entre services | 4, 5, 6 |
| La fonctionnalité répond au besoin | 4, 5, 6 |
| Disponibilité | 8 |

## 2. Script

Lancement : `deploy/k8s/demo.sh`, depuis la racine du dépôt. Le terminal est en plein écran, police agrandie.

La colonne « technique » est mesurée : c'est le temps que prend le script, sans la parole. La colonne « visée » est une cible, parole comprise, à vérifier à voix haute.

| Temps | Ce que le script montre | Résultat attendu | Ce que je dis | Technique | Visée |
|---|---|---|---|---|---|
| 1 | `kubectl get pods,hpa` | Deux pods prêts par service ; HPA de 2 à 4 pods, cible 70 % | « Le prototype tourne sur Kubernetes. Deux pods par service au minimum : la perte de l'un n'interrompt rien. Le HPA mesure le processeur et ajoute des pods au-dessus de 70 %. » | 1 s au plus | 25 s |
| 2 | Appel en HTTP, puis en HTTPS sans jeton | 301 vers HTTPS ; 401, certificat vérifié | « Tout passe par un seul point d'entrée, en HTTPS. Le certificat est émis par cert-manager, et le client le vérifie. Sans jeton, la réponse est 401, avec un message sans détail technique. » | 1 s au plus | 20 s |
| 3 | Demande d'un jeton à Keycloak ; contenu du jeton | Émetteur, destinataire `api-epouvante`, rôle `membre`, 120 s | « Le service ne voit aucun mot de passe. Keycloak délivre un jeton signé. Le service y vérifie la signature, l'émetteur, le destinataire, puis lit le rôle. Le jeton vit deux minutes. » | 1 s au plus | 25 s |
| 4 | Le membre B déclare un centre d'intérêt | 200 | « Le membre B s'intéresse aux figurines. C'est le service notifications qui l'enregistre. » | 1 s au plus | 10 s |
| 5 | Le membre A publie une annonce | 201, annonce au statut « publiée » | « Le membre A publie un don de figurine. C'est le service annonces qui répond, et il émet un événement sur RabbitMQ. » | 1 s au plus | 15 s |
| 6 | Le membre B lit ses notifications | La notification de cette annonce | « Le membre B est notifié. Les deux services ne se sont pas appelés : l'événement a traversé le broker. Si le service notifications était arrêté, la publication réussirait quand même, et la notification arriverait à son retour. » | 1 s au plus | 25 s |
| 7 | Retrait par un membre, puis par le modérateur | 403, puis 204 | « L'autorisation se fait par rôle, dans le service. Un membre ne peut pas modérer : 403. Le modérateur retire l'annonce : 204. » | 1 s au plus | 20 s |
| 8 | Suppression d'un pod ; 40 lectures pendant son remplacement | 40 réponses 200 ; un nouveau pod prêt | « Je supprime un pod du service annonces. Pendant que Kubernetes le remplace, 40 appels partent : aucun n'échoue. Le pod attend 5 secondes avant de s'arrêter, le temps que le point d'entrée cesse de lui adresser des requêtes. » | 13 s | 35 s |
| Navigateur | La dernière exécution du pipeline ; SonarQube Cloud | 10 jobs verts ; quality gate tenu | « Cette image a été construite, scannée et testée par ce pipeline. » | — | 25 s |

Total visé : 3 minutes 20, soit 10 secondes de marge sur les 3 minutes 30 du plan. Au temps 8, je parle pendant les 13 secondes d'attente. Si le temps manque, le navigateur saute : le pipeline est déjà sur la diapositive 4.

## 3. Répétition du 16 novembre 2026

Sur le cluster k3d du poste, images du pipeline (commit `9d094de`), les autres conteneurs du poste arrêtés.

| Mesure | Valeur |
|---|---|
| Démarrage du cluster | 26 s |
| Du lancement au prototype prêt (deux pods par service) | 6 min 20 s au plus : borne haute, le relevé a commencé tard |
| `deploy/k8s/verifier.sh`, premier passage après le démarrage | 48 contrôles réussis sur 49, en 132 s : point 1 ci-dessous |
| `deploy/k8s/verifier.sh` corrigé, état du démarrage recréé | 49 contrôles réussis sur 49, en 55 s |
| `deploy/k8s/demo.sh repetition`, trois fois de suite | Aucun écart ; 16 s, 14 s, 15 s |
| `deploy/k8s/demo.sh`, touche Entrée simulée | Aucun écart ; 11 résultats conformes |
| Mémoire du nœud pendant la répétition | 2 339 Mio, soit 59 % |

Ce que la répétition a trouvé :

| # | Symptôme | Cause | Solution |
|---|---|---|---|
| 1 | Après le démarrage, `verifier.sh` échoue sur 1 contrôle sur 49 : « le 95e centile se calcule » | Prometheus n'a pas de volume : il repart sans historique. Un taux se calcule sur deux mesures, et il est nul si rien n'a bougé entre les deux. Les appels de la vérification tombaient dans une seule collecte | `verifier.sh` entretient un trafic léger pendant qu'il attend la mesure. Prouvé en recréant l'état du démarrage (pods neufs, Prometheus sans historique, aucune série) : 49 sur 49 |
| 2 | Une première contre-épreuve réussissait sans rien prouver | Les anciens pods avaient laissé des mesures récentes dans Prometheus : le centile se calculait sans la correction | Contre-épreuve refaite après suppression du pod de Prometheus et remplacement des pods des services |
| 3 | Un jeton obtenu au temps 3 serait expiré au temps 7, si je parle plus de deux minutes | Durée de vie de 120 secondes | Chaque temps redemande ses jetons |

Le premier point est un vrai risque de soutenance : le cluster sera démarré le matin même, donc dans cet état exact. Sans la répétition, la vérification du matin aurait échoué.

Ce qui n'a pas été répété : la parole, le passage au navigateur, la projection sur un second écran, la vidéo de secours.

## 4. Checklist

### Une semaine avant

| # | Vérification | Commande ou geste |
|---|---|---|
| 1 | Le dépôt est à jour, le pipeline de `main` est vert | `git pull`, `gh run list --branch main --limit 1` |
| 2 | Le cluster démarre, le prototype est prêt | `k3d cluster start epouvante`, attendre 6 minutes |
| 3 | La vérification réussit | `deploy/k8s/verifier.sh` : 49 sur 49 |
| 4 | La démonstration réussit | `deploy/k8s/demo.sh repetition` : aucun écart |
| 5 | La vidéo de secours est enregistrée et lisible sans réseau | Paragraphe 6 |
| 6 | Deux répétitions complètes, à voix haute, chronométrées | 20 minutes au plus |
| 7 | Le support est en PDF sur le poste et sur une clé USB | — |

### La veille

| # | Vérification | Commande ou geste |
|---|---|---|
| 1 | Aucune mise à jour du système, de Docker ni de k3d d'ici la soutenance | Le code est gelé depuis le 5 avril 2027 ; les outils aussi |
| 2 | Les autres conteneurs du poste sont arrêtés | `docker ps` ne montre rien |
| 3 | Le poste est rechargé ; chargeur et adaptateur vidéo dans le sac | — |
| 4 | Notifications du système coupées | Mode « Ne pas déranger » |

### Le jour même, une heure avant

| # | Vérification | Commande ou geste | Durée mesurée |
|---|---|---|---|
| 1 | Fermer tout ce qui ne sert pas : le poste n'a que 8 Go | Garder le terminal, le support, un navigateur à deux onglets | — |
| 2 | Démarrer le cluster | `k3d cluster start epouvante` | 26 s |
| 3 | Attendre que le prototype soit prêt | `source deploy/k3d/env.sh`, puis `kubectl -n epouvante get pods` : deux pods par service | 6 min |
| 4 | Vérifier le déploiement | `deploy/k8s/verifier.sh` : 49 sur 49 | 55 s |
| 5 | Répéter la démonstration | `deploy/k8s/demo.sh repetition` : aucun écart | 16 s |
| 6 | Préparer le terminal | Plein écran, police agrandie, fond clair, historique effacé, commande `deploy/k8s/demo.sh` prête | — |
| 7 | Préparer le navigateur | Onglet 1 : la dernière exécution du pipeline sur `main`. Onglet 2 : le tableau de bord de SonarQube Cloud | — |
| 8 | Ne pas ouvrir Grafana | Le poste ne tient pas le prototype, Grafana et le support ensemble | — |
| 9 | Vidéo de secours ouverte, en pause, hors ligne | — | — |

Compter 15 minutes pour les lignes 2 à 5.

### Juste avant de parler

| # | Vérification |
|---|---|
| 1 | Le second écran affiche bien le terminal quand je bascule |
| 2 | Le réseau de la salle ne sert qu'au navigateur : la démonstration elle-même tourne sur le poste, sans Internet |

## 5. Plans de repli

| Panne | Signe | Réponse | Temps perdu |
|---|---|---|---|
| Un écart dans un temps | Ligne « ÉCART » | Le dire, l'expliquer en une phrase, appuyer sur Entrée. Le script continue | 10 s |
| Le script reste bloqué | Rien pendant 15 secondes | `Ctrl-C`, basculer sur la vidéo de secours à ce temps-là | 20 s |
| Le cluster ne répond plus | Erreurs de connexion dès le temps 1 | Vidéo de secours, sans insister. Ne pas redémarrer le cluster devant le jury : 6 minutes | 20 s |
| Pas de réseau dans la salle | Le navigateur ne charge pas | Sauter le navigateur : le pipeline est sur la diapositive 4 | 0 s |
| Pas de vidéoprojecteur compatible | — | Support en PDF sur clé USB ; démonstration sur l'écran du poste, tourné vers le jury | — |

Règle : une seule tentative. Si la démonstration ne part pas, la vidéo prend le relais et les 3 minutes 30 sont tenues.

## 6. Vidéo de secours

Elle n'est pas enregistrée : elle doit montrer mon écran et porter ma voix. Échéance du rétroplanning : le 5 avril 2027, avec le gel du code.

| Point | Consigne |
|---|---|
| Contenu | Exactement les huit temps du script, dans l'ordre, puis le navigateur |
| Durée | 3 minutes 30 au plus : elle remplace la démonstration, elle ne s'y ajoute pas |
| Prise | Enregistrement d'écran du poste, terminal en plein écran, police agrandie ; voix enregistrée en même temps |
| Commande filmée | `deploy/k8s/demo.sh`, en appuyant sur Entrée à mon rythme |
| Découpage | Un chapitre par temps, pour reprendre au temps où la démonstration a cassé |
| Stockage | Sur le poste et sur la clé USB ; jamais en ligne seulement |
| Date | Après le gel du code : la vidéo doit montrer la version présentée |
| Hors du dépôt | Un fichier vidéo ne se versionne pas ici : le dépôt est public et la vidéo porte ma voix |

## 7. Reproduire

Depuis la racine du dépôt. Commandes exécutées avec succès le 16 novembre 2026.

| Action | Commande |
|---|---|
| Démarrer le cluster | `k3d cluster start epouvante` |
| Vérifier le déploiement | `deploy/k8s/verifier.sh` |
| Répéter la démonstration et réécrire la preuve | `deploy/k8s/demo.sh repetition` |
| Jouer la démonstration en direct | `deploy/k8s/demo.sh` |
| Arrêter le cluster | `k3d cluster stop epouvante` |
