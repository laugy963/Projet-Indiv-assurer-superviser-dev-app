import { CentresInteretEnMemoire } from '../../test/doubles/depots-en-memoire';
import { CategorieInconnue } from '../domaine/centres-interet';
import { DefinirCentresInteret, LireCentresInteret } from './centres-interet';

const MEMBRE = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

describe('DefinirCentresInteret et LireCentresInteret (US-02)', () => {
  let depot: CentresInteretEnMemoire;
  let definir: DefinirCentresInteret;
  let lire: LireCentresInteret;

  beforeEach(() => {
    depot = new CentresInteretEnMemoire();
    definir = new DefinirCentresInteret(depot);
    lire = new LireCentresInteret(depot);
  });

  it('remplace la liste du membre et rend la liste enregistrée', async () => {
    await definir.executer(MEMBRE, ['figurines', 'bd']);

    expect(await definir.executer(MEMBRE, ['fanzines'])).toEqual(['fanzines']);
    expect(await lire.executer(MEMBRE)).toEqual(['fanzines']);
  });

  it('ne modifie rien quand une catégorie est inconnue', async () => {
    await definir.executer(MEMBRE, ['figurines']);

    await expect(definir.executer(MEMBRE, ['bd', 'voitures'])).rejects.toBeInstanceOf(CategorieInconnue);
    expect(await lire.executer(MEMBRE)).toEqual(['figurines']);
  });

  it('rend une liste vide pour un membre qui n’a rien choisi', async () => {
    expect(await lire.executer(MEMBRE)).toEqual([]);
  });
});
