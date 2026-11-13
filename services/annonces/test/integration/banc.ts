// Banc de test d'intégration du service annonces :
// le service complet (module NestJS réel), sa vraie base PostgreSQL, le vrai broker RabbitMQ,
// et un émetteur de jetons de test à la place de Keycloak (fiche 0013).
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EmetteurDeTest, SondeBroker, variablesDuService } from '@epouvante/socle/outils-de-test';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AnnoncesModule } from '../../src/annonces.module';
import { lireReglages } from '../../src/reglages';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const ANNONCE_VALIDE = {
  titre: 'Figurine Evil Ed, édition limitée',
  description: 'Figurine en résine de 20 cm, dans sa boîte d’origine.',
  categorie: 'figurines',
  type: 'don',
};

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
  const emetteur = await EmetteurDeTest.demarrer();
  const reglages = lireReglages({
    ...variablesDuService('annonces'),
    PORT: '0',
    OIDC_EMETTEUR: emetteur.emetteur,
    OIDC_URL_CLES: emetteur.urlCles,
    OIDC_AUDIENCE: emetteur.audience,
  });

  const module = await Test.createTestingModule({ imports: [AnnoncesModule.configurer(reglages)] }).compile();
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
  await bdd.query('TRUNCATE TABLE annonces');
}

/** Contenu complet de la table, pour vérifier qu'une requête refusée n'a rien modifié. */
export function contenuDeLaTable(bdd: DataSource): Promise<unknown[]> {
  return bdd.query('SELECT * FROM annonces ORDER BY id');
}
