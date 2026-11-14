import { demarrerBanc, identifiant, insererAnnonce, viderLaBase, type Banc } from './banc';

// US-05 — En tant que membre, je veux consulter les annonces publiées.
describe('US-05 — Consulter les annonces publiées (GET /api/annonces)', () => {
  let banc: Banc;

  beforeAll(async () => {
    banc = await demarrerBanc();
  });

  afterAll(() => banc.arreter());

  beforeEach(() => viderLaBase(banc.bdd));

  async function lister(requete = '', roles = ['membre']) {
    return banc
      .http()
      .get(`/api/annonces${requete}`)
      .set('Authorization', `Bearer ${await banc.emetteur.jeton({ roles })}`);
  }

  it('CA-16 — seules les annonces publiées apparaissent, de la plus récente à la plus ancienne', async () => {
    await insererAnnonce(banc.bdd, { id: identifiant(1), titre: 'La plus ancienne', ilYaMinutes: 30 });
    await insererAnnonce(banc.bdd, { id: identifiant(2), titre: 'Retirée par un modérateur', ilYaMinutes: 20, statut: 'retiree' });
    await insererAnnonce(banc.bdd, { id: identifiant(3), titre: 'La plus récente', ilYaMinutes: 1, categorie: 'figurines', type: 'don' });
    await insererAnnonce(banc.bdd, { id: identifiant(4), titre: 'Entre les deux', ilYaMinutes: 10 });

    const reponse = await lister();

    expect(reponse.status).toBe(200);
    expect(reponse.body).toMatchObject({ page: 1, taillePage: 20, total: 3 });
    expect(reponse.body.annonces.map((a: { titre: string }) => a.titre)).toEqual(['La plus récente', 'Entre les deux', 'La plus ancienne']);
    expect(reponse.body.annonces[0]).toEqual({
      id: identifiant(3),
      titre: 'La plus récente',
      description: 'Une description valide.',
      categorie: 'figurines',
      type: 'don',
      statut: 'publiee',
      auteurId: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
      publieeLe: expect.any(String),
    });
  });

  it('CA-16 — un modérateur consulte aussi la liste', async () => {
    await insererAnnonce(banc.bdd, { id: identifiant(1) });

    const reponse = await lister('', ['moderateur']);

    expect(reponse.status).toBe(200);
    expect(reponse.body.annonces).toHaveLength(1);
  });

  it('CA-16 — la liste est servie par pages de 20 au plus', async () => {
    for (let numero = 1; numero <= 25; numero++) {
      await insererAnnonce(banc.bdd, { id: identifiant(numero), titre: `Annonce ${numero}`, ilYaMinutes: numero });
    }

    const premiere = await lister();
    const seconde = await lister('?page=2');
    const troisieme = await lister('?page=3');

    expect(premiere.body).toMatchObject({ page: 1, taillePage: 20, total: 25 });
    expect(premiere.body.annonces).toHaveLength(20);
    expect(premiere.body.annonces[0].titre).toBe('Annonce 1');
    expect(seconde.body).toMatchObject({ page: 2, taillePage: 20, total: 25 });
    expect(seconde.body.annonces.map((a: { titre: string }) => a.titre)).toEqual(['Annonce 21', 'Annonce 22', 'Annonce 23', 'Annonce 24', 'Annonce 25']);
    expect(troisieme.body.annonces).toEqual([]);
  });

  it.each([
    ['page nulle', '?page=0', 'page'],
    ['page négative', '?page=-1', 'page'],
    ['page qui n’est pas un nombre', '?page=abc', 'page'],
    ['page décimale', '?page=1.5', 'page'],
    ['taille de page choisie par le client', '?taille=1000', 'taille'],
  ])('CA-03 — %s : 400, le paramètre est nommé', async (_cas, requete, champ) => {
    const reponse = await lister(requete);

    expect(reponse.status).toBe(400);
    expect(reponse.body.message).toBe('Requête invalide');
    expect(reponse.body.champs.map((c: { champ: string }) => c.champ)).toEqual([champ]);
  });
});
