#!/usr/bin/env bash
# Expérimentation 3 — Keycloak : jeton, rôles, vérification par un service.
#
# Prérequis : l'expérimentation 2 a été jouée (cert-manager et l'autorité de certification locale existent).
# Rejouer :  ./run.sh     (le cluster k3d « epouvante » doit exister, voir deploy/k3d/README.md)
# Le script repart de zéro à chaque fois : il supprime puis recrée l'espace de noms.
# Les résultats bruts sont écrits dans resultats/execution.txt.
set -euo pipefail

ICI="$(cd "$(dirname "$0")" && pwd)"
source "$ICI/../../deploy/k3d/env.sh"

NS=bac-a-sable-identite
IMAGE=bac-a-sable/verificateur:1
AUTH=auth.epouvante.test
VERIF=verificateur.epouvante.test
ROYAUME=epouvante
EMETTEUR="https://$AUTH/realms/$ROYAUME"
URL_JETON="$EMETTEUR/protocol/openid-connect/token"
RAPPORT="$ICI/resultats/execution.txt"
mkdir -p "$ICI/resultats"
: > "$RAPPORT"
# Dossier temporaire hors du dépôt : certificat de l'autorité locale, mots de passe des comptes de test.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

note() { echo "$*" | tee -a "$RAPPORT"; }
k() { kubectl -n "$NS" "$@"; }
verdict() {  # verdict <libellé> <obtenu> <attendu>
  if [ "$2" = "$3" ]; then note "  RÉUSSI  $1 : $2"; else note "  ÉCHEC   $1 : $2 (attendu : $3)"; ECHECS=$((ECHECS + 1)); fi
}
ECHECS=0

# Appel HTTPS vérifié avec le certificat de l'autorité locale. Les noms d'hôte sont associés à l'adresse locale.
appel() {
  curl -sS --connect-timeout 5 --max-time 20 --cacert "$TMP/ac-locale.crt" \
    --resolve "$AUTH:443:127.0.0.1" --resolve "$VERIF:443:127.0.0.1" "$@"
}
# jeton <compte> : demande un jeton d'accès. Le mot de passe est lu dans un fichier temporaire.
jeton() {
  appel -d grant_type=password -d client_id=tests -d "username=$1" --data-urlencode "password@$TMP/mdp-$1" "$URL_JETON" \
    | jq -r '.access_token // empty'
}
# code_jeton <compte> : code HTTP de la demande de jeton.
code_jeton() {
  appel -o /dev/null -w '%{http_code}' -d grant_type=password -d client_id=tests -d "username=$1" \
    --data-urlencode "password@$TMP/mdp-$1" "$URL_JETON" 2>/dev/null || true
}
# code <chemin> [jeton] : code HTTP renvoyé par le vérificateur.
code() {
  if [ -n "${2:-}" ]; then
    appel -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $2" "https://$VERIF$1"
  else
    appel -o /dev/null -w '%{http_code}' "https://$VERIF$1"
  fi
}
# contenu <jeton> <filtre jq> : lit la partie centrale du jeton. Un JWT est lisible par tous ; c'est sa signature qui le protège.
contenu() {
  python3 -c 'import sys, base64; p = sys.argv[1].split(".")[1]; print(base64.urlsafe_b64decode(p + "=" * (-len(p) % 4)).decode())' "$1" | jq -r "$2"
}
# Jeton dont le premier caractère de la signature est modifié.
# Constat du 13 novembre 2026 : modifier le DERNIER caractère ne suffit pas. Ses derniers bits ne sont pas
# significatifs dans l'encodage base64 : selon le jeton, la signature décodée reste la même et le jeton est accepté.
signature_falsifiee() {
  python3 -c '
import sys
entete, corps, signature = sys.argv[1].split(".")
premier = "A" if signature[0] != "A" else "B"
print(".".join([entete, corps, premier + signature[1:]]))' "$1"
}
# Jeton dont le contenu est modifié pour s'attribuer le rôle de modérateur, sans pouvoir refaire la signature.
roles_falsifies() {
  python3 -c '
import sys, base64, json
entete, corps, signature = sys.argv[1].split(".")
donnees = json.loads(base64.urlsafe_b64decode(corps + "=" * (-len(corps) % 4)))
donnees.setdefault("realm_access", {}).setdefault("roles", []).append("moderateur")
corps = base64.urlsafe_b64encode(json.dumps(donnees, separators=(",", ":")).encode()).decode().rstrip("=")
print(".".join([entete, corps, signature]))' "$1"
}
# Outil d'administration de Keycloak, lancé dans le pod.
kc() { k exec deploy/keycloak -- /opt/keycloak/bin/kcadm.sh "$@" --config /tmp/kcadm.config; }
# creer_compte <nom> <rôle> : compte de test au mot de passe aléatoire, jamais écrit dans le dépôt.
creer_compte() {
  printf '%s' "$(openssl rand -hex 16)" > "$TMP/mdp-$1"
  kc create users -r "$ROYAUME" -s "username=$1" -s enabled=true -s emailVerified=true \
    -s "email=$1@epouvante.test" -s firstName=Compte -s "lastName=De test" >/dev/null 2>&1
  kc set-password -r "$ROYAUME" --username "$1" --new-password "$(cat "$TMP/mdp-$1")" >/dev/null 2>&1
  kc add-roles -r "$ROYAUME" --uusername "$1" --rolename "$2" >/dev/null 2>&1
}

note "=== Expérimentation 3 — Keycloak : jeton, rôles, vérification par un service — $(date '+%Y-%m-%d %H:%M:%S')"
note "Cluster : $(kubectl version -o json | jq -r '.serverVersion.gitVersion')"

if ! kubectl get clusterissuer ac-locale >/dev/null 2>&1; then
  note "ARRÊT : l'autorité de certification locale est absente. Jouer d'abord sandbox/02-ingress-https/run.sh"
  exit 1
fi

note ""
note "--- Préparation"
docker build -q -t "$IMAGE" "$ICI/verificateur" >/dev/null
k3d image import "$IMAGE" -c epouvante >/dev/null 2>&1
note "Image $IMAGE construite et importée dans le cluster"
kubectl delete namespace "$NS" --ignore-not-found --wait=true >/dev/null
kubectl create namespace "$NS" >/dev/null
# Mots de passe aléatoires, créés à chaque exécution : aucun secret dans le dépôt.
k create secret generic postgresql-compte --from-literal=mot-de-passe="$(openssl rand -hex 16)" >/dev/null
k create secret generic keycloak-admin --from-literal=utilisateur=admin-provisoire \
  --from-literal=mot-de-passe="$(openssl rand -hex 16)" >/dev/null
k create configmap royaume --from-file="$ICI/royaume/epouvante-realm.json" >/dev/null

DEBUT=$(date +%s)
k apply -f "$ICI/k8s/postgresql.yaml" >/dev/null
k rollout status statefulset/postgresql --timeout=300s >/dev/null
note "PostgreSQL prêt en $(($(date +%s) - DEBUT)) s : $(k exec postgresql-0 -- postgres --version)"

DEBUT=$(date +%s)
k apply -f "$ICI/k8s/keycloak.yaml" >/dev/null
k rollout status deploy/keycloak --timeout=420s >/dev/null
note "Keycloak prêt en $(($(date +%s) - DEBUT)) s (téléchargement de l'image et création de la base compris)"
note "Utilisateur du conteneur Keycloak : $(k exec deploy/keycloak -- id)"

k apply -f "$ICI/k8s/verificateur.yaml" -f "$ICI/k8s/ingress.yaml" >/dev/null
k rollout status deploy/verificateur --timeout=120s >/dev/null
k wait --for=condition=Ready certificate/identite-tls --timeout=120s >/dev/null
kubectl -n cert-manager get secret ac-locale -o jsonpath='{.data.tls\.crt}' | base64 -d > "$TMP/ac-locale.crt"
sleep 5   # laisse à Traefik le temps de charger le certificat

# Connexion de l'outil d'administration : le mot de passe est lu dans le conteneur, il ne sort pas du cluster.
k exec deploy/keycloak -- sh -c '/opt/keycloak/bin/kcadm.sh config credentials --config /tmp/kcadm.config \
  --server http://localhost:8080 --realm master --user "$KC_BOOTSTRAP_ADMIN_USERNAME" --password "$KC_BOOTSTRAP_ADMIN_PASSWORD"' >/dev/null 2>&1
creer_compte membre-test membre
creer_compte moderateur-test moderateur
note "Comptes de test créés : membre-test (rôle membre), moderateur-test (rôle moderateur)"
# Un troisième compte, volontairement incomplet (ni courriel, ni prénom, ni nom), pour le test 7.
printf '%s' "$(openssl rand -hex 16)" > "$TMP/mdp-incomplet-test"
kc create users -r "$ROYAUME" -s username=incomplet-test -s enabled=true >/dev/null 2>&1
kc set-password -r "$ROYAUME" --username incomplet-test --new-password "$(cat "$TMP/mdp-incomplet-test")" >/dev/null 2>&1
kc add-roles -r "$ROYAUME" --uusername incomplet-test --rolename membre >/dev/null 2>&1

note ""
note "--- Test 1 : Keycloak est joignable en HTTPS et annonce la bonne adresse d'émetteur"
verdict "émetteur annoncé par Keycloak" \
  "$(appel "$EMETTEUR/.well-known/openid-configuration" | jq -r '.issuer')" "$EMETTEUR"

note ""
note "--- Test 2 : obtention d'un jeton et lecture de son contenu"
JETON_MEMBRE="$(jeton membre-test)"
JETON_MODERATEUR="$(jeton moderateur-test)"
verdict "jeton obtenu pour membre-test" "$([ -n "$JETON_MEMBRE" ] && echo oui || echo non)" "oui"
verdict "émetteur écrit dans le jeton" "$(contenu "$JETON_MEMBRE" '.iss')" "$EMETTEUR"
verdict "durée de vie du jeton, en secondes" "$(contenu "$JETON_MEMBRE" '.exp - .iat')" "120"
verdict "le jeton de membre-test porte le rôle membre" "$(contenu "$JETON_MEMBRE" '.realm_access.roles | index("membre") != null')" "true"
verdict "le jeton de membre-test ne porte pas le rôle moderateur" "$(contenu "$JETON_MEMBRE" '.realm_access.roles | index("moderateur") != null')" "false"
note "Revendications utiles du jeton de membre-test :"
contenu "$JETON_MEMBRE" '{iss, azp, typ, duree: (.exp - .iat), roles: .realm_access.roles, sub_present: (.sub != null)}' | sed 's/^/    /' | tee -a "$RAPPORT"
note "Algorithme de signature : $(python3 -c 'import sys, base64, json; p = sys.argv[1].split(".")[0]; print(json.loads(base64.urlsafe_b64decode(p + "=" * (-len(p) % 4)))["alg"])' "$JETON_MEMBRE")"

note ""
note "--- Test 3 : le service vérifie le jeton et le rôle"
verdict "route /membre sans jeton" "$(code /membre)" 401
verdict "route /membre avec le jeton d'un membre" "$(code /membre "$JETON_MEMBRE")" 200
verdict "route /membre avec une signature falsifiée" "$(code /membre "$(signature_falsifiee "$JETON_MEMBRE")")" 401
verdict "route /moderateur avec le jeton d'un membre" "$(code /moderateur "$JETON_MEMBRE")" 403
verdict "route /moderateur avec un jeton modifié pour s'attribuer le rôle" "$(code /moderateur "$(roles_falsifies "$JETON_MEMBRE")")" 401
verdict "route /moderateur avec le jeton d'un modérateur" "$(code /moderateur "$JETON_MODERATEUR")" 200

note ""
note "--- Test 4 : Keycloak arrêté, le service vérifie encore un jeton valide"
JETON_RECENT="$(jeton membre-test)"
k scale deploy/keycloak --replicas=0 >/dev/null
k wait --for=delete pod -l app=keycloak --timeout=120s >/dev/null
verdict "route /membre avec un jeton valide, Keycloak arrêté" "$(code /membre "$JETON_RECENT")" 200
verdict "demande d'un nouveau jeton, Keycloak arrêté" "$(code_jeton membre-test)" 503
DEBUT=$(date +%s)
k scale deploy/keycloak --replicas=1 >/dev/null
k rollout status deploy/keycloak --timeout=420s >/dev/null
note "Keycloak de nouveau prêt en $(($(date +%s) - DEBUT)) s (redémarrage, image et base déjà en place)"

note ""
note "--- Test 5 : un jeton expiré est refusé"
RESTE=$(( $(contenu "$JETON_MEMBRE" '.exp') - $(date +%s) ))
if [ "$RESTE" -ge 0 ]; then note "Attente de l'expiration du premier jeton : $((RESTE + 3)) s"; sleep $((RESTE + 3)); fi
verdict "route /membre avec un jeton expiré" "$(code /membre "$JETON_MEMBRE")" 401
note "Motifs de refus relevés dans le journal du service (jamais renvoyés au client) :"
k logs deploy/verificateur | grep '"etat":"jeton-refuse"' | sort | uniq -c | sed 's/^/    /' | tee -a "$RAPPORT"

note ""
note "--- Test 6 : redémarrage de la base de données, les comptes sont conservés"
k delete pod postgresql-0 --wait=true >/dev/null
DEBUT=$(date +%s)
k rollout status statefulset/postgresql --timeout=300s >/dev/null
JETON_APRES=""
for _ in $(seq 1 60); do
  JETON_APRES="$(jeton membre-test 2>/dev/null || true)"
  [ -n "$JETON_APRES" ] && break
  sleep 2
done
note "Base redémarrée et jeton de nouveau délivré en $(($(date +%s) - DEBUT)) s"
verdict "jeton obtenu après le redémarrage de la base" "$([ -n "$JETON_APRES" ] && echo oui || echo non)" "oui"
verdict "route /membre avec ce nouveau jeton" "$(code /membre "$JETON_APRES")" 200

note ""
note "--- Test 7 : un compte sans courriel, prénom ni nom n'obtient pas de jeton"
verdict "code HTTP de la demande de jeton pour le compte incomplet" "$(code_jeton incomplet-test)" 400
note "Réponse de Keycloak : $(appel -d grant_type=password -d client_id=tests -d username=incomplet-test \
  --data-urlencode "password@$TMP/mdp-incomplet-test" "$URL_JETON")"

note ""
note "--- Mémoire et processeur (kubectl top, mesure instantanée)"
sleep 30   # laisse à metrics-server le temps de mesurer les derniers pods
k top pod | tee -a "$RAPPORT"

note ""
if [ "$ECHECS" -eq 0 ]; then note "BILAN : tous les contrôles sont réussis"; else note "BILAN : $ECHECS contrôle(s) en échec"; fi
exit "$ECHECS"
