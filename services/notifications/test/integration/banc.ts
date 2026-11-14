// Banc de test d'intégration du service notifications : le banc commun, plus les aides propres à ses tables.
import { randomUUID } from 'node:crypto';
import { demarrerBanc as demarrerBancCommun, SondeBroker, type Banc } from '@epouvante/socle/outils-de-test';
import type { DataSource } from 'typeorm';
import { brancherConsommateur, FILE_ANNONCE_PUBLIEE } from '../../src/consommation';
import { NotificationsModule } from '../../src/notifications.module';

export { UUID, type Banc } from '@epouvante/socle/outils-de-test';

export const MEMBRE_A = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
export const MEMBRE_B = '2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d';
export const MEMBRE_C = '3c4d5e6f-7081-4b2c-8d3e-4f5a6b7c8d9e';

export const FILE = FILE_ANNONCE_PUBLIEE;
export const FILE_ECHECS = `${FILE_ANNONCE_PUBLIEE}.echecs`;

export function demarrerBanc(): Promise<Banc> {
  return demarrerBancCommun({
    service: 'notifications',
    module: (reglages) => NotificationsModule.configurer(reglages),
    brancher: async (app, reglages) => {
      // Les tests d'intégration du service annonces ont pu laisser des événements dans la file :
      // elle est vidée avant que le service ne commence à la lire.
      const sonde = await SondeBroker.connecter();
      await sonde.vider(FILE);
      await sonde.fermer();
      await brancherConsommateur(app, reglages);
    },
  });
}

export async function viderLaBase(bdd: DataSource): Promise<void> {
  await bdd.query('TRUNCATE TABLE centres_interet, notifications');
}

/** Contenu complet des deux tables, pour vérifier qu'une requête refusée n'a rien modifié. */
export async function contenuDesTables(bdd: DataSource): Promise<unknown> {
  return {
    centresInteret: await bdd.query('SELECT * FROM centres_interet ORDER BY membre_id, categorie'),
    notifications: await bdd.query('SELECT * FROM notifications ORDER BY id'),
  };
}

/** Écrit des centres d'intérêt directement dans la table : met en place l'« étant donné » d'un test. */
export async function insererCentresInteret(bdd: DataSource, membreId: string, categories: string[]): Promise<void> {
  for (const categorie of categories) {
    await bdd.query('INSERT INTO centres_interet (membre_id, categorie) VALUES ($1, $2)', [membreId, categorie]);
  }
}

export interface NotificationEnBase {
  membreId: string;
  annonceId?: string;
  titre?: string;
  categorie?: string;
  typeAnnonce?: string;
  /** Minutes écoulées depuis la création : plus le nombre est grand, plus la notification est ancienne. */
  ilYaMinutes?: number;
}

export async function insererNotification(bdd: DataSource, notification: NotificationEnBase): Promise<string> {
  const id = randomUUID();
  await bdd.query(
    `INSERT INTO notifications (id, membre_id, annonce_id, titre_annonce, categorie, type_annonce, creee_le)
     VALUES ($1, $2, $3, $4, $5, $6, now() - ($7 * interval '1 minute'))`,
    [
      id,
      notification.membreId,
      notification.annonceId ?? randomUUID(),
      notification.titre ?? 'Annonce de test',
      notification.categorie ?? 'figurines',
      notification.typeAnnonce ?? 'don',
      notification.ilYaMinutes ?? 0,
    ],
  );
  return id;
}
