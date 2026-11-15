#!/bin/sh
# Exécuté une seule fois par l'image PostgreSQL, au premier démarrage, quand le volume est encore vide.
# Une base et un compte par service (fiche 0008) : chaque compte est propriétaire de sa base,
# et le droit de connexion donné par défaut à tous les comptes est retiré.
# Même script que celui de l'environnement de test (tests/environnement/postgres/init.sh), plus la base de Keycloak.
set -eu

creer() {  # creer <service> <mot de passe>
  psql -v ON_ERROR_STOP=1 --username postgres -v service="$1" -v mdp="$2" <<'SQL'
CREATE ROLE :"service" LOGIN PASSWORD :'mdp';
CREATE DATABASE :"service" OWNER :"service";
REVOKE CONNECT ON DATABASE :"service" FROM PUBLIC;
SQL
}

creer annonces "$BDD_ANNONCES_MOT_DE_PASSE"
creer notifications "$BDD_NOTIFICATIONS_MOT_DE_PASSE"
creer keycloak "$BDD_KEYCLOAK_MOT_DE_PASSE"
