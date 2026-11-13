import { contenuDeLaTable, demarrerBanc, identifiant, insererAnnonce, viderLaBase, type Banc } from './banc';

// US-06 — En tant que modérateur, je veux retirer une annonce qui ne respecte pas les règles.
describe('US-06 — Retirer une annonce (DELETE /api/annonces/{id})', () => {
  const AUTEUR = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
  const MODERATEUR = '5e4f3a2b-1c0d-4e9f-8a7b-6c5d4e3f2a1b';
  const ANNONCE = identifiant(1);
  let banc: Banc;

  beforeAll(async () => {
    banc = await demarrerBanc();
  });

  afterAll(() => banc.arreter());

  beforeEach(async () => {
    await viderLaBase(banc.bdd);
    await insererAnnonce(banc.bdd, { id: ANNONCE, auteurId: AUTEUR });
    await insererAnnonce(banc.bdd, { id: identifiant(2), titre: 'Autre annonce', ilYaMinutes: 5 });
  });

  async function retirer(id: string, jeton: Promise<string> = banc.emetteur.jetonModerateur(MODERATEUR)) {
    return banc.http().delete(`/api/annonces/${id}`).set('Authorization', `Bearer ${await jeton}`);
  }

  async function ligne(id: string): Promise<Record<string, unknown>> {
    const lignes = (await contenuDeLaTable(banc.bdd)) as Record<string, unknown>[];
    return lignes.find((l) => l.id === id) as Record<string, unknown>;
  }

  it('CA-17 — un modérateur retire une annonce : 204, statut « retirée », date et modérateur tracés', async () => {
    const avant = Date.now();

    const reponse = await retirer(ANNONCE);

    expect(reponse.status).toBe(204);
    expect(reponse.body).toEqual({});
    const enBase = await ligne(ANNONCE);
    expect(enBase).toMatchObject({ statut: 'retiree', retiree_par: MODERATEUR, auteur_id: AUTEUR });
    expect((enBase.retiree_le as Date).getTime()).toBeGreaterThanOrEqual(avant - 1000);
    // La ligne n'est pas supprimée : la trace de la modération est gardée.
    expect(await contenuDeLaTable(banc.bdd)).toHaveLength(2);
  });

  it('CA-17 — l’annonce retirée n’apparaît plus dans la liste', async () => {
    await retirer(ANNONCE);

    const liste = await banc
      .http()
      .get('/api/annonces')
      .set('Authorization', `Bearer ${await banc.emetteur.jetonMembre()}`);

    expect(liste.body.total).toBe(1);
    expect(liste.body.annonces.map((a: { id: string }) => a.id)).toEqual([identifiant(2)]);
  });

  it('CA-18 — un membre ne retire pas une annonce, même la sienne : 403, l’annonce reste publiée', async () => {
    const reponse = await retirer(ANNONCE, banc.emetteur.jetonMembre(AUTEUR));

    expect(reponse.status).toBe(403);
    expect(reponse.body).toEqual({ code: 403, message: 'Rôle insuffisant' });
    expect(await ligne(ANNONCE)).toMatchObject({ statut: 'publiee', retiree_le: null, retiree_par: null });
  });

  it('CA-19 — retirer une annonce qui n’existe pas : 404', async () => {
    const reponse = await retirer(identifiant(999));

    expect(reponse.status).toBe(404);
    expect(reponse.body).toEqual({ code: 404, message: 'Ressource absente' });
  });

  it('CA-03 — un identifiant qui n’est pas un UUID : 400, sans erreur SQL dans la réponse', async () => {
    const reponse = await retirer("1'%20OR%20'1'='1");

    expect(reponse.status).toBe(400);
    expect(reponse.body).toEqual({
      code: 400,
      message: 'Requête invalide',
      champs: [{ champ: 'id', erreurs: [expect.any(String)] }],
    });
    expect(await ligne(ANNONCE)).toMatchObject({ statut: 'publiee' });
  });

  // Cas non précisé par le backlog : DELETE est idempotent, la trace du premier retrait est conservée.
  it('retirer une annonce déjà retirée : 204, la trace du premier retrait est conservée', async () => {
    await retirer(ANNONCE);
    const premier = await ligne(ANNONCE);

    const reponse = await retirer(ANNONCE, banc.emetteur.jetonModerateur('11111111-1111-4111-8111-111111111111'));

    expect(reponse.status).toBe(204);
    expect(await ligne(ANNONCE)).toEqual(premier);
  });
});
