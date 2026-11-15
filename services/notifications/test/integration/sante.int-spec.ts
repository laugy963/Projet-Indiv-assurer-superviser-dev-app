import { demarrerBanc, type Banc } from './banc';

// Routes internes fournies par le socle : elles servent aux sondes de Kubernetes et à Prometheus, pas aux clients.
describe('Routes internes du service notifications', () => {
  let banc: Banc;

  beforeAll(async () => {
    banc = await demarrerBanc();
  });

  afterAll(() => banc.arreter());

  describe('GET /sante — sonde « vivant »', () => {
    it('répond 200 sans jeton', async () => {
      const reponse = await banc.http().get('/sante');
      expect(reponse.status).toBe(200);
      expect(reponse.body).toEqual({ etat: 'ok' });
    });

    it('n’existe pas sous /api, seul chemin que le point d’entrée expose', async () => {
      const reponse = await banc.http().get('/api/sante');
      expect(reponse.status).toBe(404);
    });
  });

  describe('GET /sante/pret — sonde « prêt »', () => {
    it('répond 200 sans jeton quand la base de données répond', async () => {
      const reponse = await banc.http().get('/sante/pret');
      expect(reponse.status).toBe(200);
      expect(reponse.body).toEqual({ etat: 'pret' });
    });
  });

  describe('GET /metrics — collecte par Prometheus', () => {
    it('répond 200 sans jeton, au format texte de Prometheus', async () => {
      const reponse = await banc.http().get('/metrics');
      expect(reponse.status).toBe(200);
      expect(reponse.headers['content-type']).toContain('text/plain');
      expect(reponse.text).toContain('process_resident_memory_bytes');
    });

    it('n’existe pas sous /api', async () => {
      const reponse = await banc.http().get('/api/metrics');
      expect(reponse.status).toBe(404);
    });

    it('compte les requêtes de l’API par route et par code HTTP', async () => {
      await banc.http().get('/api/notifications');
      await banc.http().put('/api/centres-interet').send({ categories: ['bd'] });

      const texte = (await banc.http().get('/metrics')).text;

      expect(texte).toContain('http_request_duration_seconds_count{method="GET",route="/api/notifications",code="401"}');
      expect(texte).toContain('http_request_duration_seconds_count{method="PUT",route="/api/centres-interet",code="401"}');
    });
  });
});

// Dans un banc à part : couper la base ne doit pas gêner les autres tests.
describe('Service notifications dont la base de données ne répond plus', () => {
  let banc: Banc;

  beforeAll(async () => {
    banc = await demarrerBanc();
    await banc.bdd.destroy();
  });

  afterAll(() => banc.arreter());

  it('GET /sante/pret répond 503, sans détail technique : Kubernetes retire le pod du Service', async () => {
    const reponse = await banc.http().get('/sante/pret');
    expect(reponse.status).toBe(503);
    expect(reponse.body).toEqual({ etat: 'indisponible' });
  });

  it('GET /sante répond toujours 200 : redémarrer le pod ne réparerait pas la base', async () => {
    const reponse = await banc.http().get('/sante');
    expect(reponse.status).toBe(200);
  });
});
