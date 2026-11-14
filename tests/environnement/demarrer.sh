#!/usr/bin/env bash
# Démarre l'environnement de test du prototype (fiche 0013).
#   tests/environnement/demarrer.sh               PostgreSQL et RabbitMQ : tests d'intégration
#   tests/environnement/demarrer.sh acceptation   + Keycloak et les deux services : tests d'acceptation
#   IMAGE_ANNONCES=… IMAGE_NOTIFICATIONS=… tests/environnement/demarrer.sh acceptation   avec des images d'un registre
# Le script peut être relancé : chaque opération est idempotente.
set -euo pipefail
cd "$(dirname "$0")"
MODE="${1:-integration}"

# 1. Mots de passe : tirés au hasard, écrits dans .env (ignoré par Git), jamais dans le dépôt.
SECRETS="PG_ADMIN_MOT_DE_PASSE BDD_ANNONCES_MOT_DE_PASSE BDD_NOTIFICATIONS_MOT_DE_PASSE
AMQP_ADMIN_MOT_DE_PASSE AMQP_ANNONCES_MOT_DE_PASSE AMQP_NOTIFICATIONS_MOT_DE_PASSE KC_ADMIN_MOT_DE_PASSE
COMPTE_MEMBRE_A_MOT_DE_PASSE COMPTE_MEMBRE_B_MOT_DE_PASSE COMPTE_MEMBRE_C_MOT_DE_PASSE COMPTE_MODERATEUR_MOT_DE_PASSE"
if [ ! -f .env ]; then
  umask 077
  for nom in $SECRETS; do echo "$nom=$(openssl rand -hex 16)"; done > .env
  echo "Mots de passe aléatoires écrits dans tests/environnement/.env (non versionné)"
fi
set -a; . ./.env; set +a

dc() { docker compose "$@"; }

# 2. Base de données et broker.
dc up -d --wait postgres rabbitmq

# 3. Broker : topologie versionnée, puis un compte par service, limité à ce dont il a besoin.
#    Droits = trois expressions : configurer, écrire, lire.
rmq() { dc exec -T rabbitmq rabbitmqctl -q "$@"; }
compte_broker() {
  rmq add_user "$1" "$2" 2>/dev/null || rmq change_password "$1" "$2"
  rmq set_permissions -p / "$1" "$3" "$4" "$5"
}
rmq import_definitions /etc/rabbitmq/topologie.json
compte_broker annonces "$AMQP_ANNONCES_MOT_DE_PASSE" \
  '^annonces$' '^annonces$' '^$'
compte_broker notifications "$AMQP_NOTIFICATIONS_MOT_DE_PASSE" \
  '^(annonces|notifications\.annonce-publiee)$' '^notifications\.annonce-publiee$' '^(annonces|notifications\.annonce-publiee)$'
echo "Broker prêt : topologie importée, comptes « annonces » et « notifications » créés"

if [ "$MODE" != "acceptation" ]; then
  # Les tests d'intégration lancent eux-mêmes le service testé. Les conteneurs des services, s'ils existent,
  # sont arrêtés : ils liraient la même file et la même base que lui.
  dc --profile acceptation stop annonces notifications >/dev/null 2>&1 || true
  echo "Environnement d'intégration prêt (services annonces et notifications arrêtés)"
  exit 0
fi

# 4. Keycloak, puis les comptes de test : profil complet, sinon Keycloak refuse le jeton (bac à sable).
dc --profile acceptation up -d --wait keycloak
kc() { dc exec -T keycloak /opt/keycloak/bin/kcadm.sh "$@" --config /tmp/kcadm.config; }
dc exec -T keycloak sh -c '/opt/keycloak/bin/kcadm.sh config credentials --config /tmp/kcadm.config \
  --server http://localhost:8080 --realm master --user "$KC_BOOTSTRAP_ADMIN_USERNAME" --password "$KC_BOOTSTRAP_ADMIN_PASSWORD"' >/dev/null 2>&1
compte_test() {  # compte_test <nom> <rôle> <mot de passe>
  kc create users -r epouvante -s "username=$1" -s enabled=true -s emailVerified=true \
    -s "email=$1@epouvante.test" -s firstName=Compte -s "lastName=De test" >/dev/null 2>&1 || true
  kc set-password -r epouvante --username "$1" --new-password "$3" >/dev/null 2>&1
  kc add-roles -r epouvante --uusername "$1" --rolename "$2" >/dev/null 2>&1
}
compte_test membre-a membre "$COMPTE_MEMBRE_A_MOT_DE_PASSE"
compte_test membre-b membre "$COMPTE_MEMBRE_B_MOT_DE_PASSE"
compte_test membre-c membre "$COMPTE_MEMBRE_C_MOT_DE_PASSE"
compte_test moderateur-test moderateur "$COMPTE_MODERATEUR_MOT_DE_PASSE"
echo "Keycloak prêt : comptes membre-a, membre-b, membre-c et moderateur-test créés"

# 5. Les deux services. Sur le poste, ils sont construits depuis le code du dépôt.
#    Dans le pipeline, IMAGE_ANNONCES et IMAGE_NOTIFICATIONS désignent les images du registre :
#    elles sont tirées telles quelles (« construire une fois »), jamais reconstruites.
if [ -n "${IMAGE_ANNONCES:-}" ] && [ -n "${IMAGE_NOTIFICATIONS:-}" ]; then
  dc --profile acceptation up -d --no-build --wait annonces notifications
else
  dc --profile acceptation up -d --build --wait annonces notifications
fi
echo "Environnement d'acceptation prêt"
