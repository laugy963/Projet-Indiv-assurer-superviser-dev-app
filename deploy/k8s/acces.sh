# À charger pour appeler, depuis le poste, le prototype déployé sur le cluster local :
#   source deploy/k8s/acces.sh
# Sert à la vérification après déploiement, aux tests d'acceptation et au test de charge.
# Rien n'est écrit dans le dépôt : le certificat va dans le dossier temporaire du poste,
# et les mots de passe des comptes de test restent dans l'environnement du terminal.
ACCES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
# shellcheck source=../k3d/env.sh
. "$ACCES_DIR/../k3d/env.sh"

# Noms en « .localhost » : le poste les résout seul vers 127.0.0.1, où k3d publie le port 443 de Traefik.
export URL_API="https://api.epouvante.localhost"
export URL_ANNONCES="$URL_API"
export URL_NOTIFICATIONS="$URL_API"
export URL_JETONS="https://auth.epouvante.localhost/realms/epouvante/protocol/openid-connect/token"

# Certificat de l'autorité de certification locale : il permet de vérifier les certificats émis par cert-manager.
# C'est une donnée publique (la clé privée, elle, ne quitte pas le cluster).
export AC_LOCALE="${TMPDIR:-/tmp}/epouvante-ac-locale.crt"
kubectl -n cert-manager get secret ac-locale -o jsonpath='{.data.tls\.crt}' | base64 -d > "$AC_LOCALE"
export NODE_EXTRA_CA_CERTS="$AC_LOCALE"      # lu par Node.js : tests d'acceptation

# Mots de passe des comptes de test, lus dans le Secret du cluster.
for cle in COMPTE_MEMBRE_A_MOT_DE_PASSE COMPTE_MEMBRE_B_MOT_DE_PASSE COMPTE_MEMBRE_C_MOT_DE_PASSE \
  COMPTE_MODERATEUR_MOT_DE_PASSE COMPTE_CHARGE_MOT_DE_PASSE; do
  export "$cle=$(kubectl -n epouvante get secret comptes-de-test -o jsonpath="{.data.$cle}" | base64 -d)"
done
unset cle

# Test CA-15 : arrêter puis relancer le service notifications. Sur le cluster, c'est mettre son Deployment
# à zéro pod, puis le remettre à deux : le HPA reprend ensuite la main.
export CMD_ARRET_NOTIFICATIONS="kubectl -n epouvante scale deployment/notifications --replicas=0 && kubectl -n epouvante wait --for=delete pod -l app=notifications --timeout=90s"
export CMD_RELANCE_NOTIFICATIONS="kubectl -n epouvante scale deployment/notifications --replicas=2 && kubectl -n epouvante rollout status deployment/notifications --timeout=180s"
