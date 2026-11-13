// Banc de test d'intégration du service notifications :
// le service complet (module NestJS réel), sa vraie base PostgreSQL, le vrai broker RabbitMQ,
// et un émetteur de jetons de test à la place de Keycloak (fiche 0013).
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EmetteurDeTest, SondeBroker, variablesDuService } from '@epouvante/socle/outils-de-test';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { NotificationsModule } from '../../src/notifications.module';
import { lireReglages } from '../../src/reglages';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const MEMBRE_A = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
export const MEMBRE_B = '2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d';
export const MEMBRE_C = '3c4d5e6f-7081-4b2c-8d3e-4f5a6b7c8d9e';

export interface Banc {
  app: INestApplication;
  emetteur: EmetteurDeTest;
  sonde: SondeBroker;
  bdd: DataSource;
  /** Client HTTP branché sur le service (Supertest). */
  http(): ReturnType<typeof request>;
  arreter(): Promise<void>;
}

export async function demarrerBanc(): Promise<Banc> {
  const acces = variablesDuService('notifications');
  const emetteur = await EmetteurDeTest.demarrer();
  const reglages = lireReglages({
    ...acces,
    PORT: '0',
    OIDC_EMETTEUR: emetteur.emetteur,
    OIDC_URL_CLES: emetteur.urlCles,
    OIDC_AUDIENCE: emetteur.audience,
  });

  const module = await Test.createTestingModule({ imports: [NotificationsModule.configurer(reglages)] }).compile();
  const app = module.createNestApplication();
  await app.init();

  const bdd = app.get(DataSource);
  await bdd.runMigrations();
  const sonde = await SondeBroker.connecter();

  return {
    app,
    emetteur,
    sonde,
    bdd,
    http: () => request(app.getHttpServer()),
    arreter: async () => {
      await sonde.fermer();
      await app.close();
      await emetteur.arreter();
    },
  };
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
