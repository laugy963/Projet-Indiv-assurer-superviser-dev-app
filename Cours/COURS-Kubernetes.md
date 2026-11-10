# Kubernetes : le cours derrière les TP (INFAL127)

Ce document reprend les 19 TP du dépôt : ce qu'ils enseignent, pourquoi on fait chaque manipulation, et comment réutiliser les mêmes méthodes sur un autre projet Kubernetes.

| Partie | Pour quoi faire |
| --- | --- |
| [0. Les idées fondatrices](#0-les-idées-fondatrices) | Les 6 principes qui expliquent tous les TP |
| [1. La carte des objets](#1-la-carte-des-objets) | Comment les objets s'emboîtent |
| [A. Le cours, notion par notion](#a-le-cours-notion-par-notion) | Rôle, manifeste type, commandes et pièges de chaque notion |
| [B. Les méthodes réutilisables](#b-les-méthodes-réutilisables) | Diagnostiquer, déployer une nouvelle appli, vérifier, transposer hors k3s |
| [C. Antisèche des commandes](#c-antisèche-des-commandes) | Les commandes, regroupées par usage |
| [D. Les pièges classiques](#d-les-pièges-classiques) | Les erreurs que les TP font commettre exprès |
| [E. Pour aller plus loin](#e-pour-aller-plus-loin) | Ce que les TP n'abordent pas, mais que l'on rencontre vite |
| [F. Auto-évaluation](#f-auto-évaluation) | Les questions des TP, avec leurs réponses |

---

## 0. Les idées fondatrices

Six idées expliquent presque tout ce que l'on observe dans les TP.

1. **Déclaratif et réconciliation.** On décrit l'état voulu dans un fichier YAML. Des contrôleurs comparent en boucle l'état voulu et l'état réel, puis corrigent l'écart. C'est pour cela qu'un pod supprimé revient (TP 3), qu'un nouveau nœud reçoit son agent (TP 5) et qu'une mise à jour progressive se déroule seule (TP 4).
   **Conséquence :** le fichier est la source de vérité. Toute modification impérative (`kubectl scale`, `kubectl set image`, `helm --set`) crée un écart entre Git et le cluster.

2. **Les labels relient les objets entre eux.** Aucun objet n'en « contient » un autre. Un ReplicaSet compte les pods qui portent ses labels, un Service envoie le trafic aux pods qui portent ses labels, une NetworkPolicy filtre selon les labels. Pour Kubernetes, l'identité d'un pod, ce sont ses labels (TP 3, 6 et 13).

3. **Le pod est jetable, d'autres objets apportent la stabilité.** Un pod peut mourir et renaître ailleurs, avec une autre IP. On stabilise avec un **Service** (IP et nom DNS fixes), un **PVC** (données durables), une **ConfigMap** ou un **Secret** (configuration hors de l'image).

4. **On empile des abstractions et on n'écrit que celle du haut.** Conteneur ⊂ Pod ⊂ ReplicaSet ⊂ Deployment ⊂ release Helm. On écrit le Deployment, jamais les ReplicaSets.

5. **Moindre privilège, à chaque couche.** Droits sur l'API (RBAC), jeton (ServiceAccount), réseau (NetworkPolicy), processus (securityContext), namespace (Pod Security Admission), image (scan, tag fixe).

6. **Observer avant d'agir.** `get` → `describe` (section `Events`) → `logs` → `exec`. Chaque statut d'erreur a sa commande de diagnostic (TP 2).

---

## 1. La carte des objets

```text
                         navigateur / client HTTP
                                   │
                ┌──────────────────▼───────────────────┐
                │ Service LoadBalancer du contrôleur   │  IP externe fournie par l'infra
                │ (Traefik sur k3s)                    │  (Klipper sur k3s, LB du cloud ailleurs)
                └──────────────────┬───────────────────┘
                ┌──────────────────▼───────────────────┐
                │ Ingress : règles par hôte / chemin   │  TLS : Secret de type tls
                └──────────────────┬───────────────────┘
                ┌──────────────────▼───────────────────┐
                │ Service ClusterIP                    │  IP + nom DNS stables,
                │ selector: {app: monapp}              │  ne vise que les pods READY
                └──────────────────┬───────────────────┘
                                   │
   HPA ──► Deployment ──► ReplicaSet ──► Pod ──► conteneur(s)
   (metrics-server)                       │
                                          ├─ env / envFrom ◄──── ConfigMap, Secret
                                          ├─ volumes ◄────────── PVC ──► PV ◄── StorageClass
                                          ├─ serviceAccountName ◄ ServiceAccount ◄── RoleBinding ──► Role
                                          ├─ securityContext, requests / limits, sondes
                                          └─ labels ◄─────────── NetworkPolicy (qui peut parler à qui)

   Namespace : périmètre des noms, des droits RBAC, des NetworkPolicy et du niveau de sécurité (PSA)
   CRD : ajoute de nouveaux types à l'API ; un opérateur (contrôleur) les fait agir
```

---

## A. Le cours, notion par notion

### A1. Le cluster et kubectl (TP 0)

**Ce que montre le TP :** on obtient un vrai cluster à 3 nœuds en une commande, et `kubectl` n'est qu'un client de l'API.

**Architecture**

```text
Control plane (k3d-cesi-server-0)
  kube-apiserver        kubectl lui parle : c'est la porte d'entrée unique
  etcd (SQLite sur k3s) stocke l'état voulu
  scheduler             choisit le nœud de chaque pod
  controller-manager    boucles de réconciliation (ReplicaSet, Deployment, DaemonSet…)

Chaque nœud (k3d-cesi-agent-0, k3d-cesi-agent-1, et le server aussi sur k3s)
  kubelet               lance et surveille les pods du nœud (sondes comprises)
  kube-proxy            installe les règles réseau des Services
  containerd            exécute les conteneurs
```

- **k3s** est une distribution légère, « batteries incluses » : CoreDNS (DNS), Traefik (Ingress), ServiceLB/Klipper (LoadBalancer), local-path-provisioner (stockage), metrics-server (métriques), un contrôleur NetworkPolicy et un contrôleur Helm.
- **k3d** fait tourner k3s dans des conteneurs Docker : chaque « nœud » est un conteneur.
- `kubectl` lit sa configuration dans `~/.kube/config` (ou dans la variable `KUBECONFIG`). Un **contexte** associe un cluster, un utilisateur et un namespace par défaut.
- `kubectl port-forward` ouvre un tunnel de votre poste vers un pod ou un Service. C'est un outil de debug, pas une façon d'exposer une application en production.

```bash
k3d cluster create cesi --agents 2      # 1 control plane + 2 workers
kubectl get nodes -o wide
kubectl cluster-info
kubectl config get-contexts             # à quel cluster je parle ?
kubectl config use-context <contexte>
kubectl get pods -A                     # tous les namespaces : les composants de k3s
kubectl port-forward deploy/web 8080:80
```

---

### A2. Le pod et le manifeste YAML (TP 1)

**Ce que montre le TP :** le pod est la plus petite unité déployable, et le YAML déclaratif remplace les commandes ponctuelles.

**Notions**

- Un **pod** contient un ou plusieurs conteneurs qui partagent **le même réseau** (une seule IP, le même `localhost`) et peuvent partager des volumes. Il est placé sur un seul nœud et il est éphémère : supprimé, il ne revient pas tout seul.
- **Sidecar** : un conteneur auxiliaire placé à côté du principal (agent de logs, proxy, outil de rafraîchissement). L'équivalent Docker serait `docker run --network container:<principal>`.
- **Impératif** (`kubectl run`, `kubectl create`) pour tester. **Déclaratif** (fichier + `kubectl apply -f`) pour travailler pour de vrai : le fichier se versionne, se relit et se rejoue.
- `kubectl apply` met l'objet existant à jour quand c'est possible (labels, annotations : le pod garde le même `AGE`). La plupart des champs de `spec` d'un pod sont immuables (sondes, ports…) : il faut supprimer puis recréer le pod, ou passer par un Deployment.

**Structure de tout manifeste**

```yaml
apiVersion: v1            # version de l'API qui gère ce type (v1, apps/v1, networking.k8s.io/v1…)
kind: Pod                 # le type d'objet
metadata:                 # l'identité
  name: myapp-pod
  labels:                 # les étiquettes : la base de tous les sélecteurs
    app: myapp
    type: front-end
spec:                     # l'état voulu
  containers:
  - name: nginx-container # un tiret = un élément de liste
    image: nginx:1.27
```

**Règles YAML**

- Indentation de 2 espaces, **jamais de tabulation**.
- Un tiret `-` devant chaque élément d'une liste (`containers`, `ports`, `env`…).
- `---` sépare plusieurs objets dans un même fichier.
- Mettez entre guillemets ce qui pourrait être mal interprété : `"#d9534f"` (sinon `#` ouvre un commentaire), `"*/5 * * * *"`, `"1.10"`, `"yes"`, et les valeurs de variables d'environnement (`value: "8080"`).

**Commandes**

```bash
kubectl run nginx --image=nginx               # pod de test
kubectl get pods -o wide                      # nœud et IP
kubectl get pods --show-labels
kubectl describe pod nginx                    # section Events : le premier réflexe
kubectl explain pod.spec.containers           # documentation intégrée de chaque champ
kubectl apply -f pod-definition.yml
kubectl delete -f pod-definition.yml
# générer un squelette au lieu de l'écrire à la main
kubectl run nginx --image=nginx:1.27 --dry-run=client -o yaml > pod.yml
```

---

### A3. Cycle de vie, arrêt et sondes (TP 2)

**Ce que montre le TP :** on apprend à lire les statuts d'un pod, à trouver la cause d'une panne et à laisser Kubernetes surveiller l'application.

**Lire un statut**

| Statut | Signification | Où chercher |
| --- | --- | --- |
| `Pending` | Pas encore placé sur un nœud, ou en attente d'un volume | `describe` |
| `ContainerCreating` | Téléchargement de l'image, montage des volumes | `describe` |
| `ErrImagePull` / `ImagePullBackOff` | L'image ou le tag n'existe pas, ou le registre est privé | `describe` (le conteneur n'a jamais démarré : `logs` est vide) |
| `Error` / `CrashLoopBackOff` | L'application démarre puis s'arrête en erreur. Kubernetes la relance avec un délai qui double à chaque fois (10 s, 20 s, 40 s… jusqu'à 5 min) | `logs` (et `logs --previous`) |
| `Running` + `READY 0/1` | Le conteneur tourne, mais la readiness échoue | `describe` |
| `Terminating` qui dure | L'application ignore SIGTERM | voir l'arrêt ci-dessous |

**L'arrêt d'un pod**

1. Le pod est retiré des Services.
2. Kubernetes envoie **SIGTERM** au processus principal (PID 1).
3. Il attend `terminationGracePeriodSeconds` (30 s par défaut).
4. Il envoie **SIGKILL**.

Un shell (`sh -c "..."`) lancé en PID 1 ignore SIGTERM, donc le pod met 30 s à s'arrêter. Pour l'éviter : utiliser `exec` dans les scripts, intercepter le signal (`trap`), ou s'assurer que l'application gère SIGTERM.

**Les sondes**

| Sonde | Question posée | Si elle échoue |
| --- | --- | --- |
| `livenessProbe` | « Es-tu bloqué ? » | Le conteneur est **redémarré** (`RESTARTS` augmente) |
| `readinessProbe` | « Peux-tu recevoir du trafic ? » | Le pod passe en `READY 0/1` et sort des Services, **sans redémarrage** |
| `startupProbe` (hors TP) | « As-tu fini de démarrer ? » | Bloque les deux autres sondes tant qu'elle n'a pas réussi (utile pour les applis lentes à démarrer) |

Trois mécanismes : `httpGet` (code 200 à 399 attendu), `tcpSocket` (le port accepte la connexion), `exec` (la commande renvoie 0).

```yaml
    readinessProbe:
      httpGet: {path: /, port: 80}     # le VRAI port et le VRAI chemin de l'appli
      periodSeconds: 5
    livenessProbe:
      httpGet: {path: /, port: 80}
      initialDelaySeconds: 5           # attendre avant la première vérification
      periodSeconds: 5                 # intervalle entre deux vérifications
      failureThreshold: 3              # échecs consécutifs avant d'agir
```

Délai avant redémarrage ≈ moment de la panne + `failureThreshold` × `periodSeconds`. Dans `sonde-demo.yaml` : fichier supprimé à 30 s, puis 3 × 5 s, donc un redémarrage vers 45 s.

**Bonnes pratiques**

- La readiness vérifie que l'appli peut servir. La liveness vérifie seulement qu'elle n'est pas bloquée : elle ne doit **jamais** tester une dépendance (base de données). Sinon, une panne de la base redémarre tous les pods en boucle.
- Une sonde qui vise un mauvais port ou un chemin inexistant produit soit un pod jamais prêt, soit un pod qui redémarre en boucle (`sondes-nginx.yml`).

```bash
kubectl logs <pod> -c <conteneur>     # pod à plusieurs conteneurs
kubectl logs <pod> --previous         # logs de l'instance qui a planté
kubectl get pods -w                   # suivre les changements en direct
```

---

### A4. ReplicaSet et Deployment (TP 3 et 4)

**Ce que montrent les TP :** on obtient l'auto-guérison, le passage à l'échelle, et des mises à jour sans coupure avec retour arrière.

**ReplicaSet**

- Il maintient `replicas` pods en vie. Le `template` est le moule (un pod complet) et le `selector` dit quels pods compter.
- Le `selector` **doit** correspondre aux labels du `template`, sinon l'API refuse l'objet (`replicaset-casse.yml`).
- Il compte **tous** les pods qui portent ses labels, y compris ceux qu'il n'a pas créés : un pod « intrus » est compté, puis supprimé s'il y en a trop.
- Supprimer le ReplicaSet supprime ses pods (suppression en cascade).

**Deployment**

- Un Deployment gère des ReplicaSets, qui gèrent des pods. Les noms en témoignent : `myapp-deployment` → `myapp-deployment-<hash>` → `myapp-deployment-<hash>-<id>`. Le hash est celui du `template`.
- Modifier le `template` (image, variables, sondes…) crée un nouveau ReplicaSet. Le nouveau monte pendant que l'ancien descend : c'est le **rolling update**. L'ancien ReplicaSet reste, à 0 pod, pour permettre le retour arrière.
- Stratégies : `RollingUpdate` (par défaut : `maxSurge: 25%`, `maxUnavailable: 25%`) ou `Recreate` (tout arrêter, puis tout relancer).

**La recette « zéro coupure »**

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1          # au plus 1 pod en plus pendant la mise à jour
      maxUnavailable: 0    # jamais moins de pods prêts que replicas
  template:
    spec:
      containers:
      - name: app
        readinessProbe: ...   # indispensable : sans elle, un pod est « prêt » dès qu'il démarre
```

Une version qui ne devient jamais prête ne remplace donc jamais l'ancienne : la mise à jour se bloque et le service continue. Le blocage est signalé au bout de `progressDeadlineSeconds` (600 s), mais Kubernetes ne revient **pas** en arrière tout seul : c'est à vous de lancer `rollout undo`.

```bash
kubectl apply -f deployment.yml                       # mise à jour déclarative (à préférer)
kubectl rollout status deployment/myapp               # suivre la mise à jour
kubectl annotate deployment/myapp kubernetes.io/change-cause="passage en 1.27"
kubectl rollout history deployment/myapp              # historique, colonne CHANGE-CAUSE
kubectl rollout undo deployment/myapp                 # revenir à la révision précédente
kubectl rollout undo deployment/myapp --to-revision=2
kubectl rollout restart deployment/myapp              # recréer les pods sans changer le template
```

**À retenir :** `kubectl scale` et `kubectl set image` fonctionnent, mais le fichier ne dit plus la vérité. On modifie le fichier, puis on l'applique. Dans un vrai projet, on n'écrit jamais de pod ou de ReplicaSet « nu » : on choisit le bon contrôleur.

| Besoin | Contrôleur |
| --- | --- |
| Appli sans état (web, API) | Deployment |
| Un pod par nœud (agent de logs, de supervision) | DaemonSet |
| Appli avec état, identité stable (base de données) | StatefulSet (hors TP) |
| Tâche ponctuelle / planifiée | Job / CronJob (hors TP) |

---

### A5. DaemonSet, namespaces et réseau plat (TP 5)

**DaemonSet** : exactement un pod par nœud, y compris sur les nœuds ajoutés plus tard. Le contrôleur DaemonSet crée le pod dès que le nœud arrive. Cas d'usage : agents de logs (Fluent Bit), de supervision, CNI.

**Namespace** : isole les **noms** et sert de périmètre aux droits (RBAC), aux règles réseau (NetworkPolicy), au niveau de sécurité (PSA) et aux quotas. Il n'isole **pas** le réseau par défaut.

- Namespaces système : `default`, `kube-system` (composants du cluster), `kube-public`, `kube-node-lease`.
- Deux façons de cibler un namespace : `--namespace` / `-n` sur la ligne de commande, ou `metadata.namespace` dans le YAML (plus sûr, car c'est écrit).
- `kubectl delete namespace X` supprime **tout** ce qu'il contient.

**Réseau plat** : chaque pod a sa propre IP, joignable depuis tous les autres pods, sans NAT ni port publié, même entre namespaces. C'est le modèle réseau de Kubernetes, et c'est pour cela que les NetworkPolicy existent (A11).

```bash
kubectl get ns
kubectl get pods -n kube-system
kubectl get pods -A
kubectl config set-context --current --namespace=team1   # changer de namespace par défaut
kubectl run -it --rm test --image=busybox:1.37 --restart=Never -- wget -qO- http://<IP>
```

---

### A6. Services et DNS (TP 5, 6 et 7)

**Pourquoi :** l'IP d'un pod change à chaque recréation. Un **Service** donne une IP virtuelle stable et un nom DNS devant un groupe de pods, sélectionnés par labels. Il répartit les requêtes entre ces pods, et seulement entre les pods **READY**.

**Les types**

| Type | Joignable depuis | Remarques |
| --- | --- | --- |
| `ClusterIP` (par défaut) | L'intérieur du cluster | Le cas normal entre composants (front → API → base) |
| `NodePort` | `<IP de n'importe quel nœud>:<30000-32767>` | Ajoute un port sur **chaque** nœud, même ceux sans pod. Utile en labo, rare en production |
| `LoadBalancer` | Une IP externe fournie par l'infrastructure | = NodePort + ClusterIP + IP externe (Klipper sur k3s, LB du cloud ailleurs) |
| Headless (`clusterIP: None`, hors TP) | DNS uniquement | Le DNS renvoie directement les IP des pods (StatefulSet) |

**La trinité des ports**

```text
client ──► <IP-nœud>:nodePort ──► Service:port ──► Pod:targetPort
           (NodePort seulement)    (ce qu'on appelle) (là où l'appli ÉCOUTE vraiment)
```

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  type: NodePort
  selector:
    app: myapp          # doit correspondre aux labels des pods
  ports:
  - port: 80            # port du Service
    targetPort: 80      # port du conteneur (containerPort)
    nodePort: 30008     # optionnel, sinon attribué automatiquement
```

Si `targetPort` ne correspond pas au port où l'application écoute, le Service ne répond plus (TP 5, partie 4).

**Endpoints** : la liste des `IP:port` des pods prêts derrière le Service (`kubectl describe svc` ou `kubectl get endpointslices`). Une liste **vide** signifie soit que le `selector` ne correspond à aucun pod, soit qu'aucun pod n'est prêt. Les pods non prêts apparaissent dans `notReadyAddresses` et ne reçoivent rien.

**DNS (CoreDNS)** : chaque Service a un nom. On appelle un nom, jamais une IP.

```text
même namespace      : mysql-service
autre namespace     : mysql-service.dev
nom complet (FQDN)  : mysql-service.dev.svc.cluster.local
```

Le nom court ne fonctionne que dans le même namespace, car le fichier `/etc/resolv.conf` du pod essaie d'abord `<son-namespace>.svc.cluster.local`. Le DNS renvoie l'IP du **Service** (10.43.x.x sur k3s), pas celle d'un pod.

```bash
kubectl get svc
kubectl describe svc back-end                 # ligne Endpoints
kubectl get endpointslices -l kubernetes.io/service-name=back-end
kubectl run -it --rm dnstest --image=busybox:1.37 --restart=Never -- nslookup mysql-service.dev
kubectl expose deployment myapp --port=80 --target-port=8080   # créer un Service en impératif
```

---

### A7. Configuration : variables, ConfigMap et Secret (TP 8 et 9)

**Principe :** la configuration vit dans l'environnement, pas dans le code ni dans l'image (méthode « 12-factor »). La même image tourne en dev et en prod, seule la configuration change.

**ConfigMap** : configuration non sensible, en clair, dans un bloc `data`.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  APP_COLOR: green
  APP_MODE: prod
```

**Trois façons de l'injecter**

| Méthode | Effet | Si la ConfigMap change |
| --- | --- | --- |
| `env` + `valueFrom.configMapKeyRef` | Une clé → une variable | Lue au démarrage : il faut `kubectl rollout restart` |
| `envFrom` + `configMapRef` | Toutes les clés → des variables | Idem |
| Volume `configMap` | Une clé → un fichier | Mis à jour automatiquement, sans redémarrage (en général en moins d'une minute), sauf avec `subPath` |

```yaml
spec:
  containers:
  - name: app
    image: kodekloud/webapp-color
    env:                                     # une clé → une variable
    - name: APP_COLOR
      valueFrom:
        configMapKeyRef: {name: app-config, key: APP_COLOR}
    envFrom:                                 # toutes les clés → des variables
    - configMapRef: {name: app-config}
    - secretRef: {name: app-secret}
    volumeMounts:                            # une clé → un fichier dans /etc/app
    - {name: config, mountPath: /etc/app}
  volumes:
  - name: config
    configMap: {name: app-config}
```

**Secret** : même fonctionnement, pour les données sensibles, avec des droits d'accès séparés.

- Dans `data`, les valeurs sont en **base64**. C'est un encodage, **pas un chiffrement** : n'importe qui avec le droit `get secrets` les lit en une commande.
- `stringData` accepte le texte clair, et Kubernetes l'encode lui-même.
- `echo -n 'valeur' | base64` : sans `-n`, le retour à la ligne est encodé avec la valeur, et le mot de passe devient faux.
- `kubectl describe secret` masque les valeurs, `kubectl get secret -o yaml` non.
- Dans le conteneur, les valeurs arrivent **décodées**. Montés en volume, les Secrets sont sur un `tmpfs` (en mémoire, jamais sur le disque du nœud).
- Types courants : `Opaque` (générique), `kubernetes.io/tls` (certificats, TP 10), `kubernetes.io/dockerconfigjson` (registre privé).

**En production**

- Jamais de Secret en clair dans Git : Sealed Secrets, SOPS, ou External Secrets Operator avec un coffre (Vault, gestionnaire de secrets du cloud).
- Activer le chiffrement d'etcd et restreindre le droit `get`/`list` sur les secrets.
- Pour redémarrer les pods à chaque changement de configuration : l'annotation `checksum/config` dans un chart Helm, ou un outil comme Reloader.

```bash
kubectl create configmap app-config --from-literal=APP_COLOR=blue --from-file=app.properties
kubectl create secret generic app-secret --from-literal=DB_Password=paswrd
kubectl get secret app-secret -o jsonpath='{.data.DB_Password}' | base64 --decode
kubectl exec deploy/webapp -- printenv APP_COLOR
```

---

### A8. Ingress (TP 10)

**Pourquoi :** un seul point d'entrée HTTP(S) pour plusieurs Services ClusterIP, avec un routage par nom d'hôte ou par chemin (couche 7). On évite ainsi un LoadBalancer par application.

- L'Ingress n'est qu'un ensemble de règles. Il faut un **contrôleur Ingress** pour les appliquer. k3s installe Traefik, lui-même exposé par un Service LoadBalancer dans `kube-system`.
- `ingressClassName` désigne le contrôleur qui doit traiter l'Ingress.
- Aucune règle ne correspond : la requête part vers le `defaultBackend` s'il existe, sinon le contrôleur renvoie une **404**.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: boutique
spec:
  ingressClassName: traefik
  tls:                                   # optionnel : HTTPS
  - hosts: [wear.my-online-store.com]
    secretName: wear-tls                 # Secret de type tls (cert + clé)
  rules:
  - host: wear.my-online-store.com       # tri par nom d'hôte (en-tête Host)
    http:
      paths:
      - path: /                          # tri par chemin
        pathType: Prefix                 # obligatoire : Prefix, Exact ou ImplementationSpecific
        backend:
          service: {name: wear-service, port: {number: 80}}
```

**Tester sans DNS**

```bash
IP=$(kubectl get svc -n kube-system traefik -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl -H "Host: wear.my-online-store.com" http://$IP/                           # simuler un nom d'hôte
curl -k --resolve wear.my-online-store.com:443:$IP https://wear.my-online-store.com/
kubectl describe ingress boutique        # chaque backend, avec les IP des pods entre parenthèses
```

**À savoir pour un vrai projet**

- Le chemin est transmis tel quel au backend : une règle `/wear` envoie `/wear` à l'appli. Si l'appli attend `/`, il faut une réécriture, propre à chaque contrôleur (Middleware `StripPrefix` pour Traefik, annotations pour d'autres).
- Les annotations sont propres à chaque contrôleur et ne se transposent pas d'un contrôleur à l'autre.
- Un Ingress ne peut viser que des Services de **son** namespace.
- En production, les certificats viennent de **cert-manager** (Let's Encrypt), et non d'un `openssl` manuel. `curl -k` ne sert qu'à accepter un certificat auto-signé pendant les tests.
- La **Gateway API** (GatewayClass, Gateway, HTTPRoute) est la successeure de l'Ingress, plus expressive et standardisée.

---

### A9. Stockage : volumes, PV, PVC et StorageClass (TP 11)

**Pourquoi :** le système de fichiers d'un conteneur disparaît avec lui. Un volume a une durée de vie différente.

| Volume | Durée de vie | Usage |
| --- | --- | --- |
| `emptyDir` | Celle du pod | Fichiers temporaires, partage entre conteneurs du pod, `/tmp` en lecture seule (TP 14) |
| `hostPath` | Celle du **nœud** | Accès au disque du nœud. Collé à un nœud et risqué : réservé aux DaemonSets système, interdit par PSA `baseline` et `restricted` |
| `configMap` / `secret` | Celle de l'objet | Configuration en fichiers |
| `persistentVolumeClaim` | Indépendante du pod | Données applicatives durables |

**PV et PVC : séparer l'offre et la demande**

- **PV** (PersistentVolume) : le stockage réel, créé par l'administrateur, ou automatiquement par une StorageClass.
- **PVC** (PersistentVolumeClaim) : la demande de l'application (taille, mode d'accès, classe).
- Kubernetes lie un PVC à un PV compatible : même classe, même mode d'accès, capacité ≥ demande. Le PVC obtient **tout** le PV (on demande 500 Mi, on reçoit 1 Gi).
- Aucun PV ne convient : le PVC reste `Pending`.
- Modes d'accès : `ReadWriteOnce` (un nœud), `ReadOnlyMany`, `ReadWriteMany` (plusieurs nœuds, il faut un stockage réseau), `ReadWriteOncePod`.
- `reclaimPolicy` : `Retain` (le PV passe en `Released` et garde ses données ; l'admin nettoie à la main) ou `Delete` (le PV et le disque disparaissent avec le PVC, valeur par défaut en provisionnement dynamique).

**StorageClass : le disque à la demande**

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rapide
provisioner: rancher.io/local-path        # le pilote qui crée les disques
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer   # créer le PV seulement quand un pod l'utilise
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-pvc
spec:
  storageClassName: rapide       # "" = pas de classe : lier à un PV créé à la main
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 1Gi
```

- `WaitForFirstConsumer` : le PVC reste `Pending` jusqu'au premier pod, pour que le disque soit créé sur le nœud où ce pod est placé. C'est normal.
- Sans `storageClassName`, le PVC part vers la classe **par défaut** (`local-path` sur k3s). Pour se lier à un PV statique, il faut écrire `storageClassName: ""`.
- `local-path` = le disque du nœud, sans réplication. Si le nœud meurt, les données sont perdues. En production : un pilote CSI du cloud, Longhorn ou Ceph.
- Appli avec état et plusieurs réplicas → StatefulSet avec `volumeClaimTemplates` (un PVC par pod).

```bash
kubectl get pv,pvc
kubectl describe pvc data-pvc        # pourquoi Pending ?
kubectl get storageclass             # la classe marquée (default)
```

---

### A10. ServiceAccount et RBAC (TP 12)

**Ce que montre le TP :** l'authentification (qui es-tu ?) et l'autorisation (as-tu le droit ?) sont deux étapes distinctes.

- **Utilisateurs** (humains) : Kubernetes ne les stocke pas. Ils existent parce qu'un certificat ou un fournisseur d'identité (OIDC) le dit.
- **ServiceAccounts** (applications) : des objets du namespace. Leur identité s'écrit `system:serviceaccount:<namespace>:<nom>`.
- Un **jeton** prouve l'identité, il ne donne **aucun droit**. Sans règle RBAC, l'API répond `403 Forbidden`. Le message nomme bien le ServiceAccount, ce qui prouve que l'authentification a réussi.
- Chaque pod reçoit par défaut le jeton de son ServiceAccount dans `/var/run/secrets/kubernetes.io/serviceaccount/` (`token`, `ca.crt`, `namespace`). Si l'appli n'appelle pas l'API, désactivez ce montage avec `automountServiceAccountToken: false`. Ainsi, un attaquant qui obtient un shell ne trouve pas de jeton.

**RBAC : qui peut faire quoi, où**

| Objet | Portée | Rôle |
| --- | --- | --- |
| `Role` | Un namespace | Liste de règles : `apiGroups` + `resources` + `verbs` |
| `RoleBinding` | Un namespace | Donne un Role (ou un ClusterRole) à des sujets |
| `ClusterRole` | Tout le cluster | Pour les ressources sans namespace (`nodes`, `persistentvolumes`) ou des droits réutilisables |
| `ClusterRoleBinding` | Tout le cluster | Donne un ClusterRole partout |

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: dev
rules:
- apiGroups: [""]              # "" = groupe de base (pods, services, secrets, configmaps)
  resources: ["pods"]          # "apps" pour deployments, "networking.k8s.io" pour ingresses…
  verbs: ["get", "list"]       # get, list, watch, create, update, patch, delete
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tom-pod-reader
  namespace: dev
subjects:
- kind: User                   # ou ServiceAccount (avec namespace), ou Group
  name: tom
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

- RBAC est **additif** : tout est interdit par défaut, et on ajoute des permissions. Il n'existe pas de règle « refuser ».
- Pour trouver le groupe d'API d'une ressource : `kubectl api-resources`.
- ClusterRoles prêts à l'emploi : `view`, `edit`, `admin`, `cluster-admin`. Un RoleBinding peut référencer `view` pour le limiter à un namespace.
- Les droits `list` et `watch` sur les secrets permettent d'en lire tout le contenu : ils sont aussi sensibles que `get`.

```bash
kubectl create serviceaccount dashboard-sa
kubectl create token dashboard-sa --duration=1h       # jeton de courte durée
kubectl auth can-i list pods --as=system:serviceaccount:default:dashboard-sa
kubectl auth can-i delete pods -n dev --as tom
kubectl auth can-i --list -n dev --as tom             # tous les droits de Tom
kubectl create role pod-reader --verb=get,list --resource=pods -n dev
kubectl create rolebinding tom-pod-reader --role=pod-reader --user=tom -n dev
```

---

### A11. NetworkPolicy (TP 13)

**Ce que montre le TP :** par défaut, le réseau est plat et tout est ouvert. Un front piraté peut alors parler directement à la base de données.

**La méthode : tout fermer, puis rouvrir flux par flux**

```yaml
# 1. default-deny : tous les pods du namespace refusent tout trafic entrant
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: boutique
spec:
  podSelector: {}              # {} = tous les pods du namespace
  policyTypes: ["Ingress"]     # ajouter "Egress" pour bloquer aussi le trafic sortant
---
# 2. une règle par flux autorisé : api accepte front, sur 8080
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-from-front
  namespace: boutique
spec:
  podSelector:
    matchLabels: {app: api}    # les pods protégés
  ingress:
  - from:
    - podSelector:
        matchLabels: {app: front}   # les pods autorisés (même namespace)
    ports:
    - port: 8080               # port du POD (targetPort), pas celui du Service
```

- Les règles visent des **labels** et des ports, jamais des IP de pods. Tout pod qui porte `app: api` est traité comme l'API (le pod de test du TP le prouve). Il faut donc aussi contrôler, par RBAC, qui peut créer des pods dans le namespace.
- Les règles s'additionnent. Dès qu'un pod est sélectionné par une politique, seul ce qui est explicitement autorisé passe.
- `from` accepte `podSelector` (même namespace), `namespaceSelector` (autres namespaces) et `ipBlock`. Attention au ET/OU :

```yaml
  - from:
    - namespaceSelector: {matchLabels: {kubernetes.io/metadata.name: kube-system}}
      podSelector: {matchLabels: {app.kubernetes.io/name: traefik}}   # même élément : ET
  - from:
    - namespaceSelector: {...}
    - podSelector: {...}          # deux éléments : OU (beaucoup plus permissif)
```

- Une connexion bloquée se traduit par un **timeout** (les paquets sont jetés), pas par un refus.
- Si vous bloquez l'`Egress`, autorisez explicitement le DNS (port 53 UDP/TCP vers `kube-system`), sinon plus aucun nom ne se résout.
- Il faut un CNI qui applique les politiques. k3s intègre un contrôleur ; ailleurs, on utilise Calico ou Cilium. Avec Flannel seul, les NetworkPolicy sont **ignorées sans erreur**.

```bash
kubectl get netpol -n boutique
kubectl exec -n boutique front -- wget -qO- -T 3 http://api:8080
kubectl run -n boutique test-api --image=busybox:1.37 --labels=app=api -- sleep 3600
```

---

### A12. Sécurité des pods et des images (TP 14)

**securityContext : le moins de droits possible**

```yaml
spec:
  securityContext:                     # niveau pod
    runAsNonRoot: true                 # refuser de démarrer si l'image tourne en root
    seccompProfile: {type: RuntimeDefault}
  containers:
  - name: api
    image: nginxinc/nginx-unprivileged:1.27   # image prévue pour tourner sans root (port 8080)
    securityContext:                   # niveau conteneur
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true     # système de fichiers en lecture seule…
      capabilities: {drop: ["ALL"]}
    volumeMounts:
    - {name: tmp, mountPath: /tmp}     # …sauf les dossiers où l'appli doit écrire
  volumes:
  - name: tmp
    emptyDir: {}
```

- `runAsNonRoot: true` avec une image qui démarre en root (l'image `nginx` officielle) donne le statut `CreateContainerConfigError`.
- Sans root, impossible d'écouter sur un port inférieur à 1024 : d'où le port 8080 des images « unprivileged ».
- Avec `readOnlyRootFilesystem`, il faut monter un `emptyDir` sur chaque dossier où l'appli écrit (`/tmp`, cache, PID).

**Pod Security Admission (PSA)** : un label sur le namespace, et le cluster refuse les pods non conformes dès la création.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: securise
  labels:
    pod-security.kubernetes.io/enforce: restricted   # privileged < baseline < restricted
    pod-security.kubernetes.io/warn: restricted      # avertir (utile pour migrer en douceur)
```

- Le niveau `restricted` exige notamment : `runAsNonRoot`, `allowPrivilegeEscalation: false`, `capabilities.drop: [ALL]`, `seccompProfile`, et l'absence de `hostPath`. `readOnlyRootFilesystem` n'est pas exigé, mais reste recommandé.
- PSA remplace PodSecurityPolicy, supprimée en Kubernetes 1.25.
- Avec un Deployment, l'objet est accepté, mais ses **pods** sont refusés : l'erreur est dans `kubectl describe rs` ou `kubectl get events`.

**La chaîne de confiance de l'image**

1. Image minimale (distroless, alpine, slim).
2. Scan des vulnérabilités : `trivy image`.
3. Scan des manifestes : `trivy config .` (il repère les securityContext manquants, l'absence de limites…).
4. Signature : cosign / Sigstore.
5. Tag fixe ou digest, **jamais `:latest`** : sinon impossible de savoir ce qui tourne, et le retour arrière perd son sens.

```bash
kubectl exec pod-securise -- id                    # sous quel utilisateur ?
trivy image --severity CRITICAL,HIGH nginx:1.27
trivy config .
trivy k8s --report summary
```

---

### A13. Requests, limits et HPA (TP 15)

| | `requests` | `limits` |
| --- | --- | --- |
| Rôle | **Réservation** : le scheduler place le pod là où il reste assez de ressources réservables | **Plafond** appliqué pendant l'exécution |
| Trop élevé | Pod `Pending`, événement `FailedScheduling: Insufficient cpu` (et il ne consomme rien) | Ressources gaspillées |
| Dépassement | Rien (on peut consommer plus que sa réservation) | CPU : le conteneur est **ralenti**. Mémoire : il est **tué** (`OOMKilled`, code de sortie 137) |

- Unités : CPU en cœurs ou millicœurs (`1` = 1 cœur, `100m` = 0,1 cœur) ; mémoire en `Mi`/`Gi` (puissances de 2), à ne pas confondre avec `M`/`G`.
- Le scheduler se fie aux `requests`, pas à la consommation réelle.
- Classes de QoS (hors TP) : `Guaranteed` (requests = limits), `Burstable`, `BestEffort` (rien de déclaré). Quand le nœud manque de mémoire, les `BestEffort` sont expulsés en premier.

**HorizontalPodAutoscaler**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api
spec:
  scaleTargetRef: {apiVersion: apps/v1, kind: Deployment, name: api}
  minReplicas: 1
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: cpu
      target: {type: Utilization, averageUtilization: 50}   # % des requests.cpu
```

- **Calcul :** pods voulus = ⌈ pods actuels × utilisation actuelle ÷ cible ⌉, borné entre `minReplicas` et `maxReplicas`. Exemple : 1 pod à 250 % pour une cible de 50 % donne ⌈ 1 × 250 / 50 ⌉ = 5 pods.
- Il faut metrics-server (inclus dans k3s) et des `requests.cpu` : sans elles, la colonne `TARGETS` affiche `<unknown>`.
- Une fois l'HPA en place, **retirez `replicas` du Deployment**. Sinon, chaque `kubectl apply` remet le nombre de pods à la valeur du fichier et se bat avec l'HPA.
- La redescente est volontairement lente (fenêtre de stabilisation de 5 minutes) pour éviter les oscillations.

```bash
kubectl top nodes
kubectl top pods --sort-by=cpu
kubectl get hpa -w
kubectl describe pod oom | grep -A3 "Last State"
```

---

### A14. CRD et opérateurs (TP 16)

- Une **CustomResourceDefinition** ajoute un nouveau `kind` à l'API. Une fois créée, `kubectl get`, `describe` et `explain`, ainsi que RBAC et Helm, fonctionnent sur ce type comme sur un type natif.
- Le nom de la CRD s'écrit `<pluriel>.<groupe>` (`backups.demo.cesi.fr`).
- Le schéma `openAPIV3Schema` **valide** les objets (types, `enum`, `required`) et fournit la documentation de `kubectl explain` (champs `description`).
- `additionalPrinterColumns` ajoute des colonnes à `kubectl get`.
- Supprimer la CRD supprime **tous** les objets de ce type.
- Une CRD seule ne fait que **stocker** des objets : rien ne se passe à 2 h du matin. C'est un **contrôleur** qui surveille ces objets et agit (il crée un CronJob, lance une sauvegarde…).
- **Opérateur** = CRD + contrôleur + savoir-faire d'un expert. Exemples : cert-manager (`Certificate`), CloudNativePG (`Cluster`), Prometheus Operator (`ServiceMonitor`).

**Méthode pour découvrir un cluster inconnu**

```bash
kubectl get crd                      # quels opérateurs sont installés ?
kubectl api-resources                # tous les types disponibles, avec leur groupe et leur portée
kubectl explain <type>.spec          # comment remplir un type que l'on ne connaît pas
```

---

### A15. Helm (TP 17)

Helm est le gestionnaire de paquets de Kubernetes, l'équivalent de npm ou NuGet. Il installe, met à jour et désinstalle une application complète d'un seul bloc.

| Terme | Sens |
| --- | --- |
| **Chart** | Le paquet : `Chart.yaml` (métadonnées), `values.yaml` (paramètres par défaut), `templates/` (manifestes avec variables) |
| **Values** | Les paramètres. Un fichier par environnement (`values-dev.yaml`, `values-prod.yaml`) |
| **Release** | Une installation nommée d'un chart dans un namespace |
| **Révision** | Chaque `install`, `upgrade` ou `rollback` crée une révision numérotée |
| **Dépôt** | Index HTTP (`helm repo add`) ou registre OCI (`oci://…`, comme une image) |
| Version du chart vs `APP VERSION` | La version du paquet (templates) vs la version de l'application déployée |

- **Un chart, plusieurs environnements :** le même chart avec `values-dev.yaml` donne 1 pod, avec `values-prod.yaml` 3 pods et des ressources réservées.
- Priorité des valeurs : `--set` > le dernier `-f` > le premier `-f` > le `values.yaml` du chart.
- `helm rollback` ne supprime pas de révision : il en **crée une nouvelle**, qui reprend une ancienne configuration.
- L'historique est rangé dans des Secrets du namespace de la release (`sh.helm.release.v1.<release>.v<N>`, label `owner=helm`).
- `helm template` produit les manifestes en local sans rien installer, et `helm lint` vérifie le chart.
- `--set` présente le même défaut que `kubectl set image` : la valeur n'est écrite nulle part. Pour un changement durable, modifiez le fichier de values.

```bash
helm repo add podinfo https://stefanprodan.github.io/podinfo && helm repo update
helm search repo podinfo
helm show values podinfo/podinfo
helm install podinfo-prod podinfo/podinfo -n prod --create-namespace -f values-prod.yaml
helm upgrade --install podinfo-prod podinfo/podinfo -n prod -f values-prod.yaml   # idéal en CI
helm list -A
helm history podinfo-prod -n prod
helm rollback podinfo-prod 1 -n prod
helm get values podinfo-prod -n prod
helm get manifest podinfo-prod -n prod
helm uninstall podinfo-prod -n prod
helm create monchart && helm lint monchart && helm template mon-app ./monchart
```

---

### A16. Monitoring (TP 18)

- Trois signaux : **métriques** (Prometheus), **logs** (Loki, Elasticsearch), **traces** (OpenTelemetry, Tempo, Jaeger).
- Avant tout outil : `kubectl get events -A --sort-by=.lastTimestamp` et `kubectl top`.
- **kube-prometheus-stack** est un chart Helm qui installe Prometheus, Grafana, Alertmanager, ainsi que l'opérateur Prometheus et ses CRD (`ServiceMonitor`, `PodMonitor`, `PrometheusRule`). Un `ServiceMonitor` sélectionne des Services par labels pour dire à Prometheus quoi collecter.
- Ce TP réunit tout le reste : Helm installe un opérateur, l'opérateur s'appuie sur des CRD, les labels font le lien, le mot de passe de Grafana est dans un Secret, et on y accède par port-forward.

```bash
kubectl get events -A --sort-by=.lastTimestamp | tail -15
kubectl top pods -A --sort-by=memory | head
helm install monitoring prom/kube-prometheus-stack -n monitoring --create-namespace
kubectl get secret -n monitoring monitoring-grafana -o jsonpath='{.data.admin-password}' | base64 --decode
```

---

## B. Les méthodes réutilisables

### B1. Diagnostiquer un pod : l'entonnoir

On va toujours du général au particulier :

```text
1. kubectl get pods -o wide                      STATUS, READY, RESTARTS, NODE
2. kubectl describe pod <pod>                    section Events : placement, image, sondes, montages, OOM
3. kubectl logs <pod> [-c conteneur] --previous  l'erreur de l'application (instance précédente)
4. kubectl exec -it <pod> -- sh                  vérifier de l'intérieur : variables, fichiers, réseau
5. kubectl get events -n <ns> --sort-by=.lastTimestamp
6. kubectl top pods / kubectl top nodes          consommation réelle
```

**Symptôme → cause → remède**

| Symptôme | Cause probable | Où le voir | Remède |
| --- | --- | --- | --- |
| `Pending` + `Insufficient cpu/memory` | `requests` trop élevées pour les nœuds | `describe pod` | Baisser les requests, ajouter des nœuds |
| `Pending` + PVC non lié | Pas de PV compatible, mauvaise classe | `describe pvc` | `storageClassName`, taille, mode d'accès |
| `ContainerCreating` qui dure | Volume impossible à monter (hostPath absent, ConfigMap/Secret manquant) | `describe pod` | Créer l'objet, `DirectoryOrCreate` |
| `ErrImagePull` / `ImagePullBackOff` | Nom ou tag faux, registre privé | `describe pod` | Corriger l'image, `imagePullSecrets` |
| `CrashLoopBackOff` / `Error` | L'application s'arrête en erreur | `logs --previous` | Corriger la configuration ou le code |
| `CreateContainerConfigError` | Clé de ConfigMap/Secret absente, ou image root avec `runAsNonRoot` | `describe pod` | Créer la clé, utiliser une image non root |
| `OOMKilled` (code 137) | Limite mémoire dépassée | `describe pod` (Last State) | Augmenter la limite, chercher une fuite |
| `Running` mais `READY 0/1` | Readiness en échec | `describe pod` (`Readiness probe failed`) | Port et chemin de la sonde |
| `RESTARTS` qui augmente | Liveness en échec, ou plantage | `describe` + `logs --previous` | Port et chemin de la sonde, délais |
| `Terminating` pendant 30 s | L'application ignore SIGTERM | `time kubectl delete` | Gérer SIGTERM, `exec` en PID 1 |
| Refusé à la création (`violates PodSecurity`) | Namespace en `restricted` / `baseline` | Message d'`apply`, `describe rs` | Compléter le `securityContext` |
| `selector does not match template labels` | Labels incohérents | Message d'`apply` | Aligner `selector` et `template.metadata.labels` |
| `found character that cannot start any token` | Tabulation dans le YAML | Message d'`apply` | Espaces uniquement |
| Rollout bloqué | Nouveaux pods jamais prêts | `rollout status`, `get pods` | `rollout undo`, puis corriger |
| `403 Forbidden` depuis l'API | Droit RBAC manquant | `auth can-i ... --as` | Role + RoleBinding |

**Codes de sortie :** 0 = fin normale ; 1 = erreur de l'application ; 137 = SIGKILL (OOM, ou délai de grâce dépassé) ; 143 = SIGTERM reçu et traité.

---

### B2. « Mon application ne répond pas » : remonter la chaîne réseau

```text
client ─► [Ingress : hôte/chemin] ─► Service:port ─► Endpoints (pods READY) ─► targetPort ─► appli
                    ▲                       ▲                ▲                      ▲
                   404 ?                 DNS ?        selector / readiness ?   bon port ?   + NetworkPolicy ?
```

On teste chaque maillon, de l'appli vers le client :

1. **Les pods sont-ils prêts ?** `kubectl get pods -l app=monapp` → `READY 1/1`.
2. **Les labels correspondent-ils ?** Comparer `kubectl get svc monapp -o jsonpath='{.spec.selector}'` et `kubectl get pods --show-labels`.
3. **Le Service a-t-il des endpoints ?** `kubectl describe svc monapp`. Une ligne `Endpoints` vide signifie un selector faux ou des pods non prêts.
4. **Le `targetPort` est-il le port où l'appli écoute ?** Voir la documentation de l'image, ou `kubectl port-forward pod/<pod> 8080:<port>`.
5. **Le Service répond-il de l'intérieur ?**
   `kubectl run -it --rm t --image=busybox:1.37 --restart=Never -- wget -qO- -T 3 http://monapp.<ns>:<port>`
6. **Le nom se résout-il ?** `nslookup monapp.<ns>` depuis le même pod de test.
7. **Une NetworkPolicy bloque-t-elle ?** `kubectl get netpol -n <ns>`. Un **timeout** fait penser à une NetworkPolicy, un **refus** à un mauvais port.
8. **L'Ingress route-t-il ?** `kubectl describe ingress` (backends et IP des pods), `ingressClassName`, `curl -H "Host: …"`. Une 404 signifie qu'aucune règle ne correspond.

**Isoler par élimination :** si `port-forward pod/…` fonctionne mais pas `port-forward svc/…`, le problème vient du Service. Si le Service fonctionne mais pas l'Ingress, le problème vient de l'Ingress ou de son contrôleur.

---

### B3. Déployer une nouvelle application : la checklist

Dans l'ordre, pour n'importe quel projet :

1. **Image** : tag fixe, scannée (`trivy image`), compatible non root, port d'écoute connu, gère SIGTERM, expose un endpoint de santé.
2. **Namespace** dédié, avec le label PSA (`restricted` si possible).
3. **Configuration** : ConfigMap pour le non sensible, Secret pour le sensible, jamais en clair dans Git.
4. **Identité** : un ServiceAccount par appli, `automountServiceAccountToken: false` si elle n'appelle pas l'API, sinon un Role minimal vérifié par `auth can-i`.
5. **Deployment** : labels cohérents, `requests` et limite mémoire, readiness + liveness, `securityContext`, `maxUnavailable: 0`.
6. **Service** ClusterIP : `selector` = labels des pods, `targetPort` = port du conteneur (de préférence un port **nommé**).
7. **Exposition** : un Ingress (hôte, chemin, TLS avec cert-manager), pas de NodePort en production.
8. **Stockage** (si l'appli a un état) : PVC + StorageClass, StatefulSet, ou base de données managée.
9. **Réseau** : `default-deny`, puis une règle par flux (depuis le contrôleur Ingress, vers la base, vers le DNS si l'Egress est bloqué).
10. **Élasticité** : HPA si l'appli est sans état et liée au CPU, en retirant `replicas` du Deployment.
11. **Packaging** : un chart Helm, un fichier de values par environnement.
12. **Vérification** : voir B5.

---

### B4. Modèle complet, prêt à adapter

Ce fichier met en œuvre toute la checklist. Remplacez `monapp`, l'image, le port et le nom d'hôte. Les choix sont commentés et renvoient au TP correspondant.

```yaml
# monapp.yaml : une appli web sans état, prête pour la production
apiVersion: v1
kind: Namespace
metadata:
  name: monapp
  labels:
    pod-security.kubernetes.io/enforce: restricted      # TP 14
    pod-security.kubernetes.io/warn: restricted
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: monapp
  namespace: monapp
automountServiceAccountToken: false                     # TP 12 : pas d'appel à l'API
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: monapp-config
  namespace: monapp
data:
  APP_MODE: prod                                         # TP 8
  LOG_LEVEL: info
---
# TP 9 : à NE PAS committer en clair (Sealed Secrets, SOPS ou External Secrets)
apiVersion: v1
kind: Secret
metadata:
  name: monapp-secret
  namespace: monapp
type: Opaque
stringData:
  DB_PASSWORD: a-remplacer
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: monapp
  namespace: monapp
  labels: {app: monapp}
spec:
  # pas de "replicas" : l'HPA décide (TP 15)
  revisionHistoryLimit: 5
  strategy:
    type: RollingUpdate
    rollingUpdate: {maxSurge: 1, maxUnavailable: 0}     # TP 4 : zéro coupure
  selector:
    matchLabels: {app: monapp}                           # TP 3 : = labels du template
  template:
    metadata:
      labels: {app: monapp}
    spec:
      serviceAccountName: monapp
      securityContext:
        runAsNonRoot: true
        seccompProfile: {type: RuntimeDefault}
      containers:
      - name: app
        image: nginxinc/nginx-unprivileged:1.27          # tag fixe, jamais :latest
        ports:
        - name: http
          containerPort: 8080
        envFrom:
        - configMapRef: {name: monapp-config}
        - secretRef: {name: monapp-secret}
        resources:
          requests: {cpu: 100m, memory: 128Mi}           # TP 15 : nécessaire au scheduler et à l'HPA
          limits: {memory: 256Mi}
        readinessProbe:                                  # TP 2 : prête à recevoir du trafic ?
          httpGet: {path: /, port: http}
          periodSeconds: 5
        livenessProbe:                                   # TP 2 : bloquée ? (pas de dépendance ici)
          httpGet: {path: /, port: http}
          initialDelaySeconds: 10
          periodSeconds: 10
          failureThreshold: 3
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities: {drop: ["ALL"]}
        volumeMounts:
        - {name: tmp, mountPath: /tmp}                   # seul dossier inscriptible
      volumes:
      - name: tmp
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: monapp
  namespace: monapp
spec:                                                    # TP 6 : ClusterIP par défaut
  selector: {app: monapp}
  ports:
  - port: 80
    targetPort: http                                     # port nommé : suit le conteneur
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: monapp
  namespace: monapp
  # annotations:
  #   cert-manager.io/cluster-issuer: letsencrypt        # si cert-manager est installé
spec:
  ingressClassName: traefik                              # TP 10 : adapter au contrôleur du cluster
  tls:
  - hosts: [monapp.example.com]
    secretName: monapp-tls
  rules:
  - host: monapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service: {name: monapp, port: {number: 80}}
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: monapp
spec:                                                    # TP 13
  podSelector: {}
  policyTypes: ["Ingress"]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: monapp-from-ingress
  namespace: monapp
spec:
  podSelector:
    matchLabels: {app: monapp}
  ingress:
  - from:
    - namespaceSelector:                                 # même élément = ET
        matchLabels: {kubernetes.io/metadata.name: kube-system}
      podSelector:                                       # vérifier : kubectl get pods -n kube-system --show-labels
        matchLabels: {app.kubernetes.io/name: traefik}
    ports:
    - port: 8080                                         # port du pod, pas du Service
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: monapp
  namespace: monapp
spec:                                                    # TP 15
  scaleTargetRef: {apiVersion: apps/v1, kind: Deployment, name: monapp}
  minReplicas: 2                                         # 2 minimum : survivre à la perte d'un pod
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target: {type: Utilization, averageUtilization: 70}
```

Pour un vrai projet, ce fichier devient un chart Helm (`helm create`) dont les valeurs propres à chaque environnement (image, hôte, nombre de pods, ressources) passent dans `values-<env>.yaml`.

---

### B5. Vérifier automatiquement

Le script `tests/run-all.sh` du dépôt rejoue chaque TP et vérifie chaque résultat. On peut reprendre la même démarche dans n'importe quel projet : chaque affirmation (« le pod est prêt », « Tom ne peut pas supprimer de pod ») devient une commande qui réussit ou échoue.

**Avant d'appliquer**

```bash
kubectl apply --dry-run=server -f k8s/     # l'API valide tout (schéma, CRD, PSA) sans rien créer
kubectl diff -f k8s/                       # ce qui va changer dans le cluster
helm lint ./chart && helm template r ./chart -f values-prod.yaml > /dev/null
trivy config k8s/                          # securityContext, limites, tags
```

**Après avoir appliqué**

```bash
kubectl rollout status deploy/monapp -n monapp --timeout=120s
kubectl wait --for=condition=Ready pod -l app=monapp -n monapp --timeout=90s
kubectl wait --for=condition=Established crd/backups.demo.cesi.fr --timeout=30s
# lire un champ précis avec jsonpath
kubectl get pod <pod> -o jsonpath='{.status.containerStatuses[0].restartCount}'
kubectl get svc monapp -n monapp -o jsonpath='{.spec.clusterIP}'
# vérifier les droits, y compris les refus attendus
kubectl auth can-i delete pods -n monapp --as=system:serviceaccount:monapp:monapp   # attendu : no
# tester l'appli de bout en bout, à travers l'Ingress
curl -s -o /dev/null -w '%{http_code}\n' -H "Host: monapp.example.com" http://$IP/   # attendu : 200
```

**Le modèle de `tests/lib.sh`**, réutilisable tel quel :

```bash
# check "description" 'commande qui doit réussir'   /   check_fail : doit échouer
check()      { if bash -c "$2" >/dev/null 2>&1; then echo "✅ $1"; else echo "❌ $1"; fi; }
check_fail() { check "$1" "! { $2 ; }"; }

# attendre qu'une condition devienne vraie, avec un délai maximum
wait_for() {
  local timeout=$1; shift; local end=$((SECONDS+timeout))
  until bash -c "$*" >/dev/null 2>&1; do [ $SECONDS -ge $end ] && return 1; sleep 3; done
}
export -f wait_for     # pour pouvoir l'appeler depuis check

check      "l'appli répond"           "curl -sf -H 'Host: monapp.example.com' http://$IP/"
check_fail "le front ne joint pas la base" "kubectl exec -n boutique front -- wget -qO- -T 3 http://db:5432"
check      "l'HPA a monté des pods"    "wait_for 240 '[ \$(kubectl get hpa api -o jsonpath={.status.currentReplicas}) -gt 1 ]'"
```

---

### B6. Transposer hors de k3s

Les objets Kubernetes sont les mêmes partout. Ce qui change, ce sont les composants « batteries incluses » de k3s.

| Besoin | Dans les TP (k3s) | Ailleurs |
| --- | --- | --- |
| Cluster local | k3d (k3s dans Docker) | kind, minikube, Docker Desktop |
| Cluster de production | k3s | EKS, GKE, AKS, kubeadm, RKE2, OpenShift |
| IP externe (`LoadBalancer`) | ServiceLB / Klipper : les IP des nœuds | Répartiteur du cloud ; MetalLB sur serveurs physiques |
| Contrôleur Ingress | Traefik (`ingressClassName: traefik`) | Traefik, HAProxy, NGINX Gateway Fabric, contrôleurs du cloud ; à terme, la Gateway API. Le contrôleur communautaire ingress-nginx, très présent dans les tutoriels, n'est plus maintenu depuis mars 2026 |
| Stockage dynamique | `local-path` (disque du nœud, sans réplication) | Pilotes CSI du cloud (EBS, Persistent Disk, Azure Disk), Longhorn, Rook-Ceph |
| NetworkPolicy | Contrôleur intégré à k3s | CNI compatible : Calico, Cilium (Flannel seul : ignorées) |
| `kubectl top`, HPA | metrics-server inclus | Souvent à installer (chart `metrics-server`) |
| DNS | CoreDNS | CoreDNS |
| Plage des IP de Services | 10.43.0.0/16 | Variable (10.96.0.0/12 avec kubeadm) |

**Réflexes en arrivant sur un nouveau cluster :**

```bash
kubectl config current-context     # suis-je sur le bon cluster ?
kubectl get nodes -o wide
kubectl get ingressclass           # quel contrôleur, quel nom pour ingressClassName ?
kubectl get storageclass           # quelle classe par défaut ?
kubectl get crd                    # quels opérateurs ?
kubectl get pods -n kube-system    # quels composants ?
kubectl auth can-i --list          # quels sont mes droits ?
```

---

## C. Antisèche des commandes

**Contexte et cluster**

```bash
kubectl config get-contexts / current-context / use-context <ctx>
kubectl config set-context --current --namespace=<ns>
kubectl cluster-info ; kubectl get nodes -o wide ; kubectl api-resources
```

**Lire**

```bash
kubectl get pods|deploy|rs|svc|ing|pvc|pv|cm|secret|sa|netpol|hpa -n <ns> [-o wide|yaml|json]
kubectl get all -n <ns> ; kubectl get pods -A ; kubectl get pods -l app=x --show-labels
kubectl get pods -w                                   # suivre en direct
kubectl get pod <p> -o jsonpath='{.status.podIP}'
kubectl describe <type> <nom>                          # section Events
kubectl explain deployment.spec.strategy
```

**Créer, modifier, supprimer**

```bash
kubectl apply -f fichier.yml | -f dossier/ ; kubectl delete -f fichier.yml --ignore-not-found
kubectl apply --dry-run=server -f . ; kubectl diff -f .
kubectl delete pod -l app=x ; kubectl delete namespace <ns>
```

**Générer du YAML plutôt que l'écrire**

```bash
kubectl create deployment monapp --image=nginx:1.27 --dry-run=client -o yaml > deploy.yml
kubectl expose deployment monapp --port=80 --target-port=8080 --dry-run=client -o yaml
kubectl create configmap cfg --from-literal=K=V --dry-run=client -o yaml
kubectl create secret generic s --from-literal=K=V --dry-run=client -o yaml
kubectl create role r --verb=get,list --resource=pods --dry-run=client -o yaml
kubectl create ingress i --class=traefik --rule="hote.fr/=svc:80" --dry-run=client -o yaml
```

**Déboguer**

```bash
kubectl logs <p> [-c conteneur] [--previous] [-f] ; kubectl logs -l app=x --prefix
kubectl exec -it <p> -- sh ; kubectl exec <p> -- printenv
kubectl run -it --rm t --image=busybox:1.37 --restart=Never -- sh   # pod de test jetable
kubectl port-forward pod/<p>|svc/<s>|deploy/<d> <local>:<distant>
kubectl get events -A --sort-by=.lastTimestamp ; kubectl top pods|nodes
```

**Déploiements**

```bash
kubectl rollout status|history|undo|restart deployment/<d>
kubectl scale deployment <d> --replicas=3          # pour tester ; en vrai, modifier le fichier
```

**Droits**

```bash
kubectl create token <sa> --duration=1h
kubectl auth can-i <verbe> <ressource> -n <ns> --as <user>|--as=system:serviceaccount:<ns>:<sa>
kubectl auth can-i --list -n <ns> --as <user>
```

**Helm**

```bash
helm repo add|update|list ; helm search repo <x> ; helm show values <chart>
helm install|upgrade --install <release> <chart> -n <ns> --create-namespace -f values.yaml
helm list -A ; helm history <r> -n <ns> ; helm rollback <r> <rev> -n <ns> ; helm uninstall <r> -n <ns>
helm create <c> ; helm lint <c> ; helm template <r> <c>
```

---

## D. Les pièges classiques

Chacun de ces pièges est provoqué exprès dans un TP. Sur un vrai projet, ils coûtent des heures.

**YAML**

- Une tabulation → refus du fichier. Un tiret oublié devant un élément de liste → refus (TP 1).
- `color: #d9534f` donne une valeur vide (`#` ouvre un commentaire) : écrire `"#d9534f"`. Mettre aussi entre guillemets les expressions cron, les versions (`"1.10"`) et les valeurs `env` numériques (`"8080"`).

**Labels et sélecteurs**

- `selector` différent des labels du `template` → refus (TP 3).
- Deux objets aux labels qui se recoupent se battent : un pod « intrus » est supprimé par un ReplicaSet (TP 3), deux Deployments au même selector se marchent dessus.
- Service sans endpoints : son `selector` ne correspond à aucun pod (TP 6).

**Écart entre le fichier et le cluster**

- `kubectl scale`, `kubectl set image` et `helm --set` : le fichier ne dit plus la vérité (TP 3, 4 et 17). On modifie le fichier, puis on l'applique.
- `replicas` dans un Deployment piloté par un HPA : chaque `apply` réimpose la valeur du fichier et contredit l'HPA (TP 15).

**Sondes et mises à jour**

- Pas de readiness : une version cassée remplace la bonne (TP 4).
- Mauvais port ou chemin de sonde : pod jamais prêt, ou redémarrages en boucle (TP 2).
- Une sonde ne se modifie pas sur un pod existant : supprimer et recréer, ou passer par un Deployment (TP 2).
- Liveness qui teste la base de données : une panne de la base redémarre tous les pods.
- Application qui ignore SIGTERM (shell en PID 1) : 30 secondes pour s'arrêter (TP 2).

**Réseau**

- `targetPort` différent du port d'écoute réel : plus de réponse (TP 5).
- Nom DNS court utilisé depuis un autre namespace : échec. Utiliser `service.namespace` (TP 7).
- `port` d'une NetworkPolicy = port du **pod**, pas celui du Service.
- `default-deny` en Egress sans autoriser le DNS : plus rien ne se résout.
- NetworkPolicy sur un cluster dont le CNI ne les applique pas : ignorées sans aucune erreur (TP 13).
- Ingress : le chemin arrive tel quel au backend ; `ingressClassName` absent ou faux ; Service situé dans un autre namespace (TP 10).
- `port-forward` est un outil de debug, pas une exposition de production (TP 0).

**Configuration et secrets**

- ConfigMap modifiée mais variables inchangées : les variables sont lues au démarrage, il faut `rollout restart` (TP 8).
- `echo` sans `-n` avant `base64` : la valeur contient un retour à la ligne (TP 9).
- base64 n'est pas du chiffrement : un Secret en clair dans Git est un mot de passe publié (TP 9).

**Stockage**

- `storageClassName` omis : le PVC part vers la classe par défaut et ignore votre PV (TP 11).
- PVC `Pending` avec `WaitForFirstConsumer` : c'est normal tant qu'aucun pod ne l'utilise (TP 11).
- `hostPath` : les données restent sur un seul nœud (TP 11).
- PV `Released` avec `Retain` : il ne se réattache pas tout seul (TP 11).
- `local-path` : pas de réplication, la perte du nœud fait perdre les données.

**Sécurité et droits**

- Jeton de ServiceAccount monté par défaut dans chaque pod (TP 12).
- Un Role ne vaut que pour son namespace ; les `nodes` demandent un ClusterRole (TP 12).
- Image root avec `runAsNonRoot` : `CreateContainerConfigError`. Port < 1024 sans root : impossible (TP 14).
- Namespace `restricted` : un Deployment est accepté mais ses pods refusés (voir `describe rs`), et un pod de test `kubectl run busybox` est lui aussi refusé (TP 14).
- `:latest` : impossible de savoir ce qui tourne, et le retour arrière perd son sens (TP 14).

**Ressources**

- Sans `requests.cpu`, l'HPA affiche `<unknown>` et ne fait rien (TP 15).
- Des `requests` trop élevées laissent le pod `Pending` à vie (TP 15).
- Dépasser la limite mémoire tue le conteneur ; dépasser la limite CPU le ralentit seulement (TP 15).

**Extensions**

- Une CRD sans contrôleur ne fait rien, et supprimer la CRD supprime tous ses objets (TP 16).
- `kubectl delete namespace` efface tout son contenu (TP 5).

---

## E. Pour aller plus loin

Les TP posent les bases. Voici les notions que l'on rencontre ensuite sur un vrai projet :

| Notion | À quoi elle sert |
| --- | --- |
| StatefulSet | Applis avec état : noms stables (`db-0`, `db-1`), un PVC par pod, démarrage ordonné |
| Job / CronJob | Tâches ponctuelles ou planifiées (migrations, sauvegardes) |
| startupProbe | Protéger les applis lentes à démarrer contre la liveness |
| PodDisruptionBudget | Garder un minimum de pods pendant la maintenance des nœuds |
| ResourceQuota / LimitRange | Plafonner les ressources d'un namespace, imposer des requests par défaut |
| Affinités, taints / tolerations | Contrôler sur quels nœuds tournent les pods |
| Kustomize (`kubectl apply -k`) | Variantes par environnement sans templates, alternative à Helm |
| GitOps (Argo CD, Flux) | Le cluster se synchronise seul sur Git : plus d'écart possible entre le fichier et le cluster |
| cert-manager | Certificats TLS automatiques (Let's Encrypt) |
| External Secrets / Sealed Secrets | Secrets gérés hors du cluster ou chiffrés dans Git |
| Gateway API | Successeure de l'Ingress |

---

## F. Auto-évaluation

Les questions posées dans les TP, avec les réponses attendues. Essayez d'y répondre avant d'ouvrir les blocs.

<details>
<summary><strong>TP 0 : la course au cluster</strong></summary>

- **Que reconnaît-on dans `kubectl get pods -A` ?** Les composants intégrés de k3s : `coredns` (DNS), `traefik` et `svclb-traefik-*` (Ingress et son LoadBalancer), `local-path-provisioner` (stockage), `metrics-server` (métriques), et les jobs `helm-install-traefik*` qui ont installé Traefik.
- **À quel cluster parle `kubectl` ? Où est rangée cette information ?** Au contexte `k3d-cesi`, défini dans `~/.kube/config` (créé par k3d).

</details>

<details>
<summary><strong>TP 1 : pods et YAML</strong></summary>

- **Statut avant `Running` ?** `Pending`, puis `ContainerCreating` (téléchargement de l'image).
- **`Events` de `describe` ?** `Scheduled` (nœud choisi), `Pulling`/`Pulled` (image), `Created`, `Started`.
- **Le pod supprimé ne revient pas : problème ?** Oui pour une vraie appli : un pod seul n'a pas de contrôleur pour le recréer. C'est le rôle du ReplicaSet et du Deployment (TP 3 et 4).
- **Label ajouté puis `apply` : recréé ?** Non, mis à jour en place : même `AGE`, même UID.
- **Tabulation ?** Erreur YAML (`found character that cannot start any token`).
- **Tiret retiré ?** `containers` devient un objet au lieu d'une liste : l'API refuse (`cannot unmarshal object into … []v1.Container`).
- **`2/2` ?** 2 conteneurs prêts sur 2.
- **Combien d'IP ?** Une seule, partagée par les deux conteneurs.
- **Pourquoi `localhost` fonctionne ?** Les conteneurs d'un pod partagent le même espace réseau.
- **Équivalent Docker ?** `docker run --network container:<nom-du-conteneur-web> …`.

</details>

<details>
<summary><strong>TP 2 : cycle de vie et sondes</strong></summary>

- **`-c sidecar` ?** Choisir le conteneur dont on lit les logs dans un pod qui en contient plusieurs.
- **`pod-image-introuvable` ?** `ErrImagePull` puis `ImagePullBackOff` : le tag `nginx:1.99` n'existe pas. Cause visible dans `describe` : le conteneur n'a jamais démarré, donc `logs` est vide.
- **`pod-qui-plante` ?** `Error` puis `CrashLoopBackOff` : le programme sort en code 1, Kubernetes le relance avec un délai qui double (10 s, 20 s, 40 s… jusqu'à 5 min) pour ne pas surcharger le nœud. La cause est dans `logs` (`variable DB_HOST absente`), car le conteneur a bien démarré et écrit.
- **Suppression en 30 s ?** Kubernetes envoie SIGTERM ; `sh`, en PID 1, l'ignore, et `sleep` ne le reçoit pas. Au bout du délai de grâce (30 s), SIGKILL.
- **Liveness `sonde-demo` ?** Fichier supprimé à 30 s, puis 3 échecs espacés de 5 s : `RESTARTS` passe à 1 vers 45 s. Message `Liveness probe failed: cat: can't open '/tmp/ok'`.
- **Readiness ?** `READY` passe à `0/1`, `RESTARTS` reste à 0 : le pod sort du trafic sans être redémarré.
- **`sondes-nginx` ?** La readiness vise le port 8080 alors que nginx écoute sur 80 (jamais prêt) ; la liveness vise `/healthz`, qui renvoie 404 (redémarrages). Correction : readiness sur le port 80, liveness sur le chemin `/`.

</details>

<details>
<summary><strong>TP 3 : ReplicaSet</strong></summary>

- **Pods ?** 3, nommés `myapp-replicaset-<suffixe aléatoire>`, répartis sur plusieurs nœuds par le scheduler.
- **Pod supprimé ?** Un nouveau apparaît aussitôt : le contrôleur ReplicaSet voit 2 pods au lieu de 3 et en recrée un.
- **Le fichier dit-il la vérité après `scale` ?** Non, il indique toujours 3 (même `scale -f` ne modifie pas le fichier). La méthode par fichier est préférable : le fichier versionné reste la source de vérité.
- **Pod `intrus` ?** Il porte le label du selector : le ReplicaSet le compte, se retrouve avec un pod de trop, et le supprime.
- **`replicaset-casse.yml` ?** `selector: type: back-end` mais le template porte `type: backend` : `selector does not match template labels`. Il faut aligner les deux.
- **Supprimer le ReplicaSet ?** Ses pods sont supprimés avec lui (cascade).

</details>

<details>
<summary><strong>TP 4 : Deployment</strong></summary>

- **Qui gère qui ?** Le Deployment gère un ReplicaSet (`<deploy>-<hash du template>`), qui gère les pods (`<rs>-<id>`).
- **Après la mise à jour ?** 2 ReplicaSets : le nouveau avec 3 pods, l'ancien à 0, conservé pour le retour arrière. `CHANGE-CAUSE` contient l'annotation `kubernetes.io/change-cause`.
- **Après `set image` ?** Le fichier indique encore `nginx:1.27` alors que le cluster tourne en 1.28 : écart entre le fichier et le cluster.
- **Image 1.99 ?** Les 3 anciens pods tournent toujours (avec 3 réplicas, les 25 % par défaut donnent `maxUnavailable` = 0 et `maxSurge` = 1) ; un seul nouveau pod est en `ImagePullBackOff`. Le service n'est pas coupé. Après `undo`, on revient à `nginx:1.28`.
- **Sans coupure, v2 ?** Un seul pod v2 démarre (`maxSurge: 1`) et n'est jamais `READY`. Les 3 pods v1 restent (`maxUnavailable: 0`). La mise à jour attend que le pod v2 soit prêt pour continuer, ce qui n'arrive jamais : elle reste bloquée, sans coupure.

</details>

<details>
<summary><strong>TP 5 : DaemonSet, namespaces et NodePort</strong></summary>

- **DaemonSet ?** 3 pods `log-agent`, un par nœud. Le 4e nœud reçoit automatiquement le sien, créé par le contrôleur DaemonSet.
- **`kubectl get pods` vide ?** Il ne regarde que le namespace courant (`default`) ; les pods sont dans `team1`.
- **Namespace dans `pod-team1.yml` ?** Dans `metadata.namespace`.
- **Réseau plat ?** Un pod de `default` joint directement l'IP d'un pod de `team1`, sans NAT ni port publié.
- **NodePort sur les 3 nœuds ?** Oui, même sans pod `myapp` sur le nœud : kube-proxy installe les règles du Service sur chaque nœud et redirige vers un pod, où qu'il soit.
- **`targetPort: 8080` ?** Plus de réponse : le Service envoie le trafic sur un port où nginx n'écoute pas.

</details>

<details>
<summary><strong>TP 6 : ClusterIP</strong></summary>

- **Le Service ?** Une `CLUSTER-IP` en 10.43.x.x, sans IP externe ni NodePort.
- **`Endpoints` ?** Les `IP:80` des 3 pods `whoami`.
- **Qui répond ?** Des pods différents d'un appel à l'autre : le Service répartit la charge.
- **Pod pas prêt ?** `READY 0/1`, son IP n'est pas dans les `Endpoints` (elle est dans `notReadyAddresses`), et il ne répond jamais.
- **Après suppression des pods ?** Nouvelles IP pour les pods, même `CLUSTER-IP` pour le Service.

</details>

<details>
<summary><strong>TP 7 : LoadBalancer et DNS</strong></summary>

- **`EXTERNAL-IP` ?** Les IP des nœuds (`INTERNAL-IP`) : Klipper publie le port sur chaque nœud grâce aux pods `svclb`.
- **NodePort et ClusterIP ?** Oui, les deux : un LoadBalancer s'appuie sur un NodePort, qui s'appuie sur une ClusterIP.
- **Nom court depuis `default` ?** Le pod cherche d'abord `mysql-service.default.svc.cluster.local`, qui n'existe pas. Depuis `dev`, le nom court fonctionne.
- **Quelle IP ?** Celle du Service (ClusterIP), pas celle d'un pod.

</details>

<details>
<summary><strong>TP 8 : ConfigMap</strong></summary>

- **Où est définie la couleur rose ?** En dur dans le manifeste du pod (`env.value: pink`).
- **`webapp` ?** Bleue : `APP_COLOR` vient de la ConfigMap.
- **`envFrom` ?** Toutes les clés (`APP_COLOR`, `APP_MODE`) deviennent des variables.
- **Après le passage en `green` ?** `config-volume` voit `green` sans redémarrer (le fichier est mis à jour). `webapp` reste bleue tant qu'on ne lance pas `rollout restart`, car les variables sont lues au démarrage.

</details>

<details>
<summary><strong>TP 9 : Secret</strong></summary>

- **`describe` ?** Il n'affiche que la taille des valeurs (en octets), pas leur contenu.
- **Retrouver le mot de passe ?** Une seconde, avec `base64 --decode`, pour quiconque a le droit de lire le Secret.
- **Pourquoi `-n` ?** Sans lui, `echo` ajoute un retour à la ligne, qui est encodé avec la valeur.
- **Dans le conteneur ?** Les valeurs arrivent décodées.
- **Volume ?** 3 fichiers (un par clé), montés sur un `tmpfs`, en mémoire.

</details>

<details>
<summary><strong>TP 10 : Ingress</strong></summary>

- **Type des Services ?** ClusterIP : injoignables de l'extérieur.
- **Contrôleur ?** Traefik, lui-même exposé par un Service LoadBalancer dans `kube-system`.
- **`defaultBackend` ?** Toutes les URL répondent `wear`, car il reçoit tout ce qui ne correspond à aucune règle, et il n'y a aucune règle.
- **`/autre` ?** 404 : aucune règle ne correspond et il n'y a pas de `defaultBackend`.
- **Entre parenthèses dans `describe` ?** Les `IP:port` des pods derrière chaque Service.
- **Par hôte ?** Traefik choisit selon l'en-tête HTTP `Host`.
- **`-k` ?** Accepter un certificat que `curl` ne peut pas vérifier (auto-signé). En production, cert-manager obtient un vrai certificat (Let's Encrypt).

</details>

<details>
<summary><strong>TP 11 : volumes</strong></summary>

- **`type: Directory` ?** Le pod reste en `ContainerCreating` : `hostPath type check failed: /data is not a directory`. `DirectoryOrCreate` crée le dossier.
- **`lecteur` ?** Le fichier n'existe que sur les nœuds où le pod a tourné, et chaque nœud n'a que ses propres nombres : `hostPath` colle les données à un nœud.
- **`myclaim` ?** `Bound` à `pv-vol1`, avec une capacité de 1 Gi (tout le PV, même si l'on a demandé 500 Mi).
- **`pvc-trop-gros` ?** `Pending` : aucun PV ne fait 2 Gi.
- **`Released` / `Retain` ?** Le PVC est supprimé, mais le PV garde ses données et la trace de l'ancienne demande. Il n'est pas réutilisable sans intervention de l'admin.
- **`data-pvc` en `Pending` ?** `WaitForFirstConsumer` : le PV ne sera créé que lorsqu'un pod l'utilisera, sur le nœud de ce pod.
- **Qui crée le PV ?** Le provisionneur `rancher.io/local-path`. Les données survivent à la suppression du pod.

</details>

<details>
<summary><strong>TP 12 : ServiceAccount et RBAC</strong></summary>

- **Réponse de l'API sans droit ?** `403 Forbidden : pods is forbidden: User "system:serviceaccount:default:dashboard-sa" cannot list…`. Le jeton prouve l'identité (le message la nomme) mais ne donne aucun droit.
- **Désactiver le jeton ?** Un attaquant qui obtient un shell dans le pod ne trouve aucun jeton pour attaquer l'API.
- **Les trois `can-i` ?** `yes` (le Role autorise `list` sur les pods de `default`) ; `no` (`delete` n'est pas dans les verbes) ; `no` (un Role ne vaut que pour son namespace).
- **`stagiaire.yaml` ?** `resources: ["pods"]`, `verbs: ["get", "list"]`, sujet `tom`, `roleRef` `view-only`.
- **Bonus :** `kubectl create clusterrole node-reader --verb=get,list --resource=nodes` puis `kubectl create clusterrolebinding tom-node-reader --clusterrole=node-reader --user=tom`.

</details>

<details>
<summary><strong>TP 13 : NetworkPolicy</strong></summary>

- **Front piraté ?** L'attaquant joint directement la base de données (mouvement latéral).
- **`podSelector: {}` ?** Tous les pods du namespace. `wget` finit en timeout : le contrôleur NetworkPolicy de k3s jette les paquets.
- **Après `api-from-front` ?** Seule l'API est rouverte, et seulement depuis `app: front` ; la base reste couverte par `default-deny`.
- **`db-from-api.yaml` ?** `podSelector` `app: db`, `from` `app: api`, port `5432`.
- **Identité d'un pod ?** Ses labels : le pod de test qui porte `app: api` passe.

</details>

<details>
<summary><strong>TP 14 : sécurité</strong></summary>

- **`pod-root` ?** `CreateContainerConfigError` : `container has runAsNonRoot and image will run as root`.
- **Utilisateur de `pod-securise` ?** `uid=101` (nginx), pas root.
- **`/tmp` mais pas `/etc` ?** La racine est en lecture seule (`readOnlyRootFilesystem`) ; `/tmp` est un volume `emptyDir`, inscriptible.
- **PSA `restricted` ?** `pod-root` est refusé dès la création (il manque `allowPrivilegeEscalation: false`, `capabilities.drop: [ALL]` et `seccompProfile`). `pod-securise` est accepté.
- **Trivy sur `pod-root.yml` ?** Il signale l'absence de `securityContext` durci au niveau du conteneur, de limites de ressources, de système de fichiers en lecture seule, etc.

</details>

<details>
<summary><strong>TP 15 : requests, limits et HPA</strong></summary>

- **`gourmand` ?** `Pending`, `FailedScheduling : 0/3 nodes are available: 3 Insufficient cpu`. Il ne consomme rien, puisqu'il n'est placé nulle part.
- **`oom` ?** `OOMKilled` puis `CrashLoopBackOff` : le noyau tue le processus qui dépasse sa limite mémoire.
- **CPU dépassé ?** Le conteneur n'est pas tué, il est ralenti.
- **HPA sous charge ?** `TARGETS` dépasse 50 % et `REPLICAS` monte jusqu'à 5. Exemple : 1 pod à 250 % donne ⌈ 1 × 250 / 50 ⌉ = 5.
- **Pourquoi retirer `replicas` ?** Chaque `apply` le réimposerait et contredirait l'HPA.

</details>

<details>
<summary><strong>TP 16 : CRD</strong></summary>

- **D'où vient la doc d'`explain` ?** Des champs `description` du schéma `openAPIV3Schema` de la CRD.
- **`backup-invalide` refusé ?** `oracle` ne figure pas dans l'`enum` (`mysql`, `postgres`), et `schedule`, obligatoire, manque.
- **À 2 h du matin ?** Rien : aucun contrôleur ne surveille les objets `Backup`. Il faudrait un opérateur qui lise ces objets et lance les sauvegardes (par exemple en créant un CronJob).

</details>

<details>
<summary><strong>TP 17 : Helm</strong></summary>

- **Version du chart / `APP VERSION` ?** La version du paquet (templates) / la version de l'application qu'il déploie.
- **Pods dev/prod ?** 1 et 3, à cause de `replicaCount` dans chaque fichier de values.
- **Objets créés ?** Un Deployment et un Service, qui engendrent ensuite un ReplicaSet et les pods, plus le Secret de la release.
- **Le rollback efface-t-il la révision 2 ?** Non, il crée une révision 3 qui reprend la configuration de la 1.
- **Où est l'historique ?** Dans des Secrets du namespace de la release, avec le label `owner=helm`.
- **`helm template` ?** Il produit les manifestes en local et n'installe rien dans le cluster.

</details>

<details>
<summary><strong>TP 18 : monitoring</strong></summary>

- **Avant tout outil ?** `kubectl get events -A --sort-by=.lastTimestamp` (ce qui s'est passé) et `kubectl top` (qui consomme).
- **`servicemonitors` ?** La CRD de l'opérateur Prometheus qui dit quoi collecter, en sélectionnant des Services par labels.
- **Grafana et `kubectl top` ?** Les tableaux de bord montrent les mêmes métriques, avec l'historique en plus.

</details>
