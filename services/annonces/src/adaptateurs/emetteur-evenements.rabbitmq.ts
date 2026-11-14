import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import type { EvenementAnnoncePubliee } from '../domaine/evenements';
import { EmetteurEvenements } from '../domaine/ports';

export const CLIENT_BROKER = 'CLIENT_BROKER';

/** Délai laissé au broker pour confirmer. Au-delà, la publication de l'annonce n'attend plus. */
const DELAI_CONFIRMATION_MS = 3000;

/**
 * Adaptateur RabbitMQ : publie l'événement sur l'exchange « annonces », avec son type pour clé de routage.
 * Le transport de NestJS (fiche 0007) publie sur un canal à confirmation : emettre() ne rend la main
 * qu'une fois le message accepté par le broker.
 */
@Injectable()
export class EmetteurEvenementsRabbitMq extends EmetteurEvenements {
  constructor(@Inject(CLIENT_BROKER) private readonly client: ClientProxy) {
    super();
  }

  async emettre(evenement: EvenementAnnoncePubliee): Promise<void> {
    await lastValueFrom(this.client.emit(evenement.type, evenement).pipe(timeout(DELAI_CONFIRMATION_MS)));
  }
}

/**
 * Le transport de NestJS enveloppe par défaut chaque message dans { pattern, data }.
 * Ce sérialiseur écrit l'événement seul : le message respecte le contrat, lisible par un abonné non NestJS.
 */
export const serialiseurContrat = {
  serialize: (paquet: { data: unknown }): unknown => paquet.data,
};
