import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Annonce, type Categorie, type Statut, type TypeAnnonce } from '../domaine/annonce';
import { DepotAnnonces, type PageAnnonces } from '../domaine/ports';
import { AnnonceEntite } from './annonce.entite';

/** Adaptateur PostgreSQL du dépôt d'annonces. Les requêtes de l'ORM sont paramétrées (risque R2). */
@Injectable()
export class DepotAnnoncesTypeOrm extends DepotAnnonces {
  constructor(@InjectRepository(AnnonceEntite) private readonly table: Repository<AnnonceEntite>) {
    super();
  }

  async enregistrer(annonce: Annonce): Promise<void> {
    await this.table.save(versEntite(annonce));
  }

  async trouver(id: string): Promise<Annonce | undefined> {
    const entite = await this.table.findOneBy({ id });
    return entite ? versDomaine(entite) : undefined;
  }

  async listerPubliees(page: number, taille: number): Promise<PageAnnonces> {
    const [entites, total] = await this.table.findAndCount({
      where: { statut: 'publiee' },
      // L'identifiant départage deux annonces publiées au même instant : l'ordre des pages est stable.
      order: { publieeLe: 'DESC', id: 'ASC' },
      skip: (page - 1) * taille,
      take: taille,
    });
    return { annonces: entites.map(versDomaine), total };
  }
}

export function versEntite(annonce: Annonce): AnnonceEntite {
  const entite = new AnnonceEntite();
  entite.id = annonce.id;
  entite.titre = annonce.titre;
  entite.description = annonce.description;
  entite.categorie = annonce.categorie;
  entite.type = annonce.type;
  entite.statut = annonce.statut;
  entite.auteurId = annonce.auteurId;
  entite.publieeLe = annonce.publieeLe;
  entite.retireeLe = annonce.retireeLe ?? null;
  entite.retireePar = annonce.retireePar ?? null;
  return entite;
}

export function versDomaine(entite: AnnonceEntite): Annonce {
  return Annonce.reconstituer({
    id: entite.id,
    titre: entite.titre,
    description: entite.description,
    categorie: entite.categorie as Categorie,
    type: entite.type as TypeAnnonce,
    statut: entite.statut as Statut,
    auteurId: entite.auteurId,
    publieeLe: entite.publieeLe,
    retireeLe: entite.retireeLe ?? undefined,
    retireePar: entite.retireePar ?? undefined,
  });
}
