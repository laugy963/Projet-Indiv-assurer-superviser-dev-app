import type { Annonce } from '../../src/domaine/annonce';
import { DepotAnnonces, type PageAnnonces } from '../../src/domaine/ports';

/** Double de test du dépôt : garde les annonces en mémoire et note l'ordre des appels. */
export class DepotEnMemoire extends DepotAnnonces {
  readonly annonces: Annonce[] = [];
  readonly appels: string[];

  constructor(appels: string[] = []) {
    super();
    this.appels = appels;
  }

  async enregistrer(annonce: Annonce): Promise<void> {
    this.appels.push('enregistrer');
    if (!this.annonces.includes(annonce)) this.annonces.push(annonce);
  }

  async trouver(id: string): Promise<Annonce | undefined> {
    return this.annonces.find((annonce) => annonce.id === id);
  }

  async listerPubliees(page: number, taille: number): Promise<PageAnnonces> {
    this.appels.push(`listerPubliees(${page}, ${taille})`);
    const publiees = this.annonces.filter((annonce) => annonce.statut === 'publiee');
    return { annonces: publiees.slice((page - 1) * taille, page * taille), total: publiees.length };
  }
}
