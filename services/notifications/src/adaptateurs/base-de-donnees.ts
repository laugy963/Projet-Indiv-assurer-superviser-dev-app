import type { Reglages } from '@epouvante/socle';
import type { DataSourceOptions } from 'typeorm';
import { CreerNotifications1763000000000 } from '../migrations/1763000000000-creer-notifications';
import { CentreInteretEntite, NotificationEntite } from './entites';

/** Réglages de TypeORM, partagés par le service et par le programme de migration. */
export function optionsBaseDeDonnees(bdd: Reglages['bdd']): DataSourceOptions {
  return {
    type: 'postgres',
    host: bdd.hote,
    port: bdd.port,
    database: bdd.nom,
    username: bdd.utilisateur,
    password: bdd.motDePasse,
    entities: [CentreInteretEntite, NotificationEntite],
    migrations: [CreerNotifications1763000000000],
    // Le schéma n'évolue que par les migrations versionnées (fiche 0008).
    synchronize: false,
    migrationsRun: false,
  };
}
