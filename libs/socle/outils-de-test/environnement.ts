// Accès des tests à l'environnement Docker Compose (tests/environnement).
// Les mots de passe sont lus dans le fichier .env créé par demarrer.sh : aucun n'est écrit dans le dépôt.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { lireVariable } from '../src/configuration/variables';

const FICHIER_ENV = join(__dirname, '../../../tests/environnement/.env');

export function chargerEnvironnementDeTest(): void {
  if (!existsSync(FICHIER_ENV)) {
    throw new Error("Environnement de test absent : lancer d'abord tests/environnement/demarrer.sh");
  }
  process.loadEnvFile(FICHIER_ENV);
}

/** Réglages d'accès d'un service à sa base et au broker, tels que demarrer.sh les a créés. */
export function variablesDuService(service: 'annonces' | 'notifications'): Record<string, string> {
  const suffixe = service.toUpperCase();
  return {
    BDD_HOTE: '127.0.0.1',
    BDD_PORT: '5432',
    BDD_NOM: service,
    BDD_UTILISATEUR: service,
    BDD_MOT_DE_PASSE: lireVariable(`BDD_${suffixe}_MOT_DE_PASSE`),
    AMQP_HOTE: '127.0.0.1',
    AMQP_PORT: '5672',
    AMQP_UTILISATEUR: service,
    AMQP_MOT_DE_PASSE: lireVariable(`AMQP_${suffixe}_MOT_DE_PASSE`),
  };
}
