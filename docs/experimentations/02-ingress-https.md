# Expérimentation 2 — Ingress HTTPS : Traefik et cert-manager

- Date : 13 novembre 2026
- Décision : adopter
- Code : [sandbox/02-ingress-https/](../../sandbox/02-ingress-https/)
- Preuve : [resultats/execution.txt](../../sandbox/02-ingress-https/resultats/execution.txt)

## 1. Objectif

Vérifier que l'exposition en HTTPS décrite par la fiche 0010 fonctionne sur le cluster local.

| # | Hypothèse à vérifier |
|---|---|
| H1 | Toute requête HTTP est redirigée vers HTTPS |
| H2 | cert-manager émet le certificat d'un Ingress à partir d'une simple annotation |
| H3 | Traefik sert ce certificat, et un client qui connaît l'autorité de certification valide la connexion |
| H4 | Le certificat se renouvelle tout seul, sans redémarrer Traefik ni couper le service |
| H5 | cert-manager tient dans la mémoire du poste |

« cert-manager pour un Ingress » figure dans la liste des expérimentations valides des consignes.

## 2. Environnement

| Élément | Valeur |
|---|---|
| Poste et cluster | Comme l'expérimentation 1 : k3d 5.9.0, k3s 1.35.5 |
| Contrôleur Ingress | Traefik 3.6.13, fourni par k3s (chart Helm 39.0.7) |
| cert-manager | 1.21.3, installé par Helm 4.3.2 depuis `oci://quay.io/jetstack/charts/cert-manager` |
| Service de démonstration | `traefik/whoami:v1.12.0` : il renvoie la requête reçue |
| Espaces de noms | `cert-manager`, `bac-a-sable-https` |

En local, aucune autorité publique ne peut joindre le poste. Le certificat vient donc d'une autorité de certification créée dans le cluster, en trois objets :

| Objet | Rôle |
|---|---|
| ClusterIssuer `auto-signe` | Émetteur auto-signé. Il ne sert qu'à signer le certificat de l'autorité locale |
| Certificate `ac-locale` | Le certificat de l'autorité locale. Sa clé privée reste dans un Secret du cluster |
| ClusterIssuer `ac-locale` | L'émetteur que les Ingress utilisent |

Le nom d'hôte `api.epouvante.test` n'existe dans aucun DNS. Les appels utilisent l'option `--resolve` de curl pour l'associer à l'adresse locale, comme dans le cours Kubernetes.

## 3. Reproduire

```bash
sandbox/02-ingress-https/run.sh
```

Durée mesurée : 1 min 40 s. cert-manager reste installé d'une exécution à l'autre.

| Étape du script | Action |
|---|---|
| Installation | `helm upgrade --install cert-manager …`, version figée |
| Test 1 | Applique le réglage de redirection de Traefik, puis appelle en HTTP |
| Préparation | Crée l'autorité locale, déploie le service et son Ingress annoté |
| Tests 2 et 3 | Lit l'état du certificat, appelle en HTTPS avec le certificat de l'autorité, affiche le certificat servi |
| Test 4 | Appelle en HTTPS sans le certificat de l'autorité |
| Test 5 | Le certificat est demandé pour 1 h, à renouveler 59 min avant sa fin : le script attend le renouvellement |
| Test 6 | Retire la durée courte, supprime le Secret, attend la réémission |
| Mesure | `kubectl top pod` |

## 4. Résultats

Exécution du 13 novembre 2026 à 12 h 09 : 12 contrôles, 12 réussis.

| Hypothèse | Contrôle | Attendu | Obtenu |
|---|---|---|---|
| H1 | Réponse à une requête HTTP | `301 https://api.epouvante.test/` | `301 https://api.epouvante.test/` |
| H2 | État du certificat `api-tls` | `True` | `True` |
| H2 | Type du Secret créé | `kubernetes.io/tls` | `kubernetes.io/tls` |
| H3 | Code HTTP et vérification TLS (0 = chaîne valide) | `200 0` | `200 0` |
| H3 | Code de sortie de curl sans le certificat de l'autorité | 60 | 60 |
| H4 | Le certificat servi a changé après le renouvellement | oui | oui |
| H4 | Le pod Traefik est le même | même nom | même nom |
| H4 | Redémarrages de Traefik pendant le test | 0 | 0 |
| H4 | L'appel HTTPS vérifié fonctionne toujours | `200 0` | `200 0` |
| H4 | Secret recréé par cert-manager après sa suppression | `kubernetes.io/tls` | `kubernetes.io/tls` |
| H4 | Validité restante du certificat réémis, en jours | 89 | 89 |
| H4 | L'appel HTTPS vérifié fonctionne après la réémission | `200 0` | `200 0` |

Certificat servi par Traefik :

```
issuer=CN=AC locale du bac a sable
X509v3 Subject Alternative Name: critical
    DNS:api.epouvante.test
```

Renouvellement observé :

```
Avant : révision 1, serial=30005CF1A34B9F45E68A69580D4A442F2ADE0153
Après 62 s : révision 2, serial=6FE66356E04FA766999D134306D96D7D9C2A043E
```

| Mesure | Valeur |
|---|---|
| cert-manager prêt | 24 s à la première exécution, téléchargement compris |
| Certificat émis après la création de l'Ingress | 2 à 4 s |
| Renouvellement automatique | 57 s et 62 s sur deux exécutions |
| Certificat réémis après suppression du Secret | Valable du 13 novembre 2026 au 11 février 2027 : 90 jours, la durée par défaut |
| Mémoire de cert-manager (H5), trois pods | 61 Mio à la fin du script ; 97 Mio lors de la mesure globale |
| Mémoire de Traefik | 26 Mio |

## 5. Difficultés rencontrées

| # | Constat | Cause | Solution |
|---|---|---|---|
| 1 | La clé de réglage de la redirection dépend de la version du chart Traefik | Le chart 39 range ce réglage sous `ports.web.http.redirections.entryPoint`. Les tutoriels plus anciens citent d'autres clés | Clé lue dans le fichier `values.yaml` du chart embarqué par k3s, avant d'écrire le réglage. Elle a fonctionné du premier coup |
| 2 | Retirer la durée courte de l'Ingress ne réémet pas le certificat : il garde sa fin à 1 h | cert-manager n'applique une nouvelle durée qu'au renouvellement suivant | Supprimer le Secret : cert-manager le recrée aussitôt, avec la durée par défaut. Devenu le test 6 |
| 3 | Le certificat servi a un sujet vide (`subject=`) | Normal : cert-manager ne remplit que le nom alternatif (SAN), seul champ que lisent les clients actuels | Aucune : ce n'est pas un défaut |

Aucun contrôle n'a échoué pendant cette expérimentation.

## 6. Limites

| Limite | Conséquence |
|---|---|
| Autorité de certification locale | Le certificat n'est reconnu que par un client qui possède le certificat de l'autorité (test du code 60). Un navigateur affichera une alerte |
| Let's Encrypt n'est pas testé | Impossible en local : l'autorité publique doit joindre le cluster. À faire à l'étape 7, avec un nom de domaine. Seul l'émetteur change, pas l'Ingress |
| La durée de 1 h est artificielle | Elle sert à observer un renouvellement en une minute. La durée réelle est de 90 jours |
| La redirection est globale | Elle s'applique à tous les Ingress du cluster. C'est voulu : aucun service ne doit répondre en HTTP |
| Le réglage de Traefik passe par un objet propre à k3s (`HelmChartConfig`) | Sur un Kubernetes managé, Traefik s'installe et se règle autrement (fiche 0003, option de repli) |
| Pas de DNS : `--resolve` dans chaque appel | Sans gêne pour des tests ; un navigateur demanderait une entrée dans le fichier `hosts` |

## 7. Décision

Adopter Traefik et cert-manager. Les cinq hypothèses sont confirmées : la fiche 0010 est maintenue.

Règles à reprendre à l'étape 7 :

1. Un Ingress demande son certificat par l'annotation `cert-manager.io/cluster-issuer`.
2. Passer à Let's Encrypt revient à créer un autre émetteur et à changer cette annotation.
3. La redirection HTTP vers HTTPS se règle une fois, au niveau de Traefik.
4. Vérifier la clé de réglage dans le chart réellement installé, pas dans un tutoriel.
