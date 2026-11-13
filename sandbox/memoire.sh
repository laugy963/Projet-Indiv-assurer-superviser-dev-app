#!/usr/bin/env bash
# Mesure de la mémoire quand les composants des trois expérimentations tournent ensemble.
# Répond à l'hypothèse : « les composants tiennent ensemble sur un poste de 8 Go ».
#
# Lancer :  ./memoire.sh     (après avoir joué les trois expérimentations)
# Le résultat brut est écrit dans resultats-memoire.txt.
set -euo pipefail

ICI="$(cd "$(dirname "$0")" && pwd)"
source "$ICI/../deploy/k3d/env.sh"
RAPPORT="$ICI/resultats-memoire.txt"
: > "$RAPPORT"
note() { echo "$*" | tee -a "$RAPPORT"; }

note "=== Mémoire consommée, tous composants en marche — $(date '+%Y-%m-%d %H:%M:%S')"
note "Poste : $(sysctl -n machdep.cpu.brand_string), $(sysctl -n hw.memsize | awk '{printf "%.0f Go", $1 / 1073741824}') de mémoire physique"
note "Moteur de conteneurs : $(docker info --format '{{.OperatingSystem}}, {{.NCPU}} processeurs, {{.MemTotal}}' | awk -F', ' '{printf "%s, %s, %.2f Gio alloués", $1, $2, $3 / 1073741824}')"

note ""
note "--- Mémoire de la machine virtuelle de Docker (en Mio)"
docker exec k3d-epouvante-server-0 awk '/^(MemTotal|MemAvailable):/ {printf "%s %d\n", $1, $2 / 1024}' /proc/meminfo | tee -a "$RAPPORT"

note ""
note "--- Nœud du cluster (kubectl top node)"
kubectl top node | tee -a "$RAPPORT"

note ""
note "--- Pods, du plus gourmand au moins gourmand (kubectl top pod)"
kubectl top pod -A --sort-by=memory | tee -a "$RAPPORT"
note ""
note "Somme de la mémoire des pods : $(kubectl top pod -A --no-headers | awk '{gsub("Mi", "", $4); s += $4} END {print s " Mio"}')"

note ""
note "--- Conteneurs Docker du poste (docker stats) : le cluster k3d et les conteneurs déjà présents"
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}' | tee -a "$RAPPORT"
