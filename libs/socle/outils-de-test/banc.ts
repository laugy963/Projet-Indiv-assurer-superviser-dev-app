// Banc de test d'intégration, commun aux deux services :
// le service complet (son module NestJS réel), sa vraie base PostgreSQL, le vrai broker RabbitMQ,
// et un émetteur de jetons de test à la place de Keycloak (fiche 0013).
import type { DynamicModule, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { lireReglages, type Reglages } from '../src/configuration/reglages';
import { EmetteurDeTest } from './emetteur-de-test';
import { variablesDuService } from './environnement';
import { SondeBroker } from './sonde-broker';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface Banc {
  app: INestApplication;
  emetteur: EmetteurDeTest;
  sonde: SondeBroker;
  bdd: DataSource;
  /** Client HTTP branché sur le service (Supertest). */
  http(): ReturnType<typeof request>;
  arreter(): Promise<void>;
}

export interface ServiceSousTest {
  service: 'annonces' | 'notifications';
  module: (reglages: Reglages) => DynamicModule;
  /** Branchement propre au service, fait aussi par son main.ts : par exemple le consommateur de messages. */
  brancher?: (app: INestApplication, reglages: Reglages) => Promise<void>;
}

/** File du service notifications : c'est elle que lirait un service resté en marche à côté des tests. */
const FILE_DES_NOTIFICATIONS = 'notifications.annonce-publiee';

/**
 * Les tests d'intégration partagent PostgreSQL et RabbitMQ avec l'environnement d'acceptation.
 * Si ses services tournent encore, ils consomment les événements des tests à la place du service testé :
 * les tests échoueraient au hasard. Mieux vaut un refus immédiat, avec la marche à suivre.
 */
async function refuserUnServiceDejaEnMarche(): Promise<void> {
  const sonde = await SondeBroker.connecter();
  try {
    if ((await sonde.consommateurs(FILE_DES_NOTIFICATIONS)) > 0) {
      throw new Error(
        'Un service notifications lit déjà la file du broker : les services de l’environnement d’acceptation ' +
          'tournent encore. Lancer « npm run env:integration », qui les arrête, puis relancer les tests.',
      );
    }
  } finally {
    await sonde.fermer();
  }
}

export async function demarrerBanc(sousTest: ServiceSousTest): Promise<Banc> {
  const acces = variablesDuService(sousTest.service);
  await refuserUnServiceDejaEnMarche();
  const emetteur = await EmetteurDeTest.demarrer();
  const reglages = lireReglages({
    ...acces,
    PORT: '0',
    OIDC_EMETTEUR: emetteur.emetteur,
    OIDC_URL_CLES: emetteur.urlCles,
    OIDC_AUDIENCE: emetteur.audience,
  });

  const module = await Test.createTestingModule({ imports: [sousTest.module(reglages)] }).compile();
  const app = module.createNestApplication();
  await app.init();

  // Les migrations versionnées créent le schéma, comme au déploiement.
  const bdd = app.get(DataSource);
  await bdd.runMigrations();
  if (sousTest.brancher) await sousTest.brancher(app, reglages);
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
