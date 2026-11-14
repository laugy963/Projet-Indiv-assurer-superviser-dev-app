import { randomUUID } from 'node:crypto';
import { demarrerBanc, insererNotification, MEMBRE_A, MEMBRE_B, UUID, viderLaBase, type Banc } from './banc';

// US-03 — En tant que membre, je veux consulter mes notifications.
describe('US-03 — Consulter mes notifications (GET /api/notifications)', () => {
  let banc: Banc;

  beforeAll(async () => {
    banc = await demarrerBanc();
  });

  afterAll(() => banc.arreter());

  beforeEach(() => viderLaBase(banc.bdd));

  async function consulter(membre: string, requete = '', entetes: Record<string, string> = {}) {
    return banc
      .http()
      .get(`/api/notifications${requete}`)
      .set({ ...entetes, Authorization: `Bearer ${await banc.emetteur.jetonMembre(membre)}` });
  }

  it('CA-09 — la liste va de la plus récente à la plus ancienne ; chaque notification décrit l’annonce', async () => {
    const annonceRecente = randomUUID();
    await insererNotification(banc.bdd, { membreId: MEMBRE_A, titre: 'La plus ancienne', ilYaMinutes: 60 });
    const idRecente = await insererNotification(banc.bdd, {
      membreId: MEMBRE_A,
      annonceId: annonceRecente,
      titre: 'La plus récente',
      categorie: 'fanzines',
      typeAnnonce: 'troc',
      ilYaMinutes: 1,
    });
    await insererNotification(banc.bdd, { membreId: MEMBRE_A, titre: 'Entre les deux', ilYaMinutes: 10 });

    const reponse = await consulter(MEMBRE_A);

    expect(reponse.status).toBe(200);
    expect(reponse.body.notifications.map((n: { titre: string }) => n.titre)).toEqual(['La plus récente', 'Entre les deux', 'La plus ancienne']);
    // Égalité stricte : identifiant, titre, catégorie et type de l'annonce, date. Rien d'autre, pas même le membre.
    expect(reponse.body.notifications[0]).toEqual({
      id: idRecente,
      annonceId: annonceRecente,
      titre: 'La plus récente',
      categorie: 'fanzines',
      typeAnnonce: 'troc',
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
    });
    expect(reponse.body.notifications[0].id).toMatch(UUID);
  });

  it('CA-09 — un membre sans notification consulte une liste vide', async () => {
    const reponse = await consulter(MEMBRE_A);
    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual({ notifications: [] });
  });

  it('CA-10 — un membre ne voit aucune notification d’un autre membre', async () => {
    await insererNotification(banc.bdd, { membreId: MEMBRE_A, titre: 'Pour A' });
    await insererNotification(banc.bdd, { membreId: MEMBRE_B, titre: 'Pour B, première' });
    await insererNotification(banc.bdd, { membreId: MEMBRE_B, titre: 'Pour B, seconde' });

    const pourA = await consulter(MEMBRE_A);
    const pourB = await consulter(MEMBRE_B);

    expect(pourA.body.notifications.map((n: { titre: string }) => n.titre)).toEqual(['Pour A']);
    expect(pourB.body.notifications.map((n: { titre: string }) => n.titre).sort()).toEqual(['Pour B, première', 'Pour B, seconde']);
  });

  it.each([
    ['un paramètre d’URL « membreId »', `?membreId=${MEMBRE_B}`, {}],
    ['un paramètre d’URL « membre_id »', `?membre_id=${MEMBRE_B}`, {}],
    ['un paramètre d’URL « sub »', `?sub=${MEMBRE_B}`, {}],
    ['un en-tête « X-Membre-Id »', '', { 'X-Membre-Id': MEMBRE_B }],
  ])('CA-10 — %s ne permet pas de choisir le membre : l’identité vient du jeton', async (_cas, requete, entetes) => {
    await insererNotification(banc.bdd, { membreId: MEMBRE_A, titre: 'Pour A' });
    await insererNotification(banc.bdd, { membreId: MEMBRE_B, titre: 'Pour B' });

    const reponse = await consulter(MEMBRE_A, requete, entetes);

    expect(reponse.status).toBe(200);
    expect(reponse.body.notifications.map((n: { titre: string }) => n.titre)).toEqual(['Pour A']);
  });

  it('la liste est bornée aux 100 notifications les plus récentes', async () => {
    await banc.bdd.query(
      `INSERT INTO notifications (id, membre_id, annonce_id, titre_annonce, categorie, type_annonce, creee_le)
       SELECT gen_random_uuid(), $1, gen_random_uuid(), 'Annonce ' || n, 'bd', 'troc', now() - (n * interval '1 minute')
       FROM generate_series(1, 105) AS n`,
      [MEMBRE_A],
    );

    const reponse = await consulter(MEMBRE_A);

    expect(reponse.body.notifications).toHaveLength(100);
    expect(reponse.body.notifications[0].titre).toBe('Annonce 1');
    expect(reponse.body.notifications[99].titre).toBe('Annonce 100');
  });
});
