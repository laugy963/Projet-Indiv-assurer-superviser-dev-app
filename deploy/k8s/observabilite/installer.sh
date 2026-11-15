#!/usr/bin/env bash
# Installe la composante d'observabilité du prototype (fiche 0011) : Prometheus et Grafana,
# par le chart Helm kube-prometheus-stack, celui du cours.
#
#   deploy/k8s/observabilite/installer.sh        à lancer après deploy/k8s/deployer.sh
#
# Le script peut être relancé. Il :
#   1. crée le mot de passe d'administration de Grafana, au hasard, dans un Secret ;
#   2. range le tableau de bord du prototype dans un ConfigMap ;
#   3. installe le chart avec les valeurs allégées de valeurs.yaml ;
#   4. dit à Prometheus quoi collecter (servicemonitors.yaml).
set -euo pipefail

ICI="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../../k3d/env.sh
source "$ICI/../../k3d/env.sh"

NS=monitoring
INSTALLATION=supervision
VERSION_CHART=93.3.0                  # relevée le 15 novembre 2026

DEBUT=$(date +%s)
kubectl create namespace "$NS" --dry-run=client -o yaml | kubectl apply -f - >/dev/null
if ! kubectl -n "$NS" get secret grafana-admin >/dev/null 2>&1; then
  kubectl -n "$NS" create secret generic grafana-admin \
    --from-literal=admin-user=admin --from-literal=admin-password="$(openssl rand -hex 16)" >/dev/null
  echo "Secret « grafana-admin » créé"
fi

# Le tableau de bord est un fichier JSON versionné : il devient un ConfigMap, monté dans le pod de Grafana.
# Il doit exister avant l'installation : le pod ne démarre pas sans lui.
kubectl -n "$NS" create configmap tableau-de-bord-epouvante --from-file="$ICI/tableau-de-bord.json" \
  --dry-run=client -o yaml | kubectl apply -f - >/dev/null

helm upgrade --install "$INSTALLATION" oci://ghcr.io/prometheus-community/charts/kube-prometheus-stack \
  --version "$VERSION_CHART" --namespace "$NS" --values "$ICI/valeurs.yaml" --wait --timeout 10m >/dev/null
echo "kube-prometheus-stack $VERSION_CHART installé en $(($(date +%s) - DEBUT)) s"

kubectl apply -f "$ICI/servicemonitors.yaml" >/dev/null
echo "Collecte des deux services et du broker déclarée ; tableau de bord chargé"

echo ""
kubectl -n "$NS" get pods
echo ""
echo "Grafana :     kubectl -n $NS scale deploy $INSTALLATION-grafana --replicas=1     (lancé à la demande sur le poste)"
echo "              kubectl -n $NS port-forward svc/$INSTALLATION-grafana 3000:80      puis http://localhost:3000"
echo "              compte admin ; mot de passe : kubectl -n $NS get secret grafana-admin -o jsonpath='{.data.admin-password}' | base64 -d"
echo "Prometheus :  kubectl -n $NS port-forward svc/$INSTALLATION-prometheus 9090:9090"
