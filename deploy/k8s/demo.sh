#!/usr/bin/env bash
# Démonstration de la soutenance, sur le prototype déployé : la chaîne complète, la sécurité, la perte d'un pod.
#
#   deploy/k8s/demo.sh              en direct : attend la touche Entrée avant chaque temps
#   deploy/k8s/demo.sh repetition   sans pause : chronomètre chaque temps, écrit tests/resultats/demonstration.txt
#
# Prérequis : cluster démarré, prototype déployé (deployer.sh), verifier.sh réussi. Outils : curl, jq, node.
# Chaque temps affiche la commande jouée, puis compare le résultat obtenu au résultat attendu.
# Le script ne s'arrête pas sur un écart : en soutenance, on le commente et on continue.
# Code de sortie : le nombre d'écarts.
set -uo pipefail

RACINE="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=acces.sh
source "$RACINE/deploy/k8s/acces.sh"

NS=epouvante
MODE="${1:-direct}"
PREUVE="$RACINE/tests/resultats/demonstration.txt"
ROUTE_ANNONCES="$URL_API/api/annonces"
JSON='Content-Type: application/json'
ECARTS=0
DEBUT_DEMO=$SECONDS
DEBUT_TEMPS=$SECONDS
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# En direct, les titres sont en gras : ils se lisent du fond de la salle.
GRAS=""
NORMAL=""
if [[ "$MODE" == "direct" && -t 1 ]]; then
  GRAS="$(tput bold)"
  NORMAL="$(tput sgr0)"
fi

k() {
  kubectl -n "$NS" "$@"
  return $?
}

# Appel HTTPS, vérifié avec le certificat de l'autorité de certification locale.
appel() {
  curl -sS --connect-timeout 5 --max-time 15 --cacert "$AC_LOCALE" "$@"
  return $?
}

# jeton <compte> <mot de passe> : jeton d'accès délivré par Keycloak. Le mot de passe passe par l'entrée standard.
# Un jeton vit 120 secondes : chaque temps redemande les siens, pour que les pauses de l'orateur ne comptent pas.
jeton() {
  local compte="$1" mot_de_passe="$2"
  printf '%s' "$mot_de_passe" \
    | appel -d grant_type=password -d client_id=tests -d "username=$compte" --data-urlencode password@- "$URL_JETONS" \
    | jq -r '.access_token // empty'
  return 0
}

# temps <numéro> <titre> : annonce un temps de la démonstration. En direct, attend la touche Entrée.
temps() {
  local numero="$1" titre="$2"
  echo
  echo "${GRAS}=== $numero. $titre${NORMAL}"
  if [[ "$MODE" == "direct" ]]; then
    read -r -p "    [Entrée] " _
  fi
  DEBUT_TEMPS=$SECONDS
  return 0
}

# fin_du_temps : en répétition, affiche la durée technique du temps, sans la parole.
fin_du_temps() {
  if [[ "$MODE" == "repetition" ]]; then
    echo "    durée : $((SECONDS - DEBUT_TEMPS)) s"
  fi
  return 0
}

# montrer <commande> : affiche la commande que le jury doit voir.
montrer() {
  local commande="$1"
  echo "  \$ $commande"
  return 0
}

# attendu <libellé> <obtenu> <attendu> : compare et compte les écarts.
attendu() {
  local libelle="$1" obtenu="$2" voulu="$3"
  if [[ "$obtenu" == "$voulu" ]]; then
    echo "  ${GRAS}OK${NORMAL}     $libelle : $obtenu"
  else
    echo "  ${GRAS}ÉCART${NORMAL}  $libelle : $obtenu (attendu : $voulu)"
    ECARTS=$((ECARTS + 1))
  fi
  return 0
}

demonstration() {
  local jeton_a jeton_b jeton_moderateur annonce code victime lecture notifie

  echo "Démonstration du prototype — $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Cluster : $(kubectl version -o json 2> /dev/null | jq -r '.serverVersion.gitVersion')"
  echo "Images : $(k get deploy annonces notifications -o jsonpath='{range .items[*]}{.spec.template.spec.containers[0].image}{"  "}{end}')"

  temps 1 "Le prototype tourne sur Kubernetes : deux pods par service, mise à l'échelle prête"
  montrer "kubectl -n $NS get pods,hpa"
  k get pods | sed 's/^/    /'
  k get hpa | sed 's/^/    /'
  attendu "pods prêts : annonces, notifications" \
    "$(k get deploy annonces notifications -o jsonpath='{range .items[*]}{.status.readyReplicas} {end}')" "2 2 "
  fin_du_temps

  temps 2 "HTTPS seulement, et rien sans jeton"
  montrer "curl http://api.epouvante.localhost/api/annonces"
  attendu "HTTP est redirigé vers HTTPS" \
    "$(curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' "http://api.epouvante.localhost/api/annonces" 2> /dev/null)" \
    "301 $ROUTE_ANNONCES"
  montrer "curl --cacert <autorité locale> $ROUTE_ANNONCES"
  code="$(appel -o "$TMP/refus.json" -w '%{http_code} %{ssl_verify_result}' "$ROUTE_ANNONCES")"
  sed 's/^/    /' "$TMP/refus.json"
  echo
  attendu "sans jeton : code HTTP, puis vérification du certificat (0 = chaîne valide)" "$code" "401 0"
  fin_du_temps

  temps 3 "Keycloak délivre le jeton ; le service y lit le rôle"
  montrer "curl -d grant_type=password -d username=membre-a … $URL_JETONS"
  jeton_a="$(jeton membre-a "$COMPTE_MEMBRE_A_MOT_DE_PASSE")"
  node -e '
    const contenu = JSON.parse(Buffer.from(process.argv[1].split(".")[1] ?? "", "base64url").toString() || "{}");
    console.log("    émetteur     : " + contenu.iss);
    console.log("    destinataire : " + [].concat(contenu.aud ?? []).join(", "));
    console.log("    compte       : " + contenu.preferred_username);
    console.log("    rôles        : " + (contenu.realm_access?.roles ?? []).filter((role) => ["membre", "moderateur"].includes(role)).join(", "));
    console.log("    durée de vie : " + (contenu.exp - contenu.iat) + " s");' "$jeton_a"
  attendu "jeton délivré à membre-a" "$([[ -n "$jeton_a" ]] && echo oui || echo non)" "oui"
  fin_du_temps

  temps 4 "Membre B déclare son centre d'intérêt : les figurines"
  jeton_b="$(jeton membre-b "$COMPTE_MEMBRE_B_MOT_DE_PASSE")"
  montrer "PUT /api/centres-interet  {\"categories\":[\"figurines\"]}"
  attendu "centres d'intérêt enregistrés" \
    "$(appel -o /dev/null -w '%{http_code}' -X PUT -H "Authorization: Bearer $jeton_b" -H "$JSON" \
      -d '{"categories":["figurines"]}' "$URL_API/api/centres-interet")" "200"
  fin_du_temps

  temps 5 "Membre A publie une annonce de don"
  jeton_a="$(jeton membre-a "$COMPTE_MEMBRE_A_MOT_DE_PASSE")"
  montrer "POST /api/annonces  {\"titre\":\"Figurine Evil Ed\",\"categorie\":\"figurines\",\"type\":\"don\"}"
  code="$(appel -o "$TMP/annonce.json" -w '%{http_code}' -H "Authorization: Bearer $jeton_a" -H "$JSON" \
    -d "{\"titre\":\"Figurine Evil Ed, démonstration du $(date '+%d/%m à %H:%M:%S')\",\"description\":\"Figurine en très bon état, donnée à un passionné.\",\"categorie\":\"figurines\",\"type\":\"don\"}" \
    "$ROUTE_ANNONCES")"
  jq -c '{id, titre, categorie, type, statut}' "$TMP/annonce.json" | sed 's/^/    /'
  attendu "annonce créée" "$code" "201"
  annonce="$(jq -r '.id // empty' "$TMP/annonce.json")"
  fin_du_temps

  temps 6 "Membre B est notifié : l'événement a traversé le broker, sans appel entre les deux services"
  jeton_b="$(jeton membre-b "$COMPTE_MEMBRE_B_MOT_DE_PASSE")"
  montrer "GET /api/notifications   (compte membre-b)"
  notifie="non"
  for lecture in 1 2 3 4 5 6 7 8 9 10; do
    appel -H "Authorization: Bearer $jeton_b" "$URL_API/api/notifications" > "$TMP/notifications.json"
    if jq -e --arg id "$annonce" '.notifications | any(.annonceId == $id)' "$TMP/notifications.json" > /dev/null; then
      notifie="oui, à la lecture n° $lecture"
      break
    fi
    sleep 0.5
  done
  jq -c --arg id "$annonce" '.notifications[] | select(.annonceId == $id)' "$TMP/notifications.json" | sed 's/^/    /'
  attendu "notification de cette annonce chez membre-b" "${notifie%%,*}" "oui"
  echo "    $notifie"
  fin_du_temps

  temps 7 "Autorisation par rôle : un membre ne retire pas une annonce, le modérateur si"
  jeton_a="$(jeton membre-a "$COMPTE_MEMBRE_A_MOT_DE_PASSE")"
  jeton_moderateur="$(jeton moderateur-test "$COMPTE_MODERATEUR_MOT_DE_PASSE")"
  montrer "DELETE /api/annonces/<id>   (compte membre-a, rôle membre)"
  attendu "retrait par un membre" \
    "$(appel -o /dev/null -w '%{http_code}' -X DELETE -H "Authorization: Bearer $jeton_a" "$ROUTE_ANNONCES/$annonce")" "403"
  montrer "DELETE /api/annonces/<id>   (compte moderateur-test, rôle moderateur)"
  attendu "retrait par le modérateur" \
    "$(appel -o /dev/null -w '%{http_code}' -X DELETE -H "Authorization: Bearer $jeton_moderateur" "$ROUTE_ANNONCES/$annonce")" "204"
  fin_du_temps

  temps 8 "Perte d'un pod : le service continue, Kubernetes remplace le pod"
  jeton_a="$(jeton membre-a "$COMPTE_MEMBRE_A_MOT_DE_PASSE")"
  victime="$(k get pod -l app=annonces -o jsonpath='{.items[0].metadata.name}')"
  montrer "kubectl -n $NS delete pod $victime"
  k delete pod "$victime" --wait=false > /dev/null
  echo "    40 lectures de la liste des annonces pendant le remplacement, une toutes les 0,25 s…"
  : > "$TMP/codes.txt"
  for _ in $(seq 1 40); do
    appel -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $jeton_a" "$ROUTE_ANNONCES" >> "$TMP/codes.txt" 2> /dev/null || echo "sans-reponse" >> "$TMP/codes.txt"
    sleep 0.25
  done
  echo "    codes reçus : $(sort "$TMP/codes.txt" | uniq -c | awk '{printf "%s × %s  ", $1, $2}')"
  attendu "réponses autres que 200 pendant le remplacement" "$(grep -v -c '^200$' "$TMP/codes.txt")" "0"
  k rollout status deployment/annonces --timeout=120s > /dev/null
  montrer "kubectl -n $NS get pods -l app=annonces"
  k get pods -l app=annonces | sed 's/^/    /'
  attendu "le pod supprimé a disparu, deux pods sont prêts" \
    "$(k get pod "$victime" --ignore-not-found --no-headers | grep -c Running) $(k get deploy annonces -o jsonpath='{.status.readyReplicas}')" "0 2"
  fin_du_temps

  echo
  echo "${GRAS}=== Fin : $ECARTS écart(s)${NORMAL}"
  if [[ "$MODE" == "repetition" ]]; then
    echo "Durée technique totale, sans la parole : $((SECONDS - DEBUT_DEMO)) s"
  fi
  echo "À montrer ensuite dans le navigateur : la dernière exécution du pipeline et le tableau de bord de SonarQube Cloud."
  return 0
}

if [[ "$MODE" == "repetition" ]]; then
  demonstration > "$PREUVE" 2>&1
  cat "$PREUVE"
else
  demonstration
fi
exit "$ECARTS"
