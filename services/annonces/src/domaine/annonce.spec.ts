import { Annonce, AnnonceInvalide, CATEGORIES, type ContenuAnnonce } from './annonce';

const ID = 'c1d2e3f4-a5b6-4789-8abc-def012345678';
const AUTEUR = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const DATE = new Date('2027-02-01T10:15:30Z');
const CONTENU: ContenuAnnonce = {
  titre: 'Figurine Evil Ed, édition limitée',
  description: 'Figurine en résine de 20 cm.',
  categorie: 'figurines',
  type: 'don',
};

describe('Annonce', () => {
  describe('publier', () => {
    it('crée une annonce au statut « publiée », avec son auteur et sa date', () => {
      const annonce = Annonce.publier(ID, CONTENU, AUTEUR, DATE);

      expect(annonce).toMatchObject({ id: ID, ...CONTENU, statut: 'publiee', auteurId: AUTEUR, publieeLe: DATE });
      expect(annonce.retireeLe).toBeUndefined();
      expect(annonce.retireePar).toBeUndefined();
    });

    it('accepte les six catégories de la liste fermée', () => {
      expect(CATEGORIES).toEqual(['figurines', 'jeux-de-societe', 'bd', 'dvd-blu-ray', 'fanzines', 'autres']);
      for (const categorie of CATEGORIES) {
        expect(Annonce.publier(ID, { ...CONTENU, categorie }, AUTEUR, DATE).categorie).toBe(categorie);
      }
    });

    it.each([
      ['titre de 3 caractères', { titre: 'abc' }],
      ['titre de 100 caractères', { titre: 'a'.repeat(100) }],
      ['description de 10 caractères', { description: 'a'.repeat(10) }],
      ['description de 2 000 caractères', { description: 'a'.repeat(2000) }],
    ])('accepte une valeur à la limite : %s', (_cas, modification) => {
      expect(() => Annonce.publier(ID, { ...CONTENU, ...modification }, AUTEUR, DATE)).not.toThrow();
    });

    it.each([
      ['titre de 2 caractères', { titre: 'ab' }, 'titre'],
      ['titre de 101 caractères', { titre: 'a'.repeat(101) }, 'titre'],
      ['description de 9 caractères', { description: 'a'.repeat(9) }, 'description'],
      ['description de 2 001 caractères', { description: 'a'.repeat(2001) }, 'description'],
      ['catégorie hors liste', { categorie: 'voitures' }, 'categorie'],
      ['type hors liste', { type: 'vente' }, 'type'],
    ])('refuse une annonce invalide : %s', (_cas, modification, champ) => {
      const publier = () => Annonce.publier(ID, { ...CONTENU, ...modification } as ContenuAnnonce, AUTEUR, DATE);

      expect(publier).toThrow(AnnonceInvalide);
      expect(publier).toThrow(expect.objectContaining({ champ }));
    });
  });
});
