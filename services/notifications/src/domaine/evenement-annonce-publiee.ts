import { estUneCategorie, TYPES_ANNONCE, type Categorie, type TypeAnnonce } from './centres-interet';

export const EXCHANGE_ANNONCES = 'annonces';
export const CLE_ANNONCE_PUBLIEE = 'annonce.publiee';

/**
 * Contrat de l'événement « annonce.publiee », version 1 (architecture, paragraphe 6.2), vu par l'abonné.
 * Le service notifications ne partage aucun code avec le service annonces : il ne connaît que ce format.
 */
export interface EvenementAnnoncePubliee {
  id: string;
  type: typeof CLE_ANNONCE_PUBLIEE;
  version: 1;
  date: string;
  donnees: {
    annonceId: string;
    titre: string;
    categorie: Categorie;
    typeAnnonce: TypeAnnonce;
    auteurId: string;
  };
}

export class EvenementInvalide extends Error {
  constructor(readonly motif: string) {
    super(`Événement invalide : ${motif}`);
    this.name = 'EvenementInvalide';
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TITRE_MAX = 100;

/**
 * Vérifie qu'un message reçu respecte le contrat, et n'en garde que les champs prévus.
 * Un message du broker est une entrée comme une autre : il est validé avant d'être traité.
 */
export function lireEvenement(brut: unknown): EvenementAnnoncePubliee {
  if (!estUnObjet(brut)) throw new EvenementInvalide('contenu illisible');
  if (brut.type !== CLE_ANNONCE_PUBLIEE) throw new EvenementInvalide('type inattendu');
  if (brut.version !== 1) throw new EvenementInvalide('version inconnue');
  if (!estUnUuid(brut.id)) throw new EvenementInvalide('id');
  if (typeof brut.date !== 'string') throw new EvenementInvalide('date');

  const donnees = brut.donnees;
  if (!estUnObjet(donnees)) throw new EvenementInvalide('donnees');
  if (!estUnUuid(donnees.annonceId)) throw new EvenementInvalide('annonceId');
  if (!estUnUuid(donnees.auteurId)) throw new EvenementInvalide('auteurId');
  if (typeof donnees.titre !== 'string' || donnees.titre.length === 0 || donnees.titre.length > TITRE_MAX) {
    throw new EvenementInvalide('titre');
  }
  if (!estUneCategorie(donnees.categorie)) throw new EvenementInvalide('categorie');
  if (!TYPES_ANNONCE.includes(donnees.typeAnnonce as TypeAnnonce)) throw new EvenementInvalide('typeAnnonce');

  return {
    id: brut.id,
    type: CLE_ANNONCE_PUBLIEE,
    version: 1,
    date: brut.date,
    donnees: {
      annonceId: donnees.annonceId,
      titre: donnees.titre,
      categorie: donnees.categorie,
      typeAnnonce: donnees.typeAnnonce as TypeAnnonce,
      auteurId: donnees.auteurId,
    },
  };
}

function estUnObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null;
}

function estUnUuid(valeur: unknown): valeur is string {
  return typeof valeur === 'string' && UUID.test(valeur);
}
