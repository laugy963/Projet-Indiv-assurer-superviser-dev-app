import { Injectable } from '@nestjs/common';
import { DepotAnnonces } from '../domaine/ports';

export class AnnonceIntrouvable extends Error {
  constructor() {
    super('Annonce introuvable');
    this.name = 'AnnonceIntrouvable';
  }
}

/** Cas d'usage de l'US-06 : un modérateur retire une annonce. */
@Injectable()
export class RetirerAnnonce {
  constructor(private readonly depot: DepotAnnonces) {}

  async executer(annonceId: string, moderateurId: string): Promise<void> {
    const annonce = await this.depot.trouver(annonceId);
    if (!annonce) throw new AnnonceIntrouvable();
    // Déjà retirée : rien à écrire, la première trace est conservée.
    if (annonce.retirer(moderateurId, new Date())) await this.depot.enregistrer(annonce);
  }
}
