#!/usr/bin/env bash
# Exporte de Prometheus, sur la période d'un test de charge, les séries que montre le tableau de bord Grafana.
# Prometheus ne garde que 24 heures de mesures : ce fichier est la trace durable de ce que la supervision a vu.
#
#   tests/charge/exporter-supervision.sh <début UTC> <fin UTC> <fichier de sortie>
#   exemple : tests/charge/exporter-supervision.sh 2026-11-15T15:56:00Z 2026-11-15T16:17:00Z tests/resultats/charge-50-200-supervision.csv
#
# Une ligne toutes les 30 secondes. Les requêtes sont celles des panneaux de deploy/k8s/observabilite/tableau-de-bord.json.
set -euo pipefail

RACINE="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=../../deploy/k3d/env.sh
source "$RACINE/deploy/k3d/env.sh"
DEBUT="${1:?début, en UTC : 2026-11-15T15:56:00Z}"
FIN="${2:?fin, en UTC}"
SORTIE="${3:?fichier de sortie}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
NS='namespace="epouvante"'

# serie <nom de colonne> <requête PromQL à une seule série> : écrit « horodatage valeur » dans un fichier.
serie() {
  kubectl get --raw "/api/v1/namespaces/monitoring/services/supervision-prometheus:9090/proxy/api/v1/query_range?query=$(jq -rn --arg q "$2" '$q|@uri')&start=$DEBUT&end=$FIN&step=30s" \
    | jq -r '.data.result[0].values[]? | "\(.[0]) \(.[1])"' > "$TMP/$1"
}
serie p95_publication_s "histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{$NS,method=\"POST\",route=\"/api/annonces\"}[1m])))"
serie requetes_reussies "1 - (sum(rate(http_request_duration_seconds_count{$NS,code=~\"5..\"}[1m])) or vector(0)) / sum(rate(http_request_duration_seconds_count{$NS}[1m]))"
serie requetes_par_s "sum(rate(http_request_duration_seconds_count{$NS}[1m]))"
serie annonces_pods_prets "kube_deployment_status_replicas_ready{$NS,deployment=\"annonces\"}"
serie annonces_pods_demandes "kube_horizontalpodautoscaler_status_desired_replicas{$NS,horizontalpodautoscaler=\"annonces\"}"
serie notifications_pods_prets "kube_deployment_status_replicas_ready{$NS,deployment=\"notifications\"}"
serie notifications_pods_demandes "kube_horizontalpodautoscaler_status_desired_replicas{$NS,horizontalpodautoscaler=\"notifications\"}"
serie processeur_max_par_pod_coeurs "max(rate(process_cpu_seconds_total{$NS,job=~\"annonces|notifications\"}[1m]))"
serie file_en_attente 'max(rabbitmq_detailed_queue_messages_ready{queue="notifications.annonce-publiee"})'

COLONNES="p95_publication_s requetes_reussies requetes_par_s annonces_pods_prets annonces_pods_demandes notifications_pods_prets notifications_pods_demandes processeur_max_par_pod_coeurs file_en_attente"
# Assemblage : une ligne par horodatage ; une case vide quand Prometheus n'a pas de mesure à cet instant,
# ou quand il n'y a aucune requête à mesurer.
{
  echo "heure_utc;${COLONNES// /;}"
  cat "$TMP"/* | awk '{print $1}' | sort -un | while read -r instant; do
    ligne="$(date -u -r "$instant" '+%H:%M:%S')"
    for colonne in $COLONNES; do
      valeur="$(awk -v t="$instant" '$1 == t && $2 != "NaN" {printf "%.4g", $2}' "$TMP/$colonne")"
      ligne="$ligne;$valeur"
    done
    echo "$ligne"
  done
} > "$SORTIE"
echo "$(($(wc -l < "$SORTIE") - 1)) lignes écrites dans $SORTIE"
