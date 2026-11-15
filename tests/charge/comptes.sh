#!/usr/bin/env bash
# Crée dans Keycloak les comptes du test de charge : un compte par utilisateur virtuel, plus les deux de l'observateur.
#
#   tests/charge/comptes.sh [nombre]        210 par défaut : la pointe est de 200 utilisateurs
#
# Lancé par tests/charge/lancer.sh. Le script peut être relancé : un compte déjà présent est laissé tel quel.
# Les comptes partagent un mot de passe tiré au hasard par deploy/k8s/deployer.sh et gardé dans un Secret du cluster.
set -euo pipefail

RACINE="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=../../deploy/k3d/env.sh
source "$RACINE/deploy/k3d/env.sh"

NS=epouvante
NOMBRE="${1:-210}"
k() { kubectl -n "$NS" "$@"; }
kc() { k exec deploy/keycloak -- /opt/keycloak/bin/kcadm.sh "$@" --config /tmp/kcadm.config; }

# Liste des comptes, écrite hors du dépôt puis détruite : elle porte le mot de passe.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
umask 077
k get secret comptes-de-test -o jsonpath='{.data.COMPTE_CHARGE_MOT_DE_PASSE}' | base64 -d > "$TMP/mot-de-passe"

# Profil complet (courriel, prénom, nom) : sans lui, Keycloak refuse de délivrer un jeton (règle du bac à sable).
jq -n --rawfile mdp "$TMP/mot-de-passe" --argjson nombre "$NOMBRE" '
  def compte(nom): {
    username: nom, enabled: true, emailVerified: true,
    email: (nom + "@epouvante.test"), firstName: "Compte", lastName: "De charge",
    realmRoles: ["membre"],
    credentials: [{type: "password", value: $mdp, temporary: false}]
  };
  {
    ifResourceExists: "SKIP",
    users: ([range(1; $nombre + 1) | compte("charge-" + (("00" + tostring) | .[-3:]))]
            + [compte("charge-observateur-a"), compte("charge-observateur-b")])
  }' > "$TMP/comptes.json"

DEBUT=$(date +%s)
# L'outil d'administration est lancé dans le pod : le mot de passe d'administration ne sort pas du cluster.
k exec deploy/keycloak -- sh -c '/opt/keycloak/bin/kcadm.sh config credentials --config /tmp/kcadm.config \
  --server http://localhost:8080 --realm master --user "$KC_BOOTSTRAP_ADMIN_USERNAME" --password "$KC_BOOTSTRAP_ADMIN_PASSWORD"' >/dev/null 2>&1
k exec -i deploy/keycloak -- sh -c 'umask 077; cat > /tmp/comptes-de-charge.json' < "$TMP/comptes.json"
# Import en une seule commande : un appel par compte lancerait une machine virtuelle Java à chaque fois.
kc create partialImport -r epouvante -s ifResourceExists=SKIP -o -f /tmp/comptes-de-charge.json > "$TMP/resultat.json" 2>"$TMP/erreur.txt" \
  || { echo "ÉCHEC de l'import des comptes :"; cat "$TMP/erreur.txt"; exit 1; }
k exec deploy/keycloak -- rm -f /tmp/comptes-de-charge.json
echo "Comptes de charge : $(jq -r '"\(.added) créés, \(.skipped) déjà présents, \(.errors // 0) en erreur"' "$TMP/resultat.json") ($(($(date +%s) - DEBUT)) s)"
