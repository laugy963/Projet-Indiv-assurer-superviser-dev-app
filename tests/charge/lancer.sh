#!/usr/bin/env bash
# Lance le test de charge du prototype déployé sur le cluster local, et relève la mise à l'échelle pendant le test.
#
#   tests/charge/lancer.sh           test complet : 13 minutes, 50 puis 200 utilisateurs simultanés
#   tests/charge/lancer.sh essai     essai court (80 secondes, 5 puis 10 utilisateurs), pour valider le scénario
#   CHARGE_NOMINALE=20 CHARGE_POINTE=80 tests/charge/lancer.sh     autres paliers
#
# Seul prérequis : Docker. k6 est lancé en conteneur, désigné par l'empreinte de son image (fiche 0016).
# Sorties : tests/charge/resultats/<date>/ (brutes, non versionnées) ; le test complet écrit aussi
# sa preuve dans tests/resultats/charge-<nominale>-<pointe>.txt. Code de sortie : celui de k6, non nul si un seuil n'est pas tenu.
set -euo pipefail

RACINE="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=../../deploy/k8s/acces.sh
source "$RACINE/deploy/k8s/acces.sh"

# k6 2.4.0, relevé le 15 novembre 2026 : docker buildx imagetools inspect grafana/k6:2.4.0
IMAGE_K6="grafana/k6:2.4.0@sha256:d41bb79cd8de5a7ad619b53570e3712633e8bff0937010a5c6c57a4747e7a276"
NS=epouvante
MODE="${1:-complet}"
if [[ "$MODE" == "essai" ]]; then
  # Essai : paliers dix fois plus courts et petite charge. Il valide le scénario, il ne mesure rien.
  export CHARGE_ESSAI=1 CHARGE_NOMINALE="${CHARGE_NOMINALE:-5}" CHARGE_POINTE="${CHARGE_POINTE:-10}"
else
  export CHARGE_ESSAI=0 CHARGE_NOMINALE="${CHARGE_NOMINALE:-50}" CHARGE_POINTE="${CHARGE_POINTE:-200}"
fi

SORTIE="$RACINE/tests/charge/resultats/$(date +%Y%m%d-%H%M%S)-$MODE"
mkdir -p "$SORTIE"
k() { kubectl -n "$NS" "$@"; }

echo "--- Préparation"
"$RACINE/tests/charge/comptes.sh"
# Le test part d'un état connu : le minimum de pods, et une mesure du processeur disponible pour le HPA.
k rollout status deployment/annonces --timeout=120s >/dev/null
k rollout status deployment/notifications --timeout=120s >/dev/null
echo "Pods au départ : annonces $(k get deploy annonces -o jsonpath='{.status.readyReplicas}'), notifications $(k get deploy notifications -o jsonpath='{.status.readyReplicas}')"
# Nombre total de redémarrages de conteneurs dans l'espace de noms : relevé avant et après, pour dire ce que le test a coûté.
redemarrages() { k get pods -o jsonpath='{range .items[*]}{range .status.containerStatuses[*]}{.restartCount}{"\n"}{end}{end}' | awk '{s += $1} END {print s + 0}'; }
REDEMARRAGES_AVANT="$(redemarrages)"

# Relevé de la mise à l'échelle toutes les 10 secondes : ce que mesure le HPA, ce qu'il demande, ce qui est prêt.
FILE_EN_ATTENTE="$(jq -rn '"rabbitmq_detailed_queue_messages_ready{queue=\"notifications.annonce-publiee\"}" | @uri')"
releve() {
  echo "heure;annonces_cpu_pct;annonces_demandes;annonces_prets;notifications_cpu_pct;notifications_demandes;notifications_prets;file_en_attente"
  while true; do
    ligne="$(date +%H:%M:%S)"
    for service in annonces notifications; do
      ligne="$ligne;$(k get hpa "$service" -o jsonpath='{.status.currentMetrics[0].resource.current.averageUtilization};{.status.desiredReplicas}' 2>/dev/null || echo ';')"
      ligne="$ligne;$(k get deploy "$service" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || true)"
    done
    # Messages en attente dans la file du service notifications : lus dans Prometheus, à travers l'API de Kubernetes.
    # Interroger le broker lui-même (rabbitmqctl) lancerait une machine virtuelle Erlang toutes les 10 secondes,
    # et le relevé fausserait la mesure.
    ligne="$ligne;$(kubectl get --raw "/api/v1/namespaces/monitoring/services/supervision-prometheus:9090/proxy/api/v1/query?query=$FILE_EN_ATTENTE" 2>/dev/null | jq -r '.data.result[0].value[1] // ""' 2>/dev/null || true)"
    echo "$ligne"
    sleep 10
  done
}
releve > "$SORTIE/mise-a-l-echelle.csv" &
RELEVE=$!
trap 'kill "$RELEVE" 2>/dev/null || true' EXIT

echo ""
echo "--- Test de charge : k6, $CHARGE_NOMINALE puis $CHARGE_POINTE utilisateurs simultanés (mode $MODE)"
# k6 tourne dans le réseau Docker du cluster et entre par le répartiteur de k3d, comme le fait le poste par 127.0.0.1 :
# même chemin que le trafic externe (répartiteur, Traefik en HTTPS, services). Les deux noms d'hôte lui sont donnés.
ENTREE="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' k3d-epouvante-serverlb)"
DEBUT="$(date '+%Y-%m-%d %H:%M:%S')"
DEBUT_UTC="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
set +e
docker run --rm --network k3d-epouvante \
  --add-host "api.epouvante.localhost:$ENTREE" --add-host "auth.epouvante.localhost:$ENTREE" \
  -v "$RACINE/tests/charge/scenario.js:/scenario.js:ro" -v "$AC_LOCALE:/ac-locale.crt:ro" -v "$SORTIE:/sortie" \
  -e SSL_CERT_FILE=/ac-locale.crt \
  -e URL_API -e URL_JETONS -e COMPTE_CHARGE_MOT_DE_PASSE -e CHARGE_NOMINALE -e CHARGE_POINTE -e CHARGE_ESSAI \
  --user "$(id -u):$(id -g)" \
  "$IMAGE_K6" run --no-usage-report --quiet --summary-mode=full --summary-export=/sortie/resume.json /scenario.js \
  > "$SORTIE/k6.txt" 2>&1
CODE=$?
set -e
FIN="$(date '+%Y-%m-%d %H:%M:%S')"
cat "$SORTIE/k6.txt"

# Après le test complet, on suit le retour au nombre minimal de pods : le HPA attend 5 minutes avant de réduire.
if [[ "$MODE" == "complet" ]]; then
  echo ""
  echo "--- Retour au minimum : attente de la réduction par le HPA (7 minutes au plus)"
  for _ in $(seq 1 42); do
    [[ "$(k get deploy annonces -o jsonpath='{.status.replicas}')" == "2" && "$(k get deploy notifications -o jsonpath='{.status.replicas}')" == "2" ]] && break
    sleep 10
  done
fi
kill "$RELEVE" 2>/dev/null || true

echo ""
echo "--- Mise à l'échelle relevée pendant le test (une ligne toutes les 10 secondes)"
column -s ';' -t "$SORTIE/mise-a-l-echelle.csv"

if [[ "$MODE" == "complet" ]]; then
  # Une preuve par couple de paliers : un test à une autre charge n'efface pas le précédent.
  PREUVE="$RACINE/tests/resultats/charge-$CHARGE_NOMINALE-$CHARGE_POINTE.txt"
  {
    echo "=== Test de charge du prototype — du $DEBUT au $FIN"
    echo "Outil : k6 2.4.0, en conteneur. Scénario : tests/charge/scenario.js. Charge nominale $CHARGE_NOMINALE, pointe $CHARGE_POINTE utilisateurs simultanés."
    echo "Cible : cluster local k3d, $(kubectl version -o json | jq -r '.serverVersion.gitVersion'), à travers l'Ingress en HTTPS."
    echo "Images : $(k get deploy annonces notifications -o jsonpath='{range .items[*]}{.spec.template.spec.containers[0].image}{"  "}{end}')"
    echo "Code de sortie de k6 : $CODE (0 = tous les seuils sont tenus ; 99 = au moins un seuil n'est pas tenu)"
    echo ""
    echo "--- Avertissements de k6 pendant le test, regroupés par nature (nombre, puis message)"
    # Chaque requête sans réponse donne une ligne d'avertissement : on les compte au lieu de les recopier.
    sed -n '1,/█ THRESHOLDS/p' "$SORTIE/k6.txt" | grep 'level=warning' \
      | sed -E 's/time="[^"]*" //; s#https://[a-z.]*/[a-zA-Z/-]*##; s/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:[0-9]+/ADRESSE/g; s/read tcp [^ ]* ?//; s/valid for [0-9a-f]{32}/valid for <nom par défaut de Traefik>/' \
      | cut -c1-170 | sort | uniq -c | sort -rn | head -15 || true
    echo ""
    echo "--- Résumé de k6"
    sed -n '/█ THRESHOLDS/,$p' "$SORTIE/k6.txt"
    echo ""
    echo "--- Mise à l'échelle relevée pendant le test (une ligne toutes les 10 secondes)"
    column -s ';' -t "$SORTIE/mise-a-l-echelle.csv"
    echo ""
    echo "--- Décisions du HPA (heure UTC ; les événements du cluster sont gardés une heure)"
    k get events --field-selector involvedObject.kind=HorizontalPodAutoscaler,reason=SuccessfulRescale --sort-by=.lastTimestamp \
      -o custom-columns='HEURE:.lastTimestamp,OBJET:.involvedObject.name,MESSAGE:.message' | awk -v debut="$DEBUT_UTC" 'NR == 1 || $1 >= debut'
    echo ""
    echo "--- Redémarrages de conteneurs dans l'espace de noms"
    echo "Pendant le test : $(( $(redemarrages) - REDEMARRAGES_AVANT )) (les pods retirés par le HPA ne sont plus comptés). Compteurs cumulés de chaque pod, à la fin :"
    k get pods -o custom-columns='POD:.metadata.name,REDEMARRAGES:.status.containerStatuses[*].restartCount,ETAT:.status.phase'
  } > "$PREUVE"
  echo ""
  echo "Preuve écrite dans ${PREUVE#"$RACINE"/}"
fi
exit "$CODE"
