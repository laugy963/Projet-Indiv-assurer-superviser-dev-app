import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Categorie } from '../domaine/centres-interet';
import { DepotCentresInteret } from '../domaine/ports';
import { CentreInteretEntite } from './entites';

/** Adaptateur PostgreSQL des centres d'intérêt. Les requêtes de l'ORM sont paramétrées (risque R2). */
@Injectable()
export class DepotCentresInteretTypeOrm extends DepotCentresInteret {
  constructor(private readonly bdd: DataSource) {
    super();
  }

  async remplacer(membreId: string, categories: Categorie[]): Promise<void> {
    // Une transaction : la liste passe de l'ancienne à la nouvelle sans état intermédiaire visible.
    await this.bdd.transaction(async (transaction) => {
      await transaction.delete(CentreInteretEntite, { membreId });
      if (categories.length > 0) {
        await transaction.insert(
          CentreInteretEntite,
          categories.map((categorie) => ({ membreId, categorie })),
        );
      }
    });
  }

  async lire(membreId: string): Promise<Categorie[]> {
    const lignes = await this.bdd.getRepository(CentreInteretEntite).findBy({ membreId });
    return lignes.map((ligne) => ligne.categorie as Categorie);
  }

  async membresInteressesPar(categorie: Categorie): Promise<string[]> {
    const lignes = await this.bdd.getRepository(CentreInteretEntite).findBy({ categorie });
    return lignes.map((ligne) => ligne.membreId);
  }
}
