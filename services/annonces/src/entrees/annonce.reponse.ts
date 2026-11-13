import type { Annonce } from '../domaine/annonce';

/** Représentation d'une annonce dans les réponses de l'API. */
export interface AnnonceReponse {
  id: string;
  titre: string;
  description: string;
  categorie: string;
  type: string;
  statut: string;
  auteurId: string;
  publieeLe: string;
}

export function versReponse(annonce: Annonce): AnnonceReponse {
  return {
    id: annonce.id,
    titre: annonce.titre,
    description: annonce.description,
    categorie: annonce.categorie,
    type: annonce.type,
    statut: annonce.statut,
    auteurId: annonce.auteurId,
    publieeLe: annonce.publieeLe.toISOString(),
  };
}

export interface PageAnnoncesReponse {
  annonces: AnnonceReponse[];
  page: number;
  taillePage: number;
  total: number;
}
