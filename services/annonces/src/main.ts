import 'reflect-metadata';
import { demarrerService, lireReglages } from '@epouvante/socle';
import { AnnoncesModule } from './annonces.module';

async function principal(): Promise<void> {
  const reglages = lireReglages();
  await demarrerService(AnnoncesModule.configurer(reglages), reglages);
}

principal().catch((erreur: unknown) => {
  console.error(JSON.stringify({ etat: 'demarrage-en-echec', message: erreur instanceof Error ? erreur.message : String(erreur) }));
  process.exit(1);
});
