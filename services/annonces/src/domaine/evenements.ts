import type { Annonce, Categorie, TypeAnnonce } from './annonce';

export const EXCHANGE_ANNONCES = 'annonces';
export const CLE_ANNONCE_PUBLIEE = 'annonce.publiee';

/**
 * Contrat de l'événement « annonce.publiee », version 1 (architecture, paragraphe 6.2).
 * Il porte tout ce dont un abonné a besoin, et aucune donnée personnelle hors l'identifiant technique de l'auteur.
 * Tout changement de ce format est vérifié par le test du critère CA-06.
 */
export interface EvenementAnnoncePubliee {
  /** Identifiant de l'événement, distinct de celui de l'annonce. */
  id: string;
  type: typeof CLE_ANNONCE_PUBLIEE;
  version: 1;
  /** Date de publication, au format ISO 8601, en temps universel. */
  date: string;
  donnees: {
    annonceId: string;
    titre: string;
    categorie: Categorie;
    typeAnnonce: TypeAnnonce;
    auteurId: string;
  };
}

export function annoncePubliee(idEvenement: string, annonce: Annonce): EvenementAnnoncePubliee {
  return {
    id: idEvenement,
    type: CLE_ANNONCE_PUBLIEE,
    version: 1,
    date: annonce.publieeLe.toISOString(),
    donnees: {
      annonceId: annonce.id,
      titre: annonce.titre,
      categorie: annonce.categorie,
      typeAnnonce: annonce.type,
      auteurId: annonce.auteurId,
    },
  };
}
