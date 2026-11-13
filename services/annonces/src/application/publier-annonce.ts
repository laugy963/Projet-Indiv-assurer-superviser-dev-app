import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { Annonce, type ContenuAnnonce } from '../domaine/annonce';
import { annoncePubliee } from '../domaine/evenements';
import { DepotAnnonces, EmetteurEvenements } from '../domaine/ports';

/** Cas d'usage de l'US-01 : publier une annonce, puis prévenir les autres services par un événement. */
@Injectable()
export class PublierAnnonce {
  private readonly journal = new Logger(PublierAnnonce.name);

  constructor(
    private readonly depot: DepotAnnonces,
    private readonly emetteur: EmetteurEvenements,
  ) {}

  async executer(contenu: ContenuAnnonce, auteurId: string): Promise<Annonce> {
    const annonce = Annonce.publier(randomUUID(), contenu, auteurId, new Date());
    await this.depot.enregistrer(annonce);

    // L'événement part après l'enregistrement. Si le broker est injoignable à cet instant, l'annonce existe
    // sans événement : limite connue du prototype, la cible est le motif « outbox » (architecture, paragraphe 12).
    try {
      await this.emetteur.emettre(annoncePubliee(randomUUID(), annonce));
    } catch (erreur) {
      this.journal.error(
        { etat: 'evenement-non-emis', annonceId: annonce.id },
        erreur instanceof Error ? erreur.stack : String(erreur),
      );
    }
    return annonce;
  }
}
