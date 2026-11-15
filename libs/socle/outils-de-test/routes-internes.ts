// Tests d'intégration des routes internes fournies par le socle : /sante, /sante/pret et /metrics.
// Le scénario est le même pour les deux services : il est écrit une fois, ici. Chaque service l'appelle
// depuis son dossier de tests, avec son banc et ses propres routes d'API.
import type request from 'supertest';
import type { Banc } from './banc';

/** Une requête de l'API du service, et la série de métriques où elle doit être comptée. */
export interface RequeteComptee {
  appel: (http: ReturnType<typeof request>) => PromiseLike<unknown>;
  /** Étiquettes attendues : méthode, gabarit de la route, code HTTP. */
  serie: string;
}

export interface RoutesInternesDuService {
  service: string;
  demarrerBanc: () => Promise<Banc>;
  /** Requêtes sans jeton : la garde les refuse (401), et le refus doit être compté. */
  requetes: RequeteComptee[];
  /** Texte qui ne doit jamais apparaître dans les métriques : par exemple un identifiant passé dans le chemin. */
  absentDesMetriques?: string;
}

export function decrireRoutesInternes(cas: RoutesInternesDuService): void {
  // Ces routes servent aux sondes de Kubernetes et à Prometheus, pas aux clients.
  describe(`Routes internes du service ${cas.service}`, () => {
    let banc: Banc;

    beforeAll(async () => {
      banc = await cas.demarrerBanc();
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

      it('compte les requêtes de l’API par méthode, gabarit de route et code HTTP', async () => {
        for (const requete of cas.requetes) await requete.appel(banc.http());

        const texte = (await banc.http().get('/metrics')).text;

        for (const requete of cas.requetes) {
          expect(texte).toContain(`http_request_duration_seconds_count{${requete.serie}}`);
        }
        if (cas.absentDesMetriques) expect(texte).not.toContain(cas.absentDesMetriques);
      });
    });
  });

  // Dans un banc à part : couper la base ne doit pas gêner les autres tests.
  describe(`Service ${cas.service} dont la base de données ne répond plus`, () => {
    let banc: Banc;

    beforeAll(async () => {
      banc = await cas.demarrerBanc();
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
}
