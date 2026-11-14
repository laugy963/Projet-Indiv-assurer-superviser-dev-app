import { contenuDesTables, demarrerBanc, insererCentresInteret, MEMBRE_A, MEMBRE_B, viderLaBase, type Banc } from './banc';

// US-02 — En tant que membre, je veux choisir les catégories qui m'intéressent.
describe('US-02 — Déclarer mes centres d’intérêt (PUT et GET /api/centres-interet)', () => {
  let banc: Banc;

  beforeAll(async () => {
    banc = await demarrerBanc();
  });

  afterAll(() => banc.arreter());

  beforeEach(() => viderLaBase(banc.bdd));

  async function enregistrer(corps: unknown, membre = MEMBRE_A) {
    return banc
      .http()
      .put('/api/centres-interet')
      .set('Authorization', `Bearer ${await banc.emetteur.jetonMembre(membre)}`)
      .send(corps as object);
  }

  async function consulter(membre = MEMBRE_A) {
    return banc
      .http()
      .get('/api/centres-interet')
      .set('Authorization', `Bearer ${await banc.emetteur.jetonMembre(membre)}`);
  }

  it('CA-07 — un membre enregistre une liste valide : 200, et il la retrouve en la consultant', async () => {
    const reponse = await enregistrer({ categories: ['figurines', 'bd'] });

    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual({ categories: ['figurines', 'bd'] });
    const relue = await consulter();
    expect(relue.status).toBe(200);
    expect(relue.body).toEqual({ categories: ['figurines', 'bd'] });
  });

  it('CA-07 — la nouvelle liste remplace l’ancienne', async () => {
    await enregistrer({ categories: ['figurines', 'bd'] });

    const reponse = await enregistrer({ categories: ['fanzines'] });

    expect(reponse.status).toBe(200);
    expect((await consulter()).body).toEqual({ categories: ['fanzines'] });
    expect(await banc.bdd.query('SELECT categorie FROM centres_interet WHERE membre_id = $1', [MEMBRE_A])).toEqual([{ categorie: 'fanzines' }]);
  });

  it('CA-07 — une liste vide retire tous les centres d’intérêt', async () => {
    await enregistrer({ categories: ['figurines'] });

    const reponse = await enregistrer({ categories: [] });

    expect(reponse.status).toBe(200);
    expect((await consulter()).body).toEqual({ categories: [] });
  });

  it('CA-07 — un membre sans liste consulte une liste vide', async () => {
    const reponse = await consulter();
    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual({ categories: [] });
  });

  it('CA-07 — une catégorie répétée n’est enregistrée qu’une fois', async () => {
    const reponse = await enregistrer({ categories: ['bd', 'figurines', 'bd'] });

    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual({ categories: ['figurines', 'bd'] });
  });

  it('CA-07 — chaque membre a sa liste : l’identité vient du jeton', async () => {
    await enregistrer({ categories: ['figurines'] }, MEMBRE_A);
    await enregistrer({ categories: ['dvd-blu-ray', 'autres'] }, MEMBRE_B);

    expect((await consulter(MEMBRE_A)).body).toEqual({ categories: ['figurines'] });
    expect((await consulter(MEMBRE_B)).body).toEqual({ categories: ['dvd-blu-ray', 'autres'] });
  });

  it.each([
    ['une catégorie inconnue', { categories: ['bd', 'voitures'] }, 'categories'],
    ['une liste qui n’est pas un tableau', { categories: 'figurines' }, 'categories'],
    ['une liste absente', {}, 'categories'],
    ['un élément qui n’est pas un texte', { categories: [42] }, 'categories'],
    ['un champ non prévu : membre choisi par le client', { categories: ['bd'], membreId: MEMBRE_B }, 'membreId'],
  ])('CA-08 — %s : 400, l’ancienne liste est conservée', async (_cas, corps, champ) => {
    await insererCentresInteret(banc.bdd, MEMBRE_A, ['figurines']);
    await insererCentresInteret(banc.bdd, MEMBRE_B, ['fanzines']);
    const avant = await contenuDesTables(banc.bdd);

    const reponse = await enregistrer(corps);

    expect(reponse.status).toBe(400);
    expect(reponse.body.message).toBe('Requête invalide');
    expect(reponse.body.champs.map((c: { champ: string }) => c.champ)).toEqual([champ]);
    expect(await contenuDesTables(banc.bdd)).toEqual(avant);
    expect((await consulter()).body).toEqual({ categories: ['figurines'] });
  });
});
