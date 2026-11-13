// Domaine du service annonces : les règles d'une annonce. Aucune dépendance vers NestJS, SQL ou AMQP.

/** Liste fermée des catégories (hypothèse H2 du backlog). Elle fait partie du contrat de l'événement. */
export const CATEGORIES = ['figurines', 'jeux-de-societe', 'bd', 'dvd-blu-ray', 'fanzines', 'autres'] as const;
export type Categorie = (typeof CATEGORIES)[number];

export const TYPES_ANNONCE = ['troc', 'don'] as const;
export type TypeAnnonce = (typeof TYPES_ANNONCE)[number];

export type Statut = 'publiee' | 'retiree';

/** Bornes de longueur (US-01). Le contrôleur les reprend pour valider l'entrée : une seule source. */
export const LONGUEURS = {
  titre: { min: 3, max: 100 },
  description: { min: 10, max: 2000 },
} as const;

export interface ContenuAnnonce {
  titre: string;
  description: string;
  categorie: Categorie;
  type: TypeAnnonce;
}

export interface EtatAnnonce extends ContenuAnnonce {
  id: string;
  statut: Statut;
  auteurId: string;
  publieeLe: Date;
  retireeLe?: Date;
  retireePar?: string;
}

export class AnnonceInvalide extends Error {
  constructor(readonly champ: keyof ContenuAnnonce) {
    super(`Annonce invalide : ${champ}`);
    this.name = 'AnnonceInvalide';
  }
}

export class Annonce implements EtatAnnonce {
  readonly id: string;
  readonly titre: string;
  readonly description: string;
  readonly categorie: Categorie;
  readonly type: TypeAnnonce;
  readonly auteurId: string;
  readonly publieeLe: Date;
  statut: Statut;
  retireeLe?: Date;
  retireePar?: string;

  private constructor(etat: EtatAnnonce) {
    this.id = etat.id;
    this.titre = etat.titre;
    this.description = etat.description;
    this.categorie = etat.categorie;
    this.type = etat.type;
    this.statut = etat.statut;
    this.auteurId = etat.auteurId;
    this.publieeLe = etat.publieeLe;
    this.retireeLe = etat.retireeLe;
    this.retireePar = etat.retireePar;
  }

  /** Une nouvelle annonce : toujours au statut « publiée », au nom de son auteur. */
  static publier(id: string, contenu: ContenuAnnonce, auteurId: string, date: Date): Annonce {
    verifier(contenu);
    return new Annonce({ id, ...contenu, statut: 'publiee', auteurId, publieeLe: date });
  }

  /** Une annonce relue depuis la base : déjà vérifiée à sa publication. */
  static reconstituer(etat: EtatAnnonce): Annonce {
    return new Annonce(etat);
  }
}

function verifier(contenu: ContenuAnnonce): void {
  if (!longueurDans(contenu.titre, LONGUEURS.titre)) throw new AnnonceInvalide('titre');
  if (!longueurDans(contenu.description, LONGUEURS.description)) throw new AnnonceInvalide('description');
  if (!CATEGORIES.includes(contenu.categorie)) throw new AnnonceInvalide('categorie');
  if (!TYPES_ANNONCE.includes(contenu.type)) throw new AnnonceInvalide('type');
}

function longueurDans(texte: string, bornes: { min: number; max: number }): boolean {
  return typeof texte === 'string' && texte.length >= bornes.min && texte.length <= bornes.max;
}
