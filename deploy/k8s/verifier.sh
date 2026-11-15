#!/usr/bin/env bash
# Vérifie le prototype déployé sur le cluster local : chaque promesse du déploiement est contrôlée par une commande,
# de l'extérieur (à travers l'Ingress, en HTTPS) et dans le cluster.
#
#   deploy/k8s/verifier.sh        à lancer après deploy/k8s/deployer.sh (et observabilite/installer.sh pour le volet 7)
#
# Résultat brut dans tests/resultats/deploiement.txt. Code de sortie = nombre de contrôles en échec.
set -euo pipefail

RACINE="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=acces.sh
source "$RACINE/deploy/k8s/acces.sh"

NS=epouvante
RAPPORT="$RACINE/tests/resultats/deploiement.txt"
: > "$RAPPORT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

note() { echo "$*" | tee -a "$RAPPORT"; }
k() { kubectl -n "$NS" "$@"; }
ECHECS=0
verdict() {  # verdict <libellé> <obtenu> <attendu>
  if [[ "$2" == "$3" ]]; then note "  RÉUSSI  $1 : $2"; else note "  ÉCHEC   $1 : $2 (attendu : $3)"; ECHECS=$((ECHECS + 1)); fi
}
# Appel HTTPS vérifié avec le certificat de l'autorité locale.
appel() { curl -sS --connect-timeout 5 --max-time 15 --cacert "$AC_LOCALE" "$@"; }
code() { appel -o /dev/null -w '%{http_code}' "$@" 2>/dev/null || true; }
# jeton <compte> <mot de passe> : jeton d'accès délivré par Keycloak. Le mot de passe passe par l'entrée standard.
jeton() {
  printf '%s' "$2" | appel -d grant_type=password -d client_id=tests -d "username=$1" --data-urlencode password@- "$URL_JETONS" \
    | jq -r '.access_token // empty'
}
# connexion <pod ou deploy/nom> <hôte> <port> : tente une connexion TCP depuis un conteneur Node.js du cluster.
#   « ouverte »       la connexion s'établit ;
#   « refusee »       elle est rejetée aussitôt. C'est ce que fait k3s d'un flux interdit par une NetworkPolicy :
#                     son contrôleur termine la chaîne de pare-feu de chaque pod par une règle REJECT
#                     (lu dans les règles iptables du nœud le 15 novembre 2026) ;
#   « sans reponse »  rien ne revient en 3 secondes. C'est ce que donnerait un réseau de cluster qui jette
#                     les paquets (Calico, Cilium) : le cours décrit ce cas.
# Chaque flux interdit vise un port où un programme écoute : le refus vient donc de la règle, pas d'un port fermé.
SONDE_TCP='
const [hote, port] = process.argv.slice(1);
const prise = require("net").connect({ host: hote, port: Number(port) });
let dit = false;
const fin = (etat) => { if (!dit) console.log(etat); dit = true; prise.destroy(); };
prise.setTimeout(3000);
prise.on("connect", () => fin("ouverte"));
prise.on("timeout", () => fin("sans reponse"));
prise.on("error", (erreur) => fin(erreur.code === "ECONNREFUSED" ? "refusee" : "erreur " + erreur.code));'
connexion() { k exec "$1" -- node -e "$SONDE_TCP" "$2" "$3" 2>/dev/null | tail -1 || echo "exec impossible"; }
# au_moins <valeur> <seuil> : « oui » si la valeur est un nombre au moins égal au seuil.
au_moins() { [[ "$1" =~ ^[0-9]+$ && "$1" -ge "$2" ]] && echo oui || echo non; }

note "=== Vérification du prototype déployé — $(date '+%Y-%m-%d %H:%M:%S')"
note "Cluster : $(kubectl version -o json | jq -r '.serverVersion.gitVersion'), nœud $(kubectl get node -o jsonpath='{.items[0].status.nodeInfo.architecture}')"
note "Images : $(k get deploy annonces notifications -o jsonpath='{range .items[*]}{.spec.template.spec.containers[0].image}{"  "}{end}')"

note ""
note "--- 1. Disponibilité : pods, sondes, mise à l'échelle"
for service in annonces notifications; do
  verdict "pods $service prêts, au moins 2" "$(au_moins "$(k get deploy "$service" -o jsonpath='{.status.readyReplicas}')" 2)" "oui"
  verdict "sondes de $service : démarrage, prêt, vivant" \
    "$(k get deploy "$service" -o jsonpath='{.spec.template.spec.containers[0].startupProbe.httpGet.path} {.spec.template.spec.containers[0].readinessProbe.httpGet.path} {.spec.template.spec.containers[0].livenessProbe.httpGet.path}')" \
    "/sante /sante/pret /sante"
  verdict "ressources de $service : réservées et plafonnées" \
    "$(k get deploy "$service" -o jsonpath='{.spec.template.spec.containers[0].resources}')" \
    '{"limits":{"cpu":"500m","memory":"256Mi"},"requests":{"cpu":"250m","memory":"128Mi"}}'
  # Après un démarrage ou une mise à jour, metrics-server met jusqu'à une minute à mesurer les nouveaux pods :
  # d'ici là, le HPA affiche « unknown ». On attend la mesure, 2 minutes au plus.
  for _ in $(seq 1 40); do
    [[ -n "$(k get hpa "$service" -o jsonpath='{.status.currentMetrics[0].resource.current.averageUtilization}')" ]] && break
    sleep 3
  done
  verdict "le HPA de $service mesure le processeur" \
    "$([[ -n "$(k get hpa "$service" -o jsonpath='{.status.currentMetrics[0].resource.current.averageUtilization}')" ]] && echo oui || echo non)" "oui"
done
k get hpa | sed 's/^/    /' | tee -a "$RAPPORT"

note ""
note "--- 2. HTTPS : redirection, certificat émis par cert-manager"
verdict "requête HTTP : redirigée vers HTTPS" \
  "$(curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' "http://api.epouvante.localhost/api/annonces" 2>/dev/null || true)" \
  "301 https://api.epouvante.localhost/api/annonces"
verdict "appel HTTPS vérifié avec l'autorité locale : code HTTP et vérification TLS (0 = chaîne valide)" \
  "$(appel -o /dev/null -w '%{http_code} %{ssl_verify_result}' "$URL_API/api/annonces")" "401 0"
set +e
curl -sS -o /dev/null --connect-timeout 5 "$URL_API/api/annonces" 2>/dev/null
CODE_SANS_AC=$?
set -e
verdict "sans le certificat de l'autorité, le client refuse la connexion (code de sortie de curl)" "$CODE_SANS_AC" 60
verdict "certificats « api-tls » et « identite-tls » prêts" \
  "$(k get certificate api-tls identite-tls -o jsonpath='{range .items[*]}{.status.conditions[?(@.type=="Ready")].status} {end}')" "True True "
note "Certificat présenté par Traefik pour api.epouvante.localhost :"
openssl s_client -connect 127.0.0.1:443 -servername api.epouvante.localhost </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates -ext subjectAltName | sed 's/^/    /' | tee -a "$RAPPORT"

note ""
note "--- 3. Exposition : seules les routes /api et la délivrance des jetons sont visibles de l'extérieur"
verdict "GET /api/annonces sans jeton" "$(code "$URL_API/api/annonces")" 401
verdict "GET /sante par l'Ingress" "$(code "$URL_API/sante")" 404
verdict "GET /sante/pret par l'Ingress" "$(code "$URL_API/sante/pret")" 404
verdict "GET /metrics par l'Ingress" "$(code "$URL_API/metrics")" 404
verdict "console d'administration de Keycloak par l'Ingress" "$(code "https://auth.epouvante.localhost/admin/")" 404
verdict "émetteur annoncé par Keycloak" \
  "$(appel "https://auth.epouvante.localhost/realms/epouvante/.well-known/openid-configuration" | jq -r '.issuer')" \
  "https://auth.epouvante.localhost/realms/epouvante"

note ""
note "--- 4. La chaîne complète à travers l'Ingress : jeton, publication, événement, notification"
JETON_A="$(jeton membre-a "$COMPTE_MEMBRE_A_MOT_DE_PASSE")"
JETON_B="$(jeton membre-b "$COMPTE_MEMBRE_B_MOT_DE_PASSE")"
verdict "jetons délivrés par Keycloak à membre-a et membre-b" "$([[ -n "$JETON_A" && -n "$JETON_B" ]] && echo oui || echo non)" "oui"
verdict "membre-b choisit la catégorie « figurines »" \
  "$(code -X PUT -H "Authorization: Bearer $JETON_B" -H 'Content-Type: application/json' -d '{"categories":["figurines"]}' "$URL_API/api/centres-interet")" 200
appel -o "$TMP/annonce.json" -w '%{http_code}' -H "Authorization: Bearer $JETON_A" -H 'Content-Type: application/json' \
  -d "{\"titre\":\"Vérification du déploiement $(date +%s)\",\"description\":\"Annonce publiée par verifier.sh.\",\"categorie\":\"figurines\",\"type\":\"don\"}" \
  "$URL_API/api/annonces" > "$TMP/code-publication"
verdict "membre-a publie une annonce" "$(cat "$TMP/code-publication")" 201
ANNONCE="$(jq -r '.id' "$TMP/annonce.json")"
NOTIFIE=non
for _ in $(seq 1 25); do
  if appel -H "Authorization: Bearer $JETON_B" "$URL_API/api/notifications" | jq -e --arg id "$ANNONCE" '.notifications | any(.annonceId == $id)' >/dev/null; then
    NOTIFIE=oui; break
  fi
  sleep 0.2
done
verdict "membre-b trouve la notification de cette annonce en moins de 5 secondes" "$NOTIFIE" "oui"
verdict "un membre ne peut pas retirer l'annonce (rôle moderateur exigé)" \
  "$(code -X DELETE -H "Authorization: Bearer $JETON_A" "$URL_API/api/annonces/$ANNONCE")" 403

note ""
note "--- 5. Moindre privilège dans les conteneurs"
for service in annonces notifications; do
  verdict "utilisateur du conteneur $service" "$(k exec "deploy/$service" -- id -u 2>/dev/null)" 1000
  verdict "système de fichiers de $service en lecture seule" \
    "$(k exec "deploy/$service" -- sh -c 'touch /app/essai 2>&1 || true' 2>/dev/null | grep -c 'Read-only file system')" 1
  verdict "jeton d'accès à l'API de Kubernetes dans le pod $service" \
    "$(k exec "deploy/$service" -- sh -c 'ls /var/run/secrets/kubernetes.io/serviceaccount 2>/dev/null | wc -l' 2>/dev/null | tr -d ' ')" 0
done
set +e
kubectl -n "$NS" run essai-privilegie --image=busybox:1.37 --restart=Never --dry-run=server \
  --overrides='{"spec":{"containers":[{"name":"essai-privilegie","image":"busybox:1.37","securityContext":{"privileged":true}}]}}' \
  > "$TMP/psa.txt" 2>&1
set -e
verdict "un pod privilégié est refusé par l'espace de noms (Pod Security Admission)" \
  "$(grep -c 'violates PodSecurity "restricted' "$TMP/psa.txt")" 1
head -c 300 "$TMP/psa.txt" | sed 's/^/    /' | tee -a "$RAPPORT"; note ""

note ""
note "--- 6. Règles réseau : flux autorisés ouverts, tout le reste refusé"
IMAGE_ANNONCES_DEPLOYEE="$(k get deploy annonces -o jsonpath='{.spec.template.spec.containers[0].image}')"
verdict "annonces -> postgresql:5432 (autorisé)" "$(connexion deploy/annonces postgresql 5432)" "ouverte"
verdict "annonces -> rabbitmq:5672 (autorisé)" "$(connexion deploy/annonces rabbitmq 5672)" "ouverte"
verdict "annonces -> keycloak:8080 (autorisé : lecture des clés publiques)" "$(connexion deploy/annonces keycloak 8080)" "ouverte"
verdict "annonces -> notifications:80 (interdit : les services ne se parlent que par le broker)" "$(connexion deploy/annonces notifications 80)" "refusee"
verdict "notifications -> annonces:80 (interdit)" "$(connexion deploy/notifications annonces 80)" "refusee"
verdict "annonces -> rabbitmq:15672, console de gestion du broker (interdit)" "$(connexion deploy/annonces rabbitmq 15672)" "refusee"
verdict "annonces -> API de Kubernetes (interdit)" "$(connexion deploy/annonces kubernetes.default.svc.cluster.local 443)" "refusee"
verdict "annonces -> Internet, 1.1.1.1:443 (interdit)" "$(connexion deploy/annonces 1.1.1.1 443)" "refusee"
verdict "keycloak -> rabbitmq:5672 (interdit)" \
  "$(k exec deploy/keycloak -- bash -c 'timeout 3 bash -c "exec 3<>/dev/tcp/rabbitmq/5672" 2>/dev/null && echo ouverte || echo refusee' 2>/dev/null)" "refusee"
# Un pod étranger, lancé dans un autre espace de noms : il ne doit pas atteindre la base de données.
# Même destination et même port que le premier contrôle, qui réussit : seule la source change.
INTRUS="$(kubectl -n default run intrus --rm -i --restart=Never --quiet --image="$IMAGE_ANNONCES_DEPLOYEE" --image-pull-policy=IfNotPresent \
  --command -- node -e "$SONDE_TCP" postgresql.epouvante.svc.cluster.local 5432 2>/dev/null | tail -1 || true)"
verdict "pod d'un autre espace de noms -> postgresql:5432 (interdit)" "$INTRUS" "refusee"
note "Règle posée par k3s au bout de la chaîne de pare-feu d'un pod :"
docker exec k3d-epouvante-server-0 sh -c 'iptables-save 2>/dev/null' | grep 'KUBE-POD-FW' | grep 'REJECT' | grep 'namespace: epouvante' \
  | head -1 | sed 's/^-A KUBE-POD-FW-[A-Z0-9]* /    /' | tee -a "$RAPPORT"

note ""
note "--- 7. Observabilité : Prometheus collecte chaque pod"
if kubectl get namespace monitoring >/dev/null 2>&1; then
  # Requête à Prometheus à travers l'API de Kubernetes : aucun port à ouvrir sur le poste.
  prom() {
    kubectl get --raw "/api/v1/namespaces/monitoring/services/supervision-prometheus:9090/proxy/api/v1/query?query=$(jq -rn --arg q "$1" '$q|@uri')" \
      | jq -r '.data.result[0].value[1] // "aucune"'
  }
  for service in annonces notifications; do
    # La requête est construite à part : le bash 3.2 de macOS garde les barres obliques inverses
    # d'une chaîne entre guillemets placée dans deux substitutions de commande imbriquées.
    requete='count(up{namespace="epouvante",job="'"$service"'"} == 1)'
    verdict "pods $service collectés par Prometheus, au moins 2" "$(au_moins "$(prom "$requete")" 2)" "oui"
  done
  verdict "broker collecté par Prometheus" "$(prom 'count(up{namespace="epouvante",job="rabbitmq"} == 1)')" 1
  # Prometheus lit chaque pod toutes les 15 secondes : on attend que la publication du volet 4 y soit, 60 secondes au plus.
  PUBLICATIONS='sum(max_over_time(http_request_duration_seconds_count{namespace="epouvante",method="POST",route="/api/annonces",code="201"}[15m]))'
  for _ in $(seq 1 20); do
    [[ "$(au_moins "$(prom "$PUBLICATIONS")" 1)" == "oui" ]] && break
    sleep 3
  done
  verdict "la publication du volet 4 est comptée (POST /api/annonces, code 201)" "$(au_moins "$(prom "$PUBLICATIONS")" 1)" "oui"
  # Un taux se calcule sur deux mesures au moins : après un déploiement, il faut deux collectes des nouveaux pods.
  CENTILE='histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{namespace="epouvante"}[5m])))'
  for _ in $(seq 1 30); do
    [[ "$(prom "$CENTILE")" =~ ^[0-9.]+$ ]] && break
    sleep 3
  done
  verdict "le temps de réponse au 95e centile se calcule (indicateur I2)" \
    "$([[ "$(prom "$CENTILE")" =~ ^[0-9.]+$ ]] && echo oui || echo non)" "oui"
  note "Pods de l'espace de noms monitoring :"
  kubectl -n monitoring get pods --no-headers | awk '{print "    " $1 "  " $2 "  " $3}' | tee -a "$RAPPORT"
else
  note "  NON EXÉCUTÉ : l'espace de noms monitoring n'existe pas (lancer deploy/k8s/observabilite/installer.sh)"
fi

note ""
note "--- 8. Perte d'un pod : le service continue, le pod est remplacé, le nouveau pod est collecté"
VICTIME="$(k get pod -l app=annonces -o jsonpath='{.items[0].metadata.name}')"
k delete pod "$VICTIME" --wait=false >/dev/null
note "Pod supprimé : $VICTIME. 60 appels à GET /api/annonces pendant son remplacement :"
: > "$TMP/codes.txt"
for _ in $(seq 1 60); do
  code "$URL_API/api/annonces" >> "$TMP/codes.txt"; echo >> "$TMP/codes.txt"
  sleep 0.25
done
note "Codes reçus : $(sort "$TMP/codes.txt" | uniq -c | awk '{printf "%s × %s  ", $1, $2}')"
verdict "réponses autres que celle attendue (401, sans jeton) pendant le remplacement" "$(grep -v -c '^401$' "$TMP/codes.txt" || true)" 0
k rollout status deployment/annonces --timeout=120s >/dev/null
verdict "pods annonces prêts après le remplacement, au moins 2" "$(au_moins "$(k get deploy annonces -o jsonpath='{.status.readyReplicas}')" 2)" "oui"
verdict "le pod supprimé n'existe plus" "$(k get pod "$VICTIME" --ignore-not-found --no-headers | grep -c Running || true)" 0
if kubectl get namespace monitoring >/dev/null 2>&1; then
  # Aucun réglage n'est touché : Prometheus découvre le pod de remplacement par le Service. On attend, 90 secondes au plus.
  ANCIENS='count(up{namespace="epouvante",job="annonces",pod="'"$VICTIME"'"} == 1)'
  for _ in $(seq 1 30); do
    [[ "$(au_moins "$(prom 'count(up{namespace="epouvante",job="annonces"} == 1)')" 2)" == "oui" && "$(prom "$ANCIENS")" == "aucune" ]] && break
    sleep 3
  done
  verdict "Prometheus collecte de nouveau 2 pods annonces, sans le pod supprimé" \
    "$(prom 'count(up{namespace="epouvante",job="annonces"} == 1)') $(prom "$ANCIENS")" "2 aucune"
fi

note ""
note "--- Mémoire et processeur (kubectl top, mesure instantanée)"
kubectl top node | sed 's/^/    /' | tee -a "$RAPPORT"
kubectl top pod -A --sort-by=memory | sed 's/^/    /' | tee -a "$RAPPORT"

note ""
if [[ "$ECHECS" -eq 0 ]]; then note "BILAN : tous les contrôles sont réussis"; else note "BILAN : $ECHECS contrôle(s) en échec"; fi
exit "$ECHECS"
