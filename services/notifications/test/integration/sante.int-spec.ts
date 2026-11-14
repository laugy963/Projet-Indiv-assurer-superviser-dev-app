import { demarrerBanc, type Banc } from './banc';

// Route interne fournie par le socle : elle sert aux sondes de santé, pas aux clients.
describe('Route interne GET /sante', () => {
  let banc: Banc;

  beforeAll(async () => {
    banc = await demarrerBanc();
  });

  afterAll(() => banc.arreter());

  it('répond 200 sans jeton', async () => {
    const reponse = await banc.http().get('/sante');
    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual({ etat: 'ok' });
  });

  it('n’existe pas sous /api, seul chemin que le point d’entrée exposera', async () => {
    const reponse = await banc.http().get('/api/sante');
    expect(reponse.status).toBe(404);
  });
});
