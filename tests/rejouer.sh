#!/usr/bin/env bash
# Rejoue toutes les preuves de l'étape 5 et enregistre leur sortie brute dans tests/resultats/.
#   tests/rejouer.sh        (ou : npm run preuves)
# Le script démarre lui-même l'environnement de test (Docker). Il affiche un verdict par volet ;
# son code de sortie est le nombre de volets en échec.
set -uo pipefail
cd "$(dirname "$0")/.."

# NestJS 12 est publié en modules ES : Jest ne les charge qu'avec cette option de Node.js.
export NODE_OPTIONS="--experimental-vm-modules --disable-warning=ExperimentalWarning"
RESULTATS="$PWD/tests/resultats"
RAPPORTS="$PWD/reports"   # rapports JSON de Jest, non versionnés : ils servent au calcul de l'indicateur I1
mkdir -p "$RESULTATS" "$RAPPORTS"
ECHECS=0

# « npx --no-install » : lancer le Jest installé par « npm ci », sans jamais en télécharger un autre.
# --reporters=default avec --verbose : un verdict par test.
# Sans cette option, Jest réduit sa sortie à un résumé quand il est lancé par un agent de code.
lancer_jest() { npx --no-install jest --verbose --reporters=default "$@"; }

unitaires() {
  local code=0
  (cd libs/socle && echo "=== libs/socle" && lancer_jest) || code=1
  for service in annonces notifications; do
    (cd "services/$service" && echo && echo "=== services/$service" && lancer_jest --selectProjects unitaire) || code=1
  done
  return $code
}

integration() {
  local code=0
  for service in annonces notifications; do
    (cd "services/$service" && echo && echo "=== services/$service" &&
      lancer_jest --selectProjects integration --runInBand --json --outputFile="$RAPPORTS/integration-$service.json") || code=1
  done
  return $code
}

couverture() {
  local code=0
  (cd libs/socle && echo "=== libs/socle (tests unitaires)" && npx --no-install jest --reporters=default --coverage) || code=1
  for service in annonces notifications; do
    (cd "services/$service" && echo && echo "=== services/$service (tests unitaires et d'intégration)" &&
      npx --no-install jest --reporters=default --runInBand --coverage) || code=1
  done
  return $code
}

acceptation() {
  (cd tests/acceptation && lancer_jest --runInBand --json --outputFile="$RAPPORTS/acceptation.json")
}

indicateur() {
  node tests/indicateur-i1.mjs "$RAPPORTS/integration-annonces.json" "$RAPPORTS/integration-notifications.json" "$RAPPORTS/acceptation.json"
}

# volet <fichier> <titre> <fonction> : exécute, enregistre la sortie brute, affiche le verdict.
volet() {
  local fichier="$RESULTATS/$1" titre="$2" debut=$SECONDS
  { echo "$titre — exécution du $(date '+%Y-%m-%d %H:%M:%S')"; echo "$CONTEXTE"; echo; } > "$fichier"
  if "$3" >> "$fichier" 2>&1; then
    echo "RÉUSSI  $titre ($((SECONDS - debut)) s)"
  else
    echo "ÉCHEC   $titre ($((SECONDS - debut)) s) — voir tests/resultats/$1"
    ECHECS=$((ECHECS + 1))
  fi
}

version_de() { node -p "require('$1/package.json').version"; }
OUTILS="Node.js $(node -v), NestJS $(version_de @nestjs/core), TypeScript $(version_de typescript), Jest $(version_de jest)"

echo "Démarrage de l'environnement d'intégration…"
tests/environnement/demarrer.sh > /dev/null 2>&1 || { echo "ARRÊT : l'environnement de test ne démarre pas"; exit 1; }
conteneur() { docker compose -f tests/environnement/compose.yaml --env-file tests/environnement/.env --profile acceptation exec -T "$@"; }
DEPENDANCES="$(conteneur postgres postgres --version | sed 's/ (Debian.*//; s/postgres (PostgreSQL)/PostgreSQL/'), RabbitMQ $(conteneur rabbitmq rabbitmqctl -q version)"

CONTEXTE="$OUTILS"
volet tests-unitaires.txt "Tests unitaires" unitaires
CONTEXTE="$OUTILS — $DEPENDANCES réels, jetons de l'émetteur de test"
volet tests-integration.txt "Tests d'intégration" integration
volet couverture.txt "Couverture de code" couverture

echo "Démarrage de l'environnement d'acceptation (Keycloak et les deux services en conteneurs)…"
tests/environnement/demarrer.sh acceptation > /dev/null 2>&1 || { echo "ARRÊT : l'environnement d'acceptation ne démarre pas"; exit 1; }
CONTEXTE="$OUTILS — $DEPENDANCES, $(conteneur keycloak /opt/keycloak/bin/kc.sh --version | head -n 1), services en conteneurs"
volet tests-acceptation.txt "Tests d'acceptation" acceptation
CONTEXTE="Calculé par tests/indicateur-i1.mjs à partir des rapports JSON des tests d'intégration et d'acceptation"
volet indicateur-i1.txt "Indicateur I1" indicateur

echo
echo "Volets en échec : $ECHECS. Sorties brutes dans tests/resultats/. Arrêter l'environnement : npm run env:arret"
exit "$ECHECS"
