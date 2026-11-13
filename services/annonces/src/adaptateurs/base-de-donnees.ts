import type { DataSourceOptions } from 'typeorm';
import { CreerAnnonces1763000000000 } from '../migrations/1763000000000-creer-annonces';
import type { Reglages } from '../reglages';
import { AnnonceEntite } from './annonce.entite';

/** Réglages de TypeORM, partagés par le service et par le programme de migration. */
export function optionsBaseDeDonnees(bdd: Reglages['bdd']): DataSourceOptions {
  return {
    type: 'postgres',
    host: bdd.hote,
    port: bdd.port,
    database: bdd.nom,
    username: bdd.utilisateur,
    password: bdd.motDePasse,
    entities: [AnnonceEntite],
    migrations: [CreerAnnonces1763000000000],
    // Le schéma n'évolue que par les migrations versionnées (fiche 0008).
    synchronize: false,
    migrationsRun: false,
  };
}
