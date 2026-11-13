import 'reflect-metadata';
import { demarrerService, lireReglages } from '@epouvante/socle';
import { brancherConsommateur } from './consommation';
import { NotificationsModule } from './notifications.module';

async function principal(): Promise<void> {
  const reglages = lireReglages();
  // Un seul processus sert les deux entrées du service : l'API HTTP et les messages du broker.
  await demarrerService(NotificationsModule.configurer(reglages), reglages, (app) => brancherConsommateur(app, reglages));
}

principal().catch((erreur: unknown) => {
  console.error(JSON.stringify({ etat: 'demarrage-en-echec', message: erreur instanceof Error ? erreur.message : String(erreur) }));
  process.exit(1);
});
