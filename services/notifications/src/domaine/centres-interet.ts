// Domaine du service notifications. Aucune dépendance vers NestJS, SQL ou AMQP.

/**
 * Liste fermée des catégories (hypothèse H2 du backlog).
 * Chaque service en garde sa copie : elle fait partie du contrat de l'événement, pas d'un code partagé.
 */
export const CATEGORIES = ['figurines', 'jeux-de-societe', 'bd', 'dvd-blu-ray', 'fanzines', 'autres'] as const;
export type Categorie = (typeof CATEGORIES)[number];

export const TYPES_ANNONCE = ['troc', 'don'] as const;
export type TypeAnnonce = (typeof TYPES_ANNONCE)[number];

export class CategorieInconnue extends Error {
  constructor(readonly categorie: string) {
    super('Catégorie inconnue');
    this.name = 'CategorieInconnue';
  }
}

export function estUneCategorie(valeur: unknown): valeur is Categorie {
  return CATEGORIES.includes(valeur as Categorie);
}

/**
 * Les centres d'intérêt d'un membre : des catégories de la liste fermée, chacune une seule fois,
 * dans l'ordre de la liste de référence. Une liste vide est permise : le membre ne veut plus être notifié.
 */
export function centresInteret(categories: readonly string[]): Categorie[] {
  const inconnue = categories.find((categorie) => !estUneCategorie(categorie));
  if (inconnue !== undefined) throw new CategorieInconnue(inconnue);
  return CATEGORIES.filter((categorie) => categories.includes(categorie));
}
