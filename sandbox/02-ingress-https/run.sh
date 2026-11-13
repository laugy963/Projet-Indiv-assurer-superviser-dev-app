#!/usr/bin/env bash
# Expérimentation 2 — Ingress HTTPS : Traefik et cert-manager.
#
# Rejouer :  ./run.sh     (le cluster k3d « epouvante » doit exister, voir deploy/k3d/README.md)
# cert-manager reste installé d'une exécution à l'autre ; l'espace de noms de démonstration est recréé.
# Les résultats bruts sont écrits dans resultats/execution.txt.
set -euo pipefail

ICI="$(cd "$(dirname "$0")" && pwd)"
source "$ICI/../../deploy/k3d/env.sh"

NS=bac-a-sable-https
HOTE=api.epouvante.test
VERSION_CERT_MANAGER=v1.21.3
RAPPORT="$ICI/resultats/execution.txt"
mkdir -p "$ICI/resultats"
: > "$RAPPORT"
# Dossier temporaire hors du dépôt, pour le certificat de l'autorité locale.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

note() { echo "$*" | tee -a "$RAPPORT"; }
k() { kubectl -n "$NS" "$@"; }
verdict() {  # verdict <libellé> <obtenu> <attendu>
  if [ "$2" = "$3" ]; then note "  RÉUSSI  $1 : $2"; else note "  ÉCHEC   $1 : $2 (attendu : $3)"; ECHECS=$((ECHECS + 1)); fi
}
ECHECS=0

# Le nom d'hôte n'existe dans aucun DNS : --resolve l'associe à l'adresse locale, comme dans le cours.
appel() { curl -sS --connect-timeout 5 --max-time 10 --resolve "$HOTE:443:127.0.0.1" --resolve "$HOTE:80:127.0.0.1" "$@"; }
# Certificat présenté par Traefik pour ce nom d'hôte.
certificat_servi() {
  openssl s_client -connect 127.0.0.1:443 -servername "$HOTE" </dev/null 2>/dev/null | openssl x509 "$@"
}
revision() { k get certificate api-tls -o jsonpath='{.status.revision}' 2>/dev/null; }

note "=== Expérimentation 2 — Ingress HTTPS, Traefik et cert-manager — $(date '+%Y-%m-%d %H:%M:%S')"
note "Cluster : $(kubectl version -o json | jq -r '.serverVersion.gitVersion')"
note "Traefik : $(kubectl -n kube-system get deploy traefik -o jsonpath='{.spec.template.spec.containers[0].image}')"

note ""
note "--- Installation de cert-manager par Helm"
DEBUT=$(date +%s)
helm upgrade --install cert-manager oci://quay.io/jetstack/charts/cert-manager \
  --version "$VERSION_CERT_MANAGER" --namespace cert-manager --create-namespace \
  --set crds.enabled=true --wait --timeout 5m >/dev/null
note "cert-manager $VERSION_CERT_MANAGER prêt en $(($(date +%s) - DEBUT)) s (téléchargement des images compris à la première exécution)"
kubectl -n cert-manager get pods --no-headers | awk '{print "  " $1 "  " $2 "  " $3}' | tee -a "$RAPPORT"

note ""
note "--- Test 1 : redirection de HTTP vers HTTPS"
kubectl apply -f "$ICI/k8s/redirection-https.yaml" >/dev/null
# k3s relance l'installation de Traefik avec le nouveau réglage : on attend qu'il soit appliqué.
REPONSE=""
for _ in $(seq 1 90); do
  REPONSE="$(appel -o /dev/null -w '%{http_code} %{redirect_url}' "http://$HOTE/" 2>/dev/null || true)"
  case "$REPONSE" in 301*|308*) break ;; esac
  sleep 2
done
verdict "réponse à une requête HTTP" "$REPONSE" "301 https://$HOTE/"
kubectl -n kube-system rollout status deploy/traefik --timeout=180s >/dev/null

note ""
note "--- Préparation : autorité de certification locale et service de démonstration"
kubectl delete namespace "$NS" --ignore-not-found --wait=true >/dev/null
kubectl create namespace "$NS" >/dev/null
kubectl apply -f "$ICI/k8s/emetteurs.yaml" >/dev/null
kubectl -n cert-manager wait --for=condition=Ready certificate/ac-locale --timeout=120s >/dev/null
kubectl wait --for=condition=Ready clusterissuer/ac-locale --timeout=120s >/dev/null
note "Autorité de certification locale prête"
DEBUT=$(date +%s)
k apply -f "$ICI/k8s/demo.yaml" >/dev/null
k rollout status deploy/whoami --timeout=120s >/dev/null
k wait --for=condition=Ready certificate/api-tls --timeout=120s >/dev/null
note "Service déployé et certificat émis en $(($(date +%s) - DEBUT)) s"

note ""
note "--- Test 2 : le certificat est émis par cert-manager à partir d'une annotation de l'Ingress"
verdict "état du certificat api-tls" "$(k get certificate api-tls -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')" "True"
verdict "type du Secret api-tls" "$(k get secret api-tls -o jsonpath='{.type}')" "kubernetes.io/tls"

note ""
note "--- Test 3 : appel HTTPS vérifié avec le certificat de l'autorité locale"
kubectl -n cert-manager get secret ac-locale -o jsonpath='{.data.tls\.crt}' | base64 -d > "$TMP/ac-locale.crt"
sleep 3   # laisse à Traefik le temps de charger le Secret
verdict "code HTTP et résultat de la vérification TLS (0 = chaîne valide)" \
  "$(appel --cacert "$TMP/ac-locale.crt" -o /dev/null -w '%{http_code} %{ssl_verify_result}' "https://$HOTE/")" "200 0"
note "Certificat présenté par Traefik :"
certificat_servi -noout -subject -issuer -dates -ext subjectAltName | sed 's/^/    /' | tee -a "$RAPPORT"

note ""
note "--- Test 4 : sans le certificat de l'autorité locale, le client refuse la connexion"
set +e
appel -o /dev/null "https://$HOTE/" 2>"$TMP/erreur.txt"
CODE=$?
set -e
verdict "code de sortie de curl (60 = certificat non reconnu)" "$CODE" 60
sed 's/^/    /' "$TMP/erreur.txt" | head -2 | tee -a "$RAPPORT"

note ""
note "--- Test 5 : renouvellement automatique, sans redémarrage de Traefik"
POD_TRAEFIK="$(kubectl -n kube-system get pod -l app.kubernetes.io/name=traefik -o jsonpath='{.items[0].metadata.name}')"
REDEMARRAGES_AVANT="$(kubectl -n kube-system get pod "$POD_TRAEFIK" -o jsonpath='{.status.containerStatuses[0].restartCount}')"
REVISION_AVANT="$(revision)"
SERIE_AVANT="$(certificat_servi -noout -serial)"
note "Avant : révision $REVISION_AVANT, $SERIE_AVANT"
note "Le certificat dure 1 h et se renouvelle 59 min avant sa fin : attente du renouvellement..."
DEBUT=$(date +%s)
for _ in $(seq 1 120); do
  [ "$(revision)" != "$REVISION_AVANT" ] && break
  sleep 2
done
sleep 5   # laisse à Traefik le temps de charger le nouveau Secret
SERIE_APRES="$(certificat_servi -noout -serial)"
note "Après $(($(date +%s) - DEBUT)) s : révision $(revision), $SERIE_APRES"
verdict "le certificat servi a changé" "$([ "$SERIE_AVANT" != "$SERIE_APRES" ] && echo oui || echo non)" "oui"
verdict "le pod Traefik est le même" "$(kubectl -n kube-system get pod -l app.kubernetes.io/name=traefik -o jsonpath='{.items[0].metadata.name}')" "$POD_TRAEFIK"
verdict "redémarrages de Traefik pendant le test" "$(kubectl -n kube-system get pod "$POD_TRAEFIK" -o jsonpath='{.status.containerStatuses[0].restartCount}')" "$REDEMARRAGES_AVANT"
verdict "l'appel HTTPS vérifié fonctionne toujours" \
  "$(appel --cacert "$TMP/ac-locale.crt" -o /dev/null -w '%{http_code} %{ssl_verify_result}' "https://$HOTE/")" "200 0"

note ""
note "--- Test 6 : retour à la durée par défaut, et réémission après suppression du Secret"
k annotate ingress whoami cert-manager.io/duration- cert-manager.io/renew-before- >/dev/null
# Constat du 13 novembre 2026 : retirer les annotations ne réémet pas le certificat.
# La nouvelle durée ne s'applique qu'au renouvellement suivant.
# Supprimer le Secret force une réémission immédiate : cert-manager le recrée tout seul.
REVISION_AVANT="$(revision)"
k delete secret api-tls >/dev/null
for _ in $(seq 1 60); do
  [ "$(revision)" != "$REVISION_AVANT" ] && break
  sleep 2
done
k wait --for=condition=Ready certificate/api-tls --timeout=120s >/dev/null
sleep 5   # laisse à Traefik le temps de charger le nouveau Secret
verdict "Secret api-tls recréé par cert-manager" "$(k get secret api-tls -o jsonpath='{.type}')" "kubernetes.io/tls"
JOURS=$(( ( $(date -j -u -f '%b %d %T %Y %Z' "$(certificat_servi -noout -enddate | cut -d= -f2)" +%s) - $(date +%s) ) / 86400 ))
verdict "validité restante du nouveau certificat, en jours" "$JOURS" 89
certificat_servi -noout -dates | sed 's/^/    /' | tee -a "$RAPPORT"
verdict "l'appel HTTPS vérifié fonctionne après la réémission" \
  "$(appel --cacert "$TMP/ac-locale.crt" -o /dev/null -w '%{http_code} %{ssl_verify_result}' "https://$HOTE/")" "200 0"

note ""
note "--- Mémoire et processeur (kubectl top, mesure instantanée)"
kubectl top pod -n cert-manager | tee -a "$RAPPORT"
kubectl top pod -n kube-system -l app.kubernetes.io/name=traefik --no-headers | tee -a "$RAPPORT"

note ""
if [ "$ECHECS" -eq 0 ]; then note "BILAN : tous les contrôles sont réussis"; else note "BILAN : $ECHECS contrôle(s) en échec"; fi
exit "$ECHECS"
