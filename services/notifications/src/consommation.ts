import type { INestApplication } from '@nestjs/common';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { urlBroker, type Reglages } from '@epouvante/socle';
import { CLE_ANNONCE_PUBLIEE, EXCHANGE_ANNONCES } from './domaine/evenement-annonce-publiee';

/** File durable du service, liée à l'exchange « annonces » par la clé « annonce.publiee » (fiche 0007). */
export const FILE_ANNONCE_PUBLIEE = 'notifications.annonce-publiee';

/**
 * Le transport de NestJS attend des messages enveloppés dans { pattern, data }.
 * Les nôtres portent l'événement seul, conforme au contrat : ce désérialiseur fait le lien.
 * La file ne reçoit que cet événement : c'est sa liaison à l'exchange qui le garantit.
 */
export const deserialiseurContrat = {
  deserialize: (brut: unknown): { pattern: string; data: unknown } => ({ pattern: CLE_ANNONCE_PUBLIEE, data: brut }),
};

export function optionsConsommateur(reglages: Reglages): MicroserviceOptions {
  return {
    transport: Transport.RMQ,
    options: {
      urls: [urlBroker(reglages.broker)],
      queue: FILE_ANNONCE_PUBLIEE,
      // Durable : la file et ses messages survivent à un redémarrage du broker.
      // La file des messages en échec est réglée côté broker, par une règle (fiche 0007).
      queueOptions: { durable: true },
      exchange: EXCHANGE_ANNONCES,
      exchangeType: 'topic',
      // Lie la file à l'exchange avec la clé de chaque gestionnaire d'événement.
      wildcards: true,
      // Accusé de réception manuel : par défaut, le transport de NestJS n'en attend pas.
      noAck: false,
      // Au plus dix messages remis et non accusés à la fois par pod.
      prefetchCount: 10,
      deserializer: deserialiseurContrat,
    },
  };
}

/** Branche le consommateur de messages sur l'application HTTP : un seul processus sert les deux entrées. */
export async function brancherConsommateur(app: INestApplication, reglages: Reglages): Promise<void> {
  app.connectMicroservice<MicroserviceOptions>(optionsConsommateur(reglages));
  await app.startAllMicroservices();
}
