import { Injectable } from '@nestjs/common';
import type { Annonce } from '../domaine/annonce';
import { DepotAnnonces } from '../domaine/ports';

/** La taille de page est fixée par le service, jamais par le client : une liste ne peut pas saturer le service (risque R8). */
export const TAILLE_DE_PAGE = 20;

export interface PageDAnnonces {
  annonces: Annonce[];
  page: number;
  taillePage: number;
  total: number;
}

/** Cas d'usage de l'US-05 : consulter les annonces publiées, page par page. */
@Injectable()
export class ListerAnnonces {
  constructor(private readonly depot: DepotAnnonces) {}

  async executer(page: number): Promise<PageDAnnonces> {
    const { annonces, total } = await this.depot.listerPubliees(page, TAILLE_DE_PAGE);
    return { annonces, page, taillePage: TAILLE_DE_PAGE, total };
  }
}
