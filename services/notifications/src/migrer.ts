import 'reflect-metadata';
import { executerMigrations, lireReglages } from '@epouvante/socle';
import { optionsBaseDeDonnees } from './adaptateurs/base-de-donnees';

// Programme de migration : lancé avant le service, il crée ou met à jour le schéma, puis s'arrête.
executerMigrations(optionsBaseDeDonnees(lireReglages().bdd)).then(
  (jouees) => console.log(JSON.stringify({ etat: 'migrations-jouees', migrations: jouees })),
  (erreur: unknown) => {
    console.error(JSON.stringify({ etat: 'migration-en-echec', message: erreur instanceof Error ? erreur.message : String(erreur) }));
    process.exit(1);
  },
);
