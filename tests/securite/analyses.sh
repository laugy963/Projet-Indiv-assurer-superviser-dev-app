#!/usr/bin/env bash
# Contrôles de sécurité du pipeline (processus de développement, paragraphe 4.3), rejouables sur le poste.
#   tests/securite/analyses.sh secrets                        Gitleaks : secret commité, dans tout l'historique
#   tests/securite/analyses.sh sast                           Semgrep : motifs de code dangereux
#   tests/securite/analyses.sh dependances                    Trivy, mode fichiers : vulnérabilités des dépendances
#   tests/securite/analyses.sh image <image> [plateforme]     Trivy, mode image : tout le contenu d'une image
# Le poste et le pipeline lancent la même commande : même outil, même version, mêmes règles.
# Seul prérequis : Docker. Chaque outil tourne dans son conteneur officiel, désigné par son empreinte (fiche 0016).
# Code de sortie : 0 si rien n'est à signaler, différent de 0 sinon. Rapports dans reports/securite/ (non versionné).
set -euo pipefail
cd "$(dirname "$0")/../.."

# Version lisible + empreinte sha256 : l'étiquette dit la version, l'empreinte garantit le contenu.
# Une étiquette peut être déplacée vers un autre contenu (attaque de mars 2026 contre Trivy) ; une empreinte, non.
# Versions relevées le 14 novembre 2026. Pour monter de version : changer l'étiquette ET l'empreinte
# (docker buildx imagetools inspect <image>:<version>).
GITLEAKS="ghcr.io/gitleaks/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f"
SEMGREP="semgrep/semgrep:1.185.0@sha256:67518c174185a2043fdbed16c70631b79209499b3671178e7194379b48295a0d"
TRIVY="aquasec/trivy:0.76.2@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb"

RAPPORTS="$PWD/reports/securite"
mkdir -p "$RAPPORTS"

# Le dépôt est monté en lecture seule : un outil d'analyse lit le code, il ne le modifie pas.
trivy() {
  docker run --rm -v "$PWD":/depot:ro -w /depot -v "$RAPPORTS":/rapports -v epouvante-trivy:/root/.cache/trivy \
    "$@"
}
# Politique commune aux deux modes de Trivy (processus, 4.3) : bloquer sur une vulnérabilité haute ou critique
# qui a un correctif. Les risques acceptés sont dans .trivyignore, avec une date d'expiration.
POLITIQUE=(--severity HIGH,CRITICAL --ignore-unfixed --exit-code 1)

case "${1:-}" in
  secrets)
    # « git » : lit les commits, pas seulement les fichiers présents. « --log-opts=--all » : toutes les branches.
    # « --redact » : un secret trouvé n'est pas recopié dans le journal du pipeline, qui est public.
    docker run --rm -v "$PWD":/depot:ro -v "$RAPPORTS":/rapports "$GITLEAKS" \
      git /depot --log-opts="--all" --redact --no-banner \
      --report-format json --report-path /rapports/secrets.json
    ;;

  sast)
    # Jeux de règles publics du registre Semgrep. « --error » : un constat donne un code de sortie différent de 0.
    # « --metrics=off » : aucune statistique d'usage n'est envoyée à l'éditeur.
    # Par défaut, Semgrep n'analyse pas le code de test (dossiers test/ et tests/) : il n'est pas livré.
    docker run --rm -v "$PWD":/depot:ro -w /depot -v "$RAPPORTS":/rapports "$SEMGREP" \
      semgrep scan --error --metrics=off \
      --config p/default --config p/typescript --config p/nodejs --config p/owasp-top-ten \
      --config p/dockerfile --config p/github-actions \
      --exclude Cours --exclude "Contexte et Consigne - Indiv" \
      --json-output=/rapports/sast.json .
    ;;

  dependances)
    # Les dépendances de développement sont comprises : elles ne sont pas livrées, mais elles s'exécutent
    # sur les postes et dans le pipeline. node_modules est écarté : ce sont les fichiers de verrou qui font foi.
    PERIMETRE=(fs --scanners vuln --include-dev-deps --skip-dirs "**/node_modules" .)
    # 1. Inventaire complet, toutes gravités. Il ne bloque rien : il est gardé pour l'audit.
    trivy "$TRIVY" "${PERIMETRE[@]}" --quiet --format json --output /rapports/dependances.json
    # 2. Contrôle bloquant.
    trivy "$TRIVY" "${PERIMETRE[@]}" "${POLITIQUE[@]}"
    ;;

  image)
    IMAGE="${2:?image à analyser : nom:étiquette ou nom@sha256:empreinte}"
    PLATEFORME="${3:-}"
    NOM="${IMAGE##*/}"; NOM="${NOM%%[@:]*}${PLATEFORME:+-${PLATEFORME##*/}}"
    OPTIONS=(image --scanners vuln ${PLATEFORME:+--platform "$PLATEFORME"})
    # Image locale : lue auprès du moteur Docker. Image d'un registre : identifiants passés par
    # TRIVY_USERNAME et TRIVY_PASSWORD, s'ils sont définis (dans le pipeline, le jeton du job).
    ACCES=(-e TRIVY_USERNAME -e TRIVY_PASSWORD)
    if [[ -S /var/run/docker.sock ]]; then ACCES+=(-v /var/run/docker.sock:/var/run/docker.sock); fi
    trivy "${ACCES[@]}" "$TRIVY" "${OPTIONS[@]}" --quiet --format json --output "/rapports/image-$NOM.json" "$IMAGE"
    # « --table-mode detailed » : n'afficher que les vulnérabilités, pas la liste des centaines de paquets sains.
    trivy "${ACCES[@]}" "$TRIVY" "${OPTIONS[@]}" "${POLITIQUE[@]}" --quiet --table-mode detailed "$IMAGE"
    echo "Image $IMAGE${PLATEFORME:+ ($PLATEFORME)} : aucune vulnérabilité haute ou critique qui ait un correctif"
    ;;

  *)
    sed -n '2,9p' "$0"; exit 2
    ;;
esac
