import { CATEGORIES, CategorieInconnue, centresInteret } from './centres-interet';

describe('centres d’intérêt', () => {
  it('la liste fermée des catégories est celle du contrat de l’événement', () => {
    expect(CATEGORIES).toEqual(['figurines', 'jeux-de-societe', 'bd', 'dvd-blu-ray', 'fanzines', 'autres']);
  });

  it('garde les catégories choisies, dans l’ordre de la liste de référence', () => {
    expect(centresInteret(['bd', 'figurines'])).toEqual(['figurines', 'bd']);
  });

  it('ne garde qu’une fois une catégorie répétée', () => {
    expect(centresInteret(['bd', 'bd', 'autres', 'bd'])).toEqual(['bd', 'autres']);
  });

  it('accepte une liste vide : le membre ne veut plus être notifié', () => {
    expect(centresInteret([])).toEqual([]);
  });

  it('refuse une catégorie hors de la liste fermée', () => {
    expect(() => centresInteret(['bd', 'voitures'])).toThrow(CategorieInconnue);
  });
});
