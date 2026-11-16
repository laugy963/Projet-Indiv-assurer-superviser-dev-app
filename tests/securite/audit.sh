#!/usr/bin/env bash
# Inventaire de sécurité de l'audit (étape 8). Il rejoue les contrôles du pipeline, y ajoute les images tierces
# du déploiement, que le pipeline ne scanne pas, et enregistre le relevé dans tests/resultats/audit-securite.txt.
#
#   tests/securite/audit.sh [commit de main dont les images sont à analyser]
#
# Différence avec le pipeline : le pipeline bloque sur « haute ou critique, avec correctif ». L'audit compte tout,
# toutes gravités, avec ou sans correctif. Un constat ne fait donc pas échouer ce script.
# Code de sortie : le nombre de contrôles qui n'ont produit aucun rapport. Un contrôle qui ne s'exécute pas
# ne prouve rien : son rapport précédent est supprimé avant chaque lancement.
# Prérequis : Docker, jq, npm, et le réseau (images de ghcr.io, base de vulnérabilités de Trivy, registre npm).
set -uo pipefail
cd "$(dirname "$0")/../.."

ANALYSES="tests/securite/analyses.sh"
RAPPORTS="reports/securite"
SORTIE="tests/resultats/audit-securite.txt"
REGISTRE="ghcr.io/laugy963"
COMMIT="${1:-$(git rev-parse origin/main)}"
JOURNAL="$(mktemp)"
trap 'rm -f "$JOURNAL"' EXIT
ABSENTS=0

# controle <rapport attendu> <commande…> : lance un contrôle et vérifie qu'il a écrit son rapport.
# La sortie de la commande reste dans $JOURNAL, pour en citer les lignes utiles.
controle() {
  local rapport="$RAPPORTS/$1"
  shift
  rm -f "$rapport"
  "$@" > "$JOURNAL" 2>&1
  local code=$?
  if [[ -s "$rapport" ]]; then
    echo "  code de sortie : $code"
  else
    echo "  code de sortie : $code — AUCUN RAPPORT, le contrôle ne s'est pas exécuté"
    ABSENTS=$((ABSENTS + 1))
  fi
  return 0
}

# citer <motif> : affiche les lignes du dernier contrôle qui contiennent le motif, sans les codes de couleur.
citer() {
  local motif="$1"
  sed $'s/\x1b\\[[0-9;]*m//g' "$JOURNAL" | grep -E "$motif" | sed 's/^[^A-Za-z0-9]*/  /'
  return 0
}

# gravites <rapport Trivy> : vulnérabilités par gravité, et combien ont un correctif publié.
gravites() {
  local rapport="$RAPPORTS/$1"
  [[ -s "$rapport" ]] || return 0
  jq -r '[.Results[]?.Vulnerabilities[]?]
    | if length == 0 then "  aucune vulnérabilité connue"
      else group_by(.Severity)
        | map("\(.[0].Severity) \(length), dont \(map(select((.FixedVersion // "") != "")) | length) avec correctif")
        | "  " + join(" ; ")
      end' "$rapport"
  return 0
}

# graves <rapport Trivy> : les vulnérabilités hautes et critiques, regroupées par paquet.
graves() {
  local rapport="$RAPPORTS/$1"
  [[ -s "$rapport" ]] || return 0
  jq -r '[.Results[]? | .Target as $cible | .Vulnerabilities[]?
      | select(.Severity == "HIGH" or .Severity == "CRITICAL")
      | {cible: $cible, paquet: .PkgName, version: .InstalledVersion, gravite: .Severity,
         corrigeable: ((.FixedVersion // "") != ""), etat: (.Status // "?"), id: .VulnerabilityID}]
    | group_by([.cible, .paquet, .version])[]
    | "    \(.[0].paquet) \(.[0].version) [\(.[0].cible)] : "
      + "critiques \(map(select(.gravite == "CRITICAL")) | length), hautes \(map(select(.gravite == "HIGH")) | length), "
      + "dont \(map(select(.corrigeable)) | length) avec correctif ; état : \(map(.etat) | unique | join(", ")) ; "
      + "\(map(.id) | .[0:4] | join(", "))\(if length > 4 then ", …" else "" end)"' "$rapport"
  return 0
}

# peu_nombreuses <rapport Trivy> : quand il y en a cinq au plus, cite chaque vulnérabilité, quelle que soit sa gravité.
peu_nombreuses() {
  local rapport="$RAPPORTS/$1"
  [[ -s "$rapport" ]] || return 0
  jq -r '[.Results[]?.Vulnerabilities[]?] | select(length <= 5)[]
    | "    \(.Severity) \(.VulnerabilityID) \(.PkgName) \(.InstalledVersion), correctif \(.FixedVersion // "aucun")"' "$rapport"
  return 0
}

# nom_du_rapport <image> [plateforme] : le nom de fichier que analyses.sh donne au rapport d'une image.
nom_du_rapport() {
  local image="$1" plateforme="${2:-}"
  local nom="${image##*/}"
  echo "image-${nom%%[@:]*}${plateforme:+-${plateforme##*/}}.json"
  return 0
}

# image <image> [plateforme] : analyse tout le contenu d'une image.
image() {
  local reference="$1" plateforme="${2:-}"
  local rapport
  rapport="$(nom_du_rapport "$reference" "$plateforme")"
  echo
  echo "--- Image $reference${plateforme:+ ($plateforme)}"
  if [[ -n "$plateforme" ]]; then
    controle "$rapport" "$ANALYSES" image "$reference" "$plateforme"
  else
    controle "$rapport" "$ANALYSES" image "$reference"
  fi
  [[ -s "$RAPPORTS/$rapport" ]] && jq -r '"  système : \(.Metadata.OS.Family // "?") \(.Metadata.OS.Name // "") ; architecture : \(.Metadata.ImageConfig.architecture // "?")"' "$RAPPORTS/$rapport"
  gravites "$rapport"
  peu_nombreuses "$rapport"
  graves "$rapport"
  return 0
}

inventaire() {
  local trivy
  trivy="$(sed -En 's/^TRIVY="(.*)"$/\1/p' "$ANALYSES")"
  echo "=== Inventaire de sécurité de l'audit — $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Code analysé : branche $(git rev-parse --abbrev-ref HEAD), commit $(git rev-parse --short HEAD)"
  echo "Images des services : celles du commit $COMMIT de main, dans $REGISTRE"
  echo "Outils : $(sed -En 's/^(GITLEAKS|SEMGREP|TRIVY)="([^@]*)@.*/\2/p' "$ANALYSES" | paste -sd ' ' -)"

  echo
  echo "--- Secrets : Gitleaks, tout l'historique"
  controle secrets.json "$ANALYSES" secrets
  citer 'commits scanned|leaks found'

  echo
  echo "--- Analyse statique : Semgrep"
  controle sast.json "$ANALYSES" sast
  citer 'Findings:|Rules run:|Targets scanned:|patterns:'

  echo
  echo "--- Dépendances : Trivy, mode fichiers, dépendances de développement comprises"
  controle dependances.json "$ANALYSES" dependances
  gravites dependances.json
  jq -r '.Results[]? | .Target as $cible | .Vulnerabilities[]?
    | "    \(.Severity) \(.VulnerabilityID) \(.PkgName) \(.InstalledVersion), correctif \(.FixedVersion // "aucun") [\($cible)]"' \
    "$RAPPORTS/dependances.json" 2> /dev/null
  echo "  Base de vulnérabilités de Trivy : $(docker run --rm --entrypoint cat -v epouvante-trivy:/root/.cache/trivy "$trivy" \
    /root/.cache/trivy/db/metadata.json 2> /dev/null | jq -r '"mise à jour \(.UpdatedAt), téléchargée \(.DownloadedAt)"')"

  echo
  echo "--- Dépendances : npm audit"
  echo "  toutes : $(npm audit --json 2> /dev/null | jq -c '.metadata.vulnerabilities')"
  echo "  production seule : $(npm audit --omit=dev --json 2> /dev/null | jq -c '.metadata.vulnerabilities')"

  echo
  echo "--- Manifestes Kubernetes : Trivy, mode configuration"
  controle manifestes.json "$ANALYSES" manifestes
  jq -r '[.Results[]? | {reussis: (.MisconfSummary.Successes // 0), echecs: (.MisconfSummary.Failures // 0)}]
    | "  \(length) fichiers ; contrôles réussis : \(map(.reussis) | add) ; en échec : \(map(.echecs) | add)"' \
    "$RAPPORTS/manifestes.json" 2> /dev/null
  jq -r '[.Results[]? | .Target as $cible | (.Misconfigurations // [])[] | select(.Status == "FAIL")
      | {fichier: ($cible | split("/") | last), id: .ID, gravite: .Severity, titre: .Title}]
    | group_by(.id)[]
    | "    \(.[0].gravite) \(.[0].id) ×\(length) : \(.[0].titre) [\(map(.fichier) | unique | join(", "))]"' \
    "$RAPPORTS/manifestes.json" 2> /dev/null

  local service plateforme tierce
  for service in annonces notifications; do
    for plateforme in linux/arm64 linux/amd64; do
      image "$REGISTRE/epouvante-$service:$COMMIT" "$plateforme"
    done
  done
  # Les images tierces sont lues dans les manifestes : celles qui sont déployées, pas une liste recopiée.
  while read -r tierce; do
    image "$tierce"
  done < <(grep -rhoE 'image: +[^ ]+' deploy/k8s/base/dependances | sed -E 's/image: +//' | sort -u)

  echo
  echo "=== Contrôles sans rapport : $ABSENTS"
  return 0
}

mkdir -p "$(dirname "$SORTIE")"
inventaire > "$SORTIE"
cat "$SORTIE"
exit "$ABSENTS"
