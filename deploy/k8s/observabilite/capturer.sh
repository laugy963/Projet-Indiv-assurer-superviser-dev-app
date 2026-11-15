#!/usr/bin/env bash
# Capture le tableau de bord Grafana du prototype, sur une période donnée, dans des images PNG.
#
#   deploy/k8s/observabilite/capturer.sh <début> <fin> <dossier de sortie> <préfixe>
#   exemple : deploy/k8s/observabilite/capturer.sh 2026-11-15T16:55 2026-11-15T17:20 docs/captures charge-50-200
#
# Début et fin en heure locale. Prérequis : le cluster démarré, la supervision installée, Google Chrome et Node.js.
# Prometheus ne garde que 24 heures de mesures : capturer un test le jour même.
#
# Le script ouvre Grafana le temps de la capture, puis le referme s'il l'était : sur le poste, Grafana est lancé
# à la demande. Rien n'est affiché à l'écran : Chrome tourne sans fenêtre, avec un profil provisoire, et il est
# piloté par capturer.mjs. Le mot de passe de Grafana est lu dans le Secret du cluster ; il n'est écrit nulle part.
set -euo pipefail

ICI="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../../k3d/env.sh
source "$ICI/../../k3d/env.sh"
[[ $# -eq 4 ]] || { sed -n '2,6p' "$0"; exit 2; }

NS=monitoring
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
# Ports locaux : les mêmes valeurs sont fixées dans capturer.mjs.
PORT_GRAFANA=13000
PORT_CHROME=9333
TMP="$(mktemp -d)"
REPLICAS_AVANT="$(kubectl -n "$NS" get deploy supervision-grafana -o jsonpath='{.spec.replicas}')"

nettoyer() {
  [[ -n "${PID_CHROME:-}" ]] && kill "$PID_CHROME" 2>/dev/null || true
  [[ -n "${PID_TRANSFERT:-}" ]] && kill "$PID_TRANSFERT" 2>/dev/null || true
  # Grafana revient à son état de départ.
  kubectl -n "$NS" scale deploy supervision-grafana --replicas="$REPLICAS_AVANT" >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap nettoyer EXIT

# 1. Grafana : un pod, prêt, joignable sur le poste par un transfert de port.
kubectl -n "$NS" scale deploy supervision-grafana --replicas=1 >/dev/null
kubectl -n "$NS" rollout status deploy supervision-grafana --timeout=300s >/dev/null
kubectl -n "$NS" port-forward svc/supervision-grafana "$PORT_GRAFANA:80" >/dev/null 2>&1 &
PID_TRANSFERT=$!
for _ in $(seq 1 30); do
  curl -s -o /dev/null "http://127.0.0.1:$PORT_GRAFANA/api/health" && break
  sleep 1
done

# 2. Chrome sans fenêtre, profil provisoire, port de débogage ouvert sur l'adresse locale seulement.
"$CHROME" --headless=new --remote-debugging-port="$PORT_CHROME" --remote-debugging-address=127.0.0.1 \
  --user-data-dir="$TMP/profil" --no-first-run --no-default-browser-check --hide-scrollbars about:blank \
  >/dev/null 2>&1 &
PID_CHROME=$!
for _ in $(seq 1 30); do
  curl -s -o /dev/null "http://127.0.0.1:$PORT_CHROME/json/version" && break
  sleep 1
done

# 3. Les captures. capturer.mjs se connecte aux deux mêmes adresses locales, fixées dans son code.
GRAFANA_MOT_DE_PASSE="$(kubectl -n "$NS" get secret grafana-admin -o jsonpath='{.data.admin-password}' | base64 -d)" \
  node "$ICI/capturer.mjs" "$@"
