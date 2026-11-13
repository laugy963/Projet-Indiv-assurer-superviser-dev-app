import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { destinataires } from '../domaine/correspondance';
import type { EvenementAnnoncePubliee } from '../domaine/evenement-annonce-publiee';
import { DepotCentresInteret, DepotNotifications } from '../domaine/ports';

/** Cas d'usage de l'US-04 : à la réception d'un événement, créer les notifications des membres intéressés. */
@Injectable()
export class NotifierMembresInteresses {
  constructor(
    private readonly centresInteret: DepotCentresInteret,
    private readonly notifications: DepotNotifications,
  ) {}

  /** Rend le nombre de membres concernés. Rejouer le même événement ne crée aucun doublon. */
  async executer(evenement: EvenementAnnoncePubliee): Promise<number> {
    const { annonceId, titre, categorie, typeAnnonce, auteurId } = evenement.donnees;
    const membres = destinataires(auteurId, await this.centresInteret.membresInteressesPar(categorie));
    const creeeLe = new Date();

    await this.notifications.ajouter(
      membres.map((membreId) => ({ id: randomUUID(), membreId, annonceId, titreAnnonce: titre, categorie, typeAnnonce, creeeLe })),
    );
    return membres.length;
  }
}
