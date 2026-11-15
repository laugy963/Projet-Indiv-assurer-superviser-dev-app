#!/usr/bin/env bash
# Déploie le prototype sur le cluster local k3d (variante « local »).
#
#   deploy/k8s/deployer.sh
#       images construites sur le poste depuis le code du dépôt, puis importées dans le cluster
#   IMAGE_ANNONCES=ghcr.io/…@sha256:… IMAGE_NOTIFICATIONS=ghcr.io/…@sha256:… deploy/k8s/deployer.sh
#       images du pipeline, désignées par leur empreinte : « construire une fois, déployer partout »
#
# Le script peut être relancé : chaque opération est idempotente. Ordre des opérations :
#   1. prérequis du cluster : cert-manager, redirection vers HTTPS, émetteur de certificats ;
#   2. espace de noms, Secrets (mots de passe tirés au hasard, jamais dans le dépôt), royaume Keycloak ;
#   3. images ;
#   4. phase 1 : base de données, broker, serveur d'identité, règles réseau ;
#   5. comptes du broker et comptes de test de Keycloak ;
#   6. phase 2 : les deux services, leur mise à l'échelle, l'Ingress.
set -euo pipefail

RACINE="$(cd "$(dirname "$0")/../.." && pwd)"
ICI="$RACINE/deploy/k8s"
# shellcheck source=../k3d/env.sh
source "$RACINE/deploy/k3d/env.sh"

NS=epouvante
VARIANTE=local
GRAPPE=epouvante                      # nom du cluster k3d
VERSION_CERT_MANAGER=v1.21.3          # celle du bac à sable (expérimentation 2)

k() { kubectl -n "$NS" "$@"; }
etape() { echo ""; echo "--- $*"; }
alea() { openssl rand -hex 16; }
DEBUT_TOTAL=$(date +%s)

# Copie de travail des manifestes, hors du dépôt : le bloc « images » y est ajouté, pas dans les fichiers versionnés.
TRAVAIL="$(mktemp -d)"
trap 'rm -rf "$TRAVAIL"' EXIT
# Une commande en échec arrête le script (set -e) : on dit laquelle, plutôt que de s'arrêter sans un mot.
trap 'echo "ARRÊT : la commande de la ligne $LINENO a échoué. Le script peut être relancé."' ERR

kubectl get nodes >/dev/null || { echo "ARRÊT : cluster injoignable. Voir deploy/k3d/README.md"; exit 1; }

etape "1. Prérequis du cluster"
if [[ "$(helm -n cert-manager list -q --filter '^cert-manager$' 2>/dev/null)" != "cert-manager" ]]; then
  helm upgrade --install cert-manager oci://quay.io/jetstack/charts/cert-manager \
    --version "$VERSION_CERT_MANAGER" --namespace cert-manager --create-namespace \
    --set crds.enabled=true --wait --timeout 5m >/dev/null
  echo "cert-manager $VERSION_CERT_MANAGER installé"
else
  echo "cert-manager déjà installé : $(helm -n cert-manager list --filter '^cert-manager$' -o json | jq -r '.[0].chart')"
fi
kubectl apply -f "$ICI/cluster/" >/dev/null
kubectl wait --for=condition=Ready clusterissuer/ac-locale --timeout=120s >/dev/null
echo "Redirection HTTP vers HTTPS et émetteur de certificats « ac-locale » en place"

etape "2. Espace de noms, Secrets, royaume"
kubectl apply -f "$ICI/base/dependances/espace-de-noms.yaml" >/dev/null
# Un Secret n'est créé que s'il n'existe pas : relancer le script ne change aucun mot de passe.
secret() {  # secret <nom> <clé=valeur>...
  local nom="$1"; shift
  if k get secret "$nom" >/dev/null 2>&1; then return; fi
  local arguments=()
  for paire in "$@"; do arguments+=("--from-literal=$paire"); done
  k create secret generic "$nom" "${arguments[@]}" >/dev/null
  echo "Secret « $nom » créé"
}
secret postgresql-admin "mot-de-passe=$(alea)"
secret rabbitmq-admin "utilisateur=admin" "mot-de-passe=$(alea)"
# Un Secret par service : chacun ne reçoit que ses propres mots de passe (moindre privilège).
secret annonces-acces "BDD_MOT_DE_PASSE=$(alea)" "AMQP_MOT_DE_PASSE=$(alea)"
secret notifications-acces "BDD_MOT_DE_PASSE=$(alea)" "AMQP_MOT_DE_PASSE=$(alea)"
secret keycloak-acces "KC_DB_PASSWORD=$(alea)" \
  "KC_BOOTSTRAP_ADMIN_USERNAME=admin-provisoire" "KC_BOOTSTRAP_ADMIN_PASSWORD=$(alea)"
# Comptes de test : ils servent à la vérification après déploiement et au test de charge.
secret comptes-de-test "COMPTE_MEMBRE_A_MOT_DE_PASSE=$(alea)" "COMPTE_MEMBRE_B_MOT_DE_PASSE=$(alea)" \
  "COMPTE_MEMBRE_C_MOT_DE_PASSE=$(alea)" "COMPTE_MODERATEUR_MOT_DE_PASSE=$(alea)" "COMPTE_CHARGE_MOT_DE_PASSE=$(alea)"
# Le royaume : le fichier versionné, le même que dans l'environnement de test. Il ne contient aucun compte.
k create configmap royaume --from-file="$RACINE/deploy/keycloak/epouvante-realm.json" --dry-run=client -o yaml \
  | k apply -f - >/dev/null
echo "Espace de noms « $NS », Secrets et royaume en place"

etape "3. Images"
cp -R "$ICI/base" "$ICI/overlays" "$TRAVAIL/"
{ echo ""; echo "images:"; } >> "$TRAVAIL/overlays/$VARIANTE/kustomization.yaml"
fixer_image() {  # fixer_image <service> <référence>  — écrit le remplacement dans la copie de travail
  local service="$1" reference="$2" nom marque
  if [[ "$reference" == *@* ]]; then
    nom="${reference%@*}"; marque="digest: ${reference#*@}"       # désignée par son empreinte
  else
    nom="${reference%:*}"; marque="newTag: \"${reference##*:}\""   # désignée par une étiquette
  fi
  printf '  - name: epouvante/%s\n    newName: %s\n    %s\n' "$service" "$nom" "$marque" \
    >> "$TRAVAIL/overlays/$VARIANTE/kustomization.yaml"
  echo "$service : $reference"
}
if [[ -n "${IMAGE_ANNONCES:-}" && -n "${IMAGE_NOTIFICATIONS:-}" ]]; then
  # Images du registre : le cluster les tire lui-même. Rien n'est reconstruit.
  fixer_image annonces "$IMAGE_ANNONCES"
  fixer_image notifications "$IMAGE_NOTIFICATIONS"
else
  for service in annonces notifications; do
    # « --provenance=false » : par défaut, Docker joint à l'image une attestation qui porte l'heure de la
    # construction. L'identifiant changeait alors à chaque construction, même sans aucun changement de code,
    # et chaque déploiement remplaçait tous les pods pour rien (constaté le 15 novembre 2026).
    docker build -q --provenance=false -f "$RACINE/services/Dockerfile" --build-arg "SERVICE=$service" \
      -t "epouvante/$service:local" "$RACINE" >/dev/null
    # Étiquette = début de l'identifiant de l'image : elle ne change que si le contenu change.
    # Un nouveau contenu donne donc un nouveau nom, et Kubernetes remplace les pods un par un.
    marque="$(docker image inspect --format '{{.Id}}' "epouvante/$service:local" | cut -d: -f2 | cut -c1-12)"
    docker tag "epouvante/$service:local" "epouvante/$service:$marque"
    if ! docker exec "k3d-$GRAPPE-server-0" crictl images 2>/dev/null | grep -q "epouvante/$service .*$marque"; then
      k3d image import "epouvante/$service:$marque" -c "$GRAPPE" >/dev/null 2>&1
    fi
    fixer_image "$service" "epouvante/$service:$marque"
  done
fi

etape "4. Phase 1 : base de données, broker, serveur d'identité, règles réseau"
DEBUT=$(date +%s)
kubectl apply -k "$TRAVAIL/overlays/$VARIANTE" -l epouvante/phase=dependances >/dev/null
k rollout status statefulset/postgresql --timeout=300s >/dev/null
k rollout status statefulset/rabbitmq --timeout=300s >/dev/null
k rollout status deployment/keycloak --timeout=480s >/dev/null
echo "PostgreSQL, RabbitMQ et Keycloak prêts en $(($(date +%s) - DEBUT)) s"

etape "5. Comptes du broker et comptes de test"
lire() { k get secret "$1" -o jsonpath="{.data.$2}" | base64 -d; }   # lire <secret> <clé>
# Broker : la topologie versionnée, celle que les tests d'intégration éprouvent, puis un compte par service,
# limité à ce dont il a besoin. Droits = trois expressions : configurer, écrire, lire. Mêmes commandes
# que dans l'environnement de test (tests/environnement/demarrer.sh).
rmq() { k exec rabbitmq-0 -- rabbitmqctl -q "$@"; }
compte_broker() {  # compte_broker <nom> <mot de passe> <configurer> <écrire> <lire>
  rmq add_user "$1" "$2" 2>/dev/null || rmq change_password "$1" "$2"
  rmq set_permissions -p / "$1" "$3" "$4" "$5"
}
k exec -i rabbitmq-0 -- sh -c 'cat > /tmp/topologie.json' < "$RACINE/tests/environnement/rabbitmq/topologie.json"
rmq import_definitions /tmp/topologie.json
compte_broker annonces "$(lire annonces-acces AMQP_MOT_DE_PASSE)" \
  '^annonces$' '^annonces$' '^$'
compte_broker notifications "$(lire notifications-acces AMQP_MOT_DE_PASSE)" \
  '^(annonces|notifications\.annonce-publiee)$' '^notifications\.annonce-publiee$' '^(annonces|notifications\.annonce-publiee)$'
echo "Broker : topologie importée, comptes « annonces » et « notifications » en place"

# Keycloak : comptes de test au profil complet, sinon Keycloak refuse le jeton (règle du bac à sable).
# L'outil d'administration est lancé dans le pod : le mot de passe d'administration ne sort pas du cluster.
kc() { k exec deploy/keycloak -- /opt/keycloak/bin/kcadm.sh "$@" --config /tmp/kcadm.config; }
k exec deploy/keycloak -- sh -c '/opt/keycloak/bin/kcadm.sh config credentials --config /tmp/kcadm.config \
  --server http://localhost:8080 --realm master --user "$KC_BOOTSTRAP_ADMIN_USERNAME" --password "$KC_BOOTSTRAP_ADMIN_PASSWORD"' >/dev/null 2>&1
compte_test() {  # compte_test <nom> <rôle> <mot de passe>
  kc create users -r epouvante -s "username=$1" -s enabled=true -s emailVerified=true \
    -s "email=$1@epouvante.test" -s firstName=Compte -s "lastName=De test" >/dev/null 2>&1 || true
  kc set-password -r epouvante --username "$1" --new-password "$3" >/dev/null 2>&1
  kc add-roles -r epouvante --uusername "$1" --rolename "$2" >/dev/null 2>&1
}
if kc get users -r epouvante -q username=moderateur-test --fields username 2>/dev/null | grep -q moderateur-test; then
  echo "Keycloak : comptes de test déjà présents"
else
  compte_test membre-a membre "$(lire comptes-de-test COMPTE_MEMBRE_A_MOT_DE_PASSE)"
  compte_test membre-b membre "$(lire comptes-de-test COMPTE_MEMBRE_B_MOT_DE_PASSE)"
  compte_test membre-c membre "$(lire comptes-de-test COMPTE_MEMBRE_C_MOT_DE_PASSE)"
  compte_test moderateur-test moderateur "$(lire comptes-de-test COMPTE_MODERATEUR_MOT_DE_PASSE)"
  echo "Keycloak : comptes membre-a, membre-b, membre-c et moderateur-test créés"
fi

etape "6. Phase 2 : les deux services, leur mise à l'échelle, l'Ingress"
DEBUT=$(date +%s)
kubectl apply -k "$TRAVAIL/overlays/$VARIANTE" >/dev/null
k rollout status deployment/annonces --timeout=300s >/dev/null
k rollout status deployment/notifications --timeout=300s >/dev/null
k wait --for=condition=Ready certificate/api-tls certificate/identite-tls --timeout=120s >/dev/null
echo "Services prêts et certificats émis en $(($(date +%s) - DEBUT)) s"

etape "État"
k get pods -o wide
k get hpa
k get ingress
echo ""
echo "Déploiement terminé en $(($(date +%s) - DEBUT_TOTAL)) s. Vérifier : deploy/k8s/verifier.sh"
