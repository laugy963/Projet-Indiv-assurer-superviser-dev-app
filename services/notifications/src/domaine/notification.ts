import type { Categorie, TypeAnnonce } from './centres-interet';

/**
 * Une notification : un enregistrement que le membre consulte (hypothèse H3).
 * Elle garde une copie du titre de l'annonce : le service répond sans interroger le service annonces.
 */
export interface Notification {
  id: string;
  membreId: string;
  annonceId: string;
  titreAnnonce: string;
  categorie: Categorie;
  typeAnnonce: TypeAnnonce;
  creeeLe: Date;
}
