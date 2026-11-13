import type { Annonce } from './annonce';
import type { EvenementAnnoncePubliee } from './evenements';

// Ports : ce dont les cas d'usage ont besoin, sans dire comment c'est fait.
// Les adaptateurs (PostgreSQL, RabbitMQ) les réalisent ; les tests unitaires les remplacent par des doubles.
// Ce sont des classes abstraites, et non des interfaces, pour servir de jeton d'injection à NestJS.

export abstract class DepotAnnonces {
  abstract enregistrer(annonce: Annonce): Promise<void>;
}

export abstract class EmetteurEvenements {
  /** Rend la main quand le broker a confirmé la réception de l'événement. */
  abstract emettre(evenement: EvenementAnnoncePubliee): Promise<void>;
}
