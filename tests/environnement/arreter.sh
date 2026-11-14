#!/usr/bin/env bash
# Arrête l'environnement de test et détruit ses données et ses mots de passe.
set -euo pipefail
cd "$(dirname "$0")"
if [[ -f .env ]]; then
  docker compose --profile acceptation down --volumes --remove-orphans
  rm -f .env
fi
echo "Environnement de test arrêté"
