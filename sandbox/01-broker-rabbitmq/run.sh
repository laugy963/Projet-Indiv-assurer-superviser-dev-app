#!/usr/bin/env bash
# Expérimentation 1 — RabbitMQ sur Kubernetes : publication, consommation, résistance aux pannes.
#
# Rejouer :  ./run.sh     (le cluster k3d « epouvante » doit exister, voir deploy/k3d/README.md)
# Le script repart de zéro à chaque fois : il supprime puis recrée l'espace de noms.
# Les résultats bruts sont écrits dans resultats/execution.txt.
set -euo pipefail

ICI="$(cd "$(dirname "$0")" && pwd)"
source "$ICI/../../deploy/k3d/env.sh"

NS=bac-a-sable-broker
IMAGE=bac-a-sable/client-amqp:1
FILE=notifications.annonce-publiee
FILE_ECHECS=notifications.annonce-publiee.echecs
RAPPORT="$ICI/resultats/execution.txt"
mkdir -p "$ICI/resultats"
: > "$RAPPORT"

note() { echo "$*" | tee -a "$RAPPORT"; }
k() { kubectl -n "$NS" "$@"; }

# Nombre de messages d'une file : prêts, plus remis mais pas encore accusés.
taille_file() {
  k exec rabbitmq-0 -- rabbitmqctl -q list_queues name messages 2>/dev/null | awk -v f="$1" '$1 == f {print $2}'
}

# attendre_file <file> <taille attendue> <délai maximal en secondes>
attendre_file() {
  local i=0
  while [ "$(taille_file "$1")" != "$2" ]; do
    i=$((i + 1))
    if [ "$i" -gt "$3" ]; then
      note "ÉCHEC : la file $1 contient $(taille_file "$1") message(s), $2 attendu(s)"
      return 1
    fi
    sleep 1
  done
}

# publier <préfixe> <nombre> [1 = message défectueux]
publier() {
  local nom="producteur-$1"
  sed -e "s/__NOM__/$nom/" -e "s/__NB__/$2/" -e "s/__PREFIXE__/$1/" -e "s/__DEFECTUEUX__/${3:-0}/" \
    "$ICI/k8s/job-producteur.yaml" | k apply -f - >/dev/null
  k wait --for=condition=complete "job/$nom" --timeout=120s >/dev/null
  k logs "job/$nom" | tee -a "$RAPPORT"
}

# Nombre de messages traités par le consommateur en cours, pour un préfixe donné.
traites() {
  k logs deploy/consommateur | grep -c "\"etat\":\"traite\",\"id\":\"$1-" || true
}

# Pendant une mise à jour, l'ancien pod et le nouveau consomment ensemble : on attend qu'il n'en reste qu'un.
attendre_un_seul_consommateur() {
  local i=0
  while [ "$(k get pods -l app=consommateur --no-headers 2>/dev/null | wc -l | tr -d ' ')" != "1" ]; do
    i=$((i + 1))
    if [ "$i" -gt 90 ]; then note "ÉCHEC : plusieurs pods consommateurs encore présents"; return 1; fi
    sleep 1
  done
}

verdict() {  # verdict <libellé> <obtenu> <attendu>
  if [ "$2" = "$3" ]; then note "  RÉUSSI  $1 : $2"; else note "  ÉCHEC   $1 : $2 (attendu : $3)"; ECHECS=$((ECHECS + 1)); fi
}
ECHECS=0

note "=== Expérimentation 1 — RabbitMQ sur Kubernetes — $(date '+%Y-%m-%d %H:%M:%S')"
note "Cluster : $(kubectl version -o json | jq -r '.serverVersion.gitVersion')"

note ""
note "--- Préparation"
docker build -q -t "$IMAGE" "$ICI/client" >/dev/null
k3d image import "$IMAGE" -c epouvante >/dev/null 2>&1
note "Image $IMAGE construite et importée dans le cluster"
kubectl delete namespace "$NS" --ignore-not-found --wait=true >/dev/null
kubectl create namespace "$NS" >/dev/null
# Mot de passe aléatoire, créé à chaque exécution : aucun secret dans le dépôt.
k create secret generic rabbitmq-compte \
  --from-literal=utilisateur=epouvante \
  --from-literal=mot-de-passe="$(openssl rand -hex 16)" >/dev/null

DEBUT=$(date +%s)
k apply -f "$ICI/k8s/rabbitmq.yaml" >/dev/null
k rollout status statefulset/rabbitmq --timeout=300s >/dev/null
note "RabbitMQ prêt en $(($(date +%s) - DEBUT)) s (téléchargement de l'image compris à la première exécution)"
note "Version : RabbitMQ $(k exec rabbitmq-0 -- rabbitmqctl -q version)"
note "Utilisateur du conteneur : $(k exec rabbitmq-0 -- id)"

# Les messages refusés par la file principale partent vers l'exchange des échecs.
# Réglage posé par une règle (« policy ») côté broker, comme le recommande la documentation de RabbitMQ.
k exec rabbitmq-0 -- rabbitmqctl -q set_policy echecs '^notifications\.annonce-publiee$' \
  '{"dead-letter-exchange":"annonces.echecs"}' --apply-to queues >/dev/null
note "Règle des messages en échec posée"

k apply -f "$ICI/k8s/consommateur.yaml" >/dev/null
k rollout status deploy/consommateur --timeout=120s >/dev/null
attendre_file "$FILE" 0 60

note ""
note "--- Test 1 : publication et consommation, consommateur en marche"
publier t1 100
attendre_file "$FILE" 0 60
verdict "messages traités" "$(traites t1)" 100

note ""
note "--- Test 2 : publication pendant que le consommateur est arrêté"
DEBUT=$(date +%s)
k scale deploy/consommateur --replicas=0 >/dev/null
k wait --for=delete pod -l app=consommateur --timeout=60s >/dev/null
note "Consommateur arrêté en $(($(date +%s) - DEBUT)) s (délai maximal accordé par Kubernetes : 30 s)"
publier t2 100
verdict "messages en attente dans la file, consommateur arrêté" "$(taille_file "$FILE")" 100
k scale deploy/consommateur --replicas=1 >/dev/null
k rollout status deploy/consommateur --timeout=120s >/dev/null
attendre_file "$FILE" 0 60
verdict "messages traités après le redémarrage du consommateur" "$(traites t2)" 100

note ""
note "--- Test 3 : redémarrage du broker avec des messages en attente"
k scale deploy/consommateur --replicas=0 >/dev/null
k wait --for=delete pod -l app=consommateur --timeout=60s >/dev/null
publier t3 50
verdict "messages en attente avant l'arrêt du broker" "$(taille_file "$FILE")" 50
k delete pod rabbitmq-0 --wait=true >/dev/null
DEBUT=$(date +%s)
k rollout status statefulset/rabbitmq --timeout=300s >/dev/null
note "Broker de nouveau prêt en $(($(date +%s) - DEBUT)) s"
verdict "messages toujours en attente après le redémarrage du broker" "$(taille_file "$FILE")" 50
k scale deploy/consommateur --replicas=1 >/dev/null
k rollout status deploy/consommateur --timeout=120s >/dev/null
attendre_file "$FILE" 0 60
verdict "messages traités après le redémarrage du broker" "$(traites t3)" 50

note ""
note "--- Test 4 : panne du consommateur avant l'accusé de réception"
k set env deploy/consommateur MODE=panne-une-fois >/dev/null
k rollout status deploy/consommateur --timeout=120s >/dev/null
attendre_un_seul_consommateur
publier t4 1
attendre_file "$FILE" 0 120
POD=$(k get pod -l app=consommateur -o jsonpath='{.items[0].metadata.name}')
note "Journal du conteneur avant la panne :"
k logs "$POD" --previous | grep '"id":"t4-' | sed 's/^/    /' | tee -a "$RAPPORT"
note "Journal du conteneur après le redémarrage :"
k logs "$POD" | grep '"id":"t4-' | sed 's/^/    /' | tee -a "$RAPPORT"
verdict "redémarrages du conteneur" "$(k get pod "$POD" -o jsonpath='{.status.containerStatuses[0].restartCount}')" 1
verdict "message remis par le broker, puis traité" "$(k logs "$POD" | grep -c '"etat":"traite","id":"t4-001","dejaRemis":true' || true)" 1
k set env deploy/consommateur MODE=normal >/dev/null
k rollout status deploy/consommateur --timeout=120s >/dev/null
attendre_un_seul_consommateur

note ""
note "--- Test 5 : message refusé, envoyé vers la file des messages en échec"
publier t5 1 1
attendre_file "$FILE" 0 60
attendre_file "$FILE_ECHECS" 1 60
verdict "messages dans la file des messages en échec" "$(taille_file "$FILE_ECHECS")" 1
verdict "messages restés dans la file principale" "$(taille_file "$FILE")" 0

note ""
note "--- État final des files"
k exec rabbitmq-0 -- rabbitmqctl -q list_queues name durable messages | tee -a "$RAPPORT"

note ""
note "--- Mémoire et processeur (kubectl top, mesure instantanée)"
sleep 45   # laisse à metrics-server le temps de mesurer les derniers pods
k top pod | tee -a "$RAPPORT"

note ""
if [ "$ECHECS" -eq 0 ]; then note "BILAN : tous les contrôles sont réussis"; else note "BILAN : $ECHECS contrôle(s) en échec"; fi
exit "$ECHECS"
