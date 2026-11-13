import { ConsoleLogger, type DynamicModule, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource, type DataSourceOptions } from 'typeorm';
import type { Reglages } from './configuration/reglages';

/**
 * Démarre un service : le même enchaînement pour les deux.
 * « brancher » ajoute ce qui est propre au service, par exemple son consommateur de messages.
 */
export async function demarrerService(
  module: DynamicModule,
  reglages: Reglages,
  brancher?: (app: INestApplication) => Promise<void>,
): Promise<INestApplication> {
  // Journaux en JSON sur la sortie standard : une ligne par événement, lue avec « kubectl logs ».
  const app = await NestFactory.create(module, { logger: new ConsoleLogger({ json: true }) });

  // Arrêt propre au signal SIGTERM, envoyé par Kubernetes avant de supprimer un pod (règle du bac à sable) :
  // le serveur HTTP, le canal du broker et les connexions à la base sont fermés, puis le processus s'arrête.
  // Sans cela, Node.js ignore le signal et le pod met 30 secondes à disparaître.
  app.enableShutdownHooks();

  if (brancher) await brancher(app);
  await app.listen(reglages.port, '0.0.0.0');
  return app;
}

/**
 * Joue les migrations en attente, puis rend la main. Lancé avant le service à chaque déploiement (fiche 0008) :
 * le schéma n'est jamais modifié par le service en marche.
 */
export async function executerMigrations(options: DataSourceOptions): Promise<string[]> {
  const bdd = new DataSource(options);
  await bdd.initialize();
  try {
    const jouees = await bdd.runMigrations();
    return jouees.map((migration) => migration.name);
  } finally {
    await bdd.destroy();
  }
}
