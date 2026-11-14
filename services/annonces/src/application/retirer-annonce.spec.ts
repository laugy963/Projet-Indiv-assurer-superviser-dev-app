import { Annonce } from '../domaine/annonce';
import { DepotEnMemoire } from '../../test/doubles/depot-en-memoire';
import { AnnonceIntrouvable, RetirerAnnonce } from './retirer-annonce';

const ID = 'c1d2e3f4-a5b6-4789-8abc-def012345678';
const AUTEUR = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const MODERATEUR = '5e4f3a2b-1c0d-4e9f-8a7b-6c5d4e3f2a1b';
const CONTENU = { titre: 'Figurine Evil Ed', description: 'Figurine en résine de 20 cm.', categorie: 'figurines', type: 'don' } as const;

describe('RetirerAnnonce (US-06)', () => {
  let depot: DepotEnMemoire;
  let casDUsage: RetirerAnnonce;

  beforeEach(async () => {
    depot = new DepotEnMemoire();
    casDUsage = new RetirerAnnonce(depot);
    await depot.enregistrer(Annonce.publier(ID, CONTENU, AUTEUR, new Date('2027-02-01T10:15:30Z')));
    depot.appels.length = 0;
  });

  it('retire une annonce publiée et enregistre la trace de la modération', async () => {
    const avant = Date.now();

    await casDUsage.executer(ID, MODERATEUR);

    const annonce = depot.annonces[0];
    expect(annonce).toMatchObject({ statut: 'retiree', retireePar: MODERATEUR });
    expect(annonce.retireeLe?.getTime()).toBeGreaterThanOrEqual(avant);
    expect(depot.appels).toEqual(['enregistrer']);
  });

  it('signale une annonce qui n’existe pas', async () => {
    await expect(casDUsage.executer('00000000-0000-4000-8000-000000000000', MODERATEUR)).rejects.toBeInstanceOf(AnnonceIntrouvable);
    expect(depot.appels).toEqual([]);
  });

  it('ne réécrit rien pour une annonce déjà retirée', async () => {
    await casDUsage.executer(ID, MODERATEUR);
    const premierRetrait = depot.annonces[0].retireeLe;
    depot.appels.length = 0;

    await casDUsage.executer(ID, '11111111-1111-4111-8111-111111111111');

    expect(depot.annonces[0]).toMatchObject({ retireePar: MODERATEUR, retireeLe: premierRetrait });
    expect(depot.appels).toEqual([]);
  });
});
