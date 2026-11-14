import type { Ecoute } from '@epouvante/socle/outils-de-test';
import { ANNONCE_VALIDE, contenuDeLaTable, demarrerBanc, UUID, viderLaBase, type Banc } from './banc';

// US-01 — En tant que membre, je veux publier une annonce de troc ou de don.
describe('US-01 — Publier une annonce (POST /api/annonces)', () => {
  const AUTEUR = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
  let banc: Banc;
  let evenements: Ecoute;

  beforeAll(async () => {
    banc = await demarrerBanc();
    evenements = await banc.sonde.ecouter('annonces', 'annonce.publiee');
  });

  afterAll(() => banc.arreter());

  beforeEach(() => viderLaBase(banc.bdd));

  async function publier(corps: unknown, auteur = AUTEUR) {
    return banc
      .http()
      .post('/api/annonces')
      .set('Authorization', `Bearer ${await banc.emetteur.jetonMembre(auteur)}`)
      .send(corps as object);
  }

  it('CA-04 — une annonce valide est enregistrée au statut « publiée », avec son auteur et sa date', async () => {
    const avant = Date.now();

    const reponse = await publier(ANNONCE_VALIDE);

    expect(reponse.status).toBe(201);
    expect(reponse.body).toEqual({
      id: expect.stringMatching(UUID),
      ...ANNONCE_VALIDE,
      statut: 'publiee',
      auteurId: AUTEUR,
      publieeLe: expect.any(String),
    });
    const date = new Date(reponse.body.publieeLe).getTime();
    expect(date).toBeGreaterThanOrEqual(avant - 1000);
    expect(date).toBeLessThanOrEqual(Date.now() + 1000);

    const lignes = (await contenuDeLaTable(banc.bdd)) as Record<string, unknown>[];
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({
      id: reponse.body.id,
      titre: ANNONCE_VALIDE.titre,
      categorie: 'figurines',
      type: 'don',
      statut: 'publiee',
      auteur_id: AUTEUR,
      retiree_le: null,
      retiree_par: null,
    });
    await evenements.prochain();
  });

  it.each([
    ['titre vide', { titre: '' }, 'titre'],
    ['titre fait d’espaces', { titre: '     ' }, 'titre'],
    ['titre de 2 caractères', { titre: 'ab' }, 'titre'],
    ['titre de 101 caractères', { titre: 'a'.repeat(101) }, 'titre'],
    ['titre absent', { titre: undefined }, 'titre'],
    ['titre qui n’est pas un texte', { titre: 12345 }, 'titre'],
    ['description de 9 caractères', { description: 'a'.repeat(9) }, 'description'],
    ['description de 2 001 caractères', { description: 'a'.repeat(2001) }, 'description'],
    ['catégorie inconnue', { categorie: 'voitures' }, 'categorie'],
    ['type inconnu', { type: 'vente' }, 'type'],
    ['champ non prévu : statut', { statut: 'retiree' }, 'statut'],
    ['champ non prévu : auteur choisi par le client', { auteurId: '11111111-1111-4111-8111-111111111111' }, 'auteurId'],
  ])('CA-05 — %s : 400, le champ est nommé, rien n’est enregistré ni émis', async (_cas, modification, champ) => {
    const reponse = await publier({ ...ANNONCE_VALIDE, ...modification });

    expect(reponse.status).toBe(400);
    expect(reponse.body.code).toBe(400);
    expect(reponse.body.message).toBe('Requête invalide');
    expect(reponse.body.champs.map((c: { champ: string }) => c.champ)).toEqual([champ]);
    expect(reponse.body.champs[0].erreurs[0]).toEqual(expect.any(String));
    expect(await contenuDeLaTable(banc.bdd)).toEqual([]);
    expect(await evenements.nombreApres(100)).toBe(0);
  });

  it('CA-06 — une publication émet l’événement « annonce.publiee », conforme au contrat', async () => {
    const reponse = await publier(ANNONCE_VALIDE);
    expect(reponse.status).toBe(201);

    const message = await evenements.prochain();

    expect(message.cleDeRoutage).toBe('annonce.publiee');
    // Persistant : le broker l'écrit sur disque, il survit à un redémarrage.
    expect(message.persistant).toBe(true);
    // Égalité stricte : aucun autre champ. Ni la description, ni une donnée personnelle (ENF-09).
    expect(message.contenu).toEqual({
      id: expect.stringMatching(UUID),
      type: 'annonce.publiee',
      version: 1,
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      donnees: {
        annonceId: reponse.body.id,
        titre: ANNONCE_VALIDE.titre,
        categorie: 'figurines',
        typeAnnonce: 'don',
        auteurId: AUTEUR,
      },
    });
  });

  it('CA-06 — deux publications émettent deux événements distincts', async () => {
    const premiere = await publier(ANNONCE_VALIDE);
    const seconde = await publier({ ...ANNONCE_VALIDE, titre: 'Lot de fanzines', categorie: 'fanzines', type: 'troc' });

    const recus = [await evenements.prochain(), await evenements.prochain()].map(
      (m) => m.contenu as { id: string; donnees: { annonceId: string; typeAnnonce: string } },
    );

    // L'ordre d'arrivée des deux événements n'est pas garanti : les identifiants sont comparés triés.
    const tries = (identifiants: string[]) => [...identifiants].sort((a, b) => a.localeCompare(b));
    expect(tries(recus.map((e) => e.donnees.annonceId))).toEqual(tries([premiere.body.id, seconde.body.id]));
    expect(recus[0].id).not.toBe(recus[1].id);
    expect(await evenements.nombreApres(100)).toBe(0);
  });

  it('CA-03 — un corps JSON illisible : 400 et un message lisible, sans détail technique', async () => {
    const reponse = await banc
      .http()
      .post('/api/annonces')
      .set('Authorization', `Bearer ${await banc.emetteur.jetonMembre(AUTEUR)}`)
      .set('Content-Type', 'application/json')
      .send('{"titre": "Figurine", ');

    expect(reponse.status).toBe(400);
    expect(reponse.body).toEqual({ code: 400, message: 'Requête invalide' });
  });

  it('CA-03 — une route inconnue : 404 et un message lisible', async () => {
    const reponse = await banc
      .http()
      .get('/api/inconnue')
      .set('Authorization', `Bearer ${await banc.emetteur.jetonMembre(AUTEUR)}`);

    expect(reponse.status).toBe(404);
    expect(reponse.body).toEqual({ code: 404, message: 'Ressource absente' });
  });
});
