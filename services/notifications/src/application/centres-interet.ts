import { Injectable } from '@nestjs/common';
import { centresInteret, type Categorie } from '../domaine/centres-interet';
import { DepotCentresInteret } from '../domaine/ports';

/** Cas d'usage de l'US-02 : la nouvelle liste remplace l'ancienne. */
@Injectable()
export class DefinirCentresInteret {
  constructor(private readonly depot: DepotCentresInteret) {}

  async executer(membreId: string, categories: readonly string[]): Promise<Categorie[]> {
    // La liste est vérifiée avant toute écriture : une catégorie inconnue laisse l'ancienne liste intacte.
    const liste = centresInteret(categories);
    await this.depot.remplacer(membreId, liste);
    return liste;
  }
}

@Injectable()
export class LireCentresInteret {
  constructor(private readonly depot: DepotCentresInteret) {}

  async executer(membreId: string): Promise<Categorie[]> {
    return centresInteret(await this.depot.lire(membreId));
  }
}
