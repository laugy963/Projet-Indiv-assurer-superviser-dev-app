import { Annonce } from '../domaine/annonce';
import { DepotEnMemoire } from '../../test/doubles/depot-en-memoire';
import { ListerAnnonces, TAILLE_DE_PAGE } from './lister-annonces';

const AUTEUR = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

function annonce(numero: number): Annonce {
  const id = `00000000-0000-4000-8000-${String(numero).padStart(12, '0')}`;
  const contenu = { titre: `Annonce ${numero}`, description: 'Une description valide.', categorie: 'bd', type: 'troc' } as const;
  return Annonce.publier(id, contenu, AUTEUR, new Date(Date.UTC(2027, 0, 1, 0, numero)));
}

describe('ListerAnnonces (US-05)', () => {
  let depot: DepotEnMemoire;
  let casDUsage: ListerAnnonces;

  beforeEach(() => {
    depot = new DepotEnMemoire();
    casDUsage = new ListerAnnonces(depot);
  });

  it('sert des pages de 20 annonces au plus', async () => {
    expect(TAILLE_DE_PAGE).toBe(20);
    for (let numero = 1; numero <= 25; numero++) await depot.enregistrer(annonce(numero));

    const premiere = await casDUsage.executer(1);
    const seconde = await casDUsage.executer(2);

    expect(premiere).toMatchObject({ page: 1, taillePage: 20, total: 25 });
    expect(premiere.annonces).toHaveLength(20);
    expect(seconde).toMatchObject({ page: 2, taillePage: 20, total: 25 });
    expect(seconde.annonces).toHaveLength(5);
  });

  it('ne demande au dépôt que les annonces publiées de la page', async () => {
    await casDUsage.executer(3);
    expect(depot.appels).toEqual(['listerPubliees(3, 20)']);
  });

  it('rend une page vide quand il n’y a aucune annonce', async () => {
    expect(await casDUsage.executer(1)).toEqual({ annonces: [], page: 1, taillePage: 20, total: 0 });
  });
});
