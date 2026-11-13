# À charger avant toute commande kubectl ou helm du projet :  source deploy/k3d/env.sh
# Le fichier d'accès au cluster reste dans le projet et n'est pas versionné (.gitignore : kubeconfig*).
DEPLOY_K3D_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
export KUBECONFIG="$DEPLOY_K3D_DIR/kubeconfig.yaml"
if [ ! -s "$KUBECONFIG" ]; then
  k3d kubeconfig write epouvante --output "$KUBECONFIG" >/dev/null
  chmod 600 "$KUBECONFIG"
fi
