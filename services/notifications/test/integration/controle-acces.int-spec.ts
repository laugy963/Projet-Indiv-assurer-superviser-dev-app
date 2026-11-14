import { falsifierContenu, falsifierSignature } from '@epouvante/socle/outils-de-test';
import { contenuDesTables, demarrerBanc, insererCentresInteret, insererNotification, MEMBRE_A, viderLaBase, type Banc } from './banc';

// Critères communs CA-01 et CA-02, vérifiés une fois par route du service notifications.
// « Aucune donnée n'est lue ni modifiée » : la réponse ne porte que le code et le message,
// et les deux tables sont identiques avant et après.
interface Route {
  nom: string;
  methode: 'put' | 'get';
  chemin: string;
  corps?: object;
}

const ROUTES: Route[] = [
  { nom: 'PUT /api/centres-interet', methode: 'put', chemin: '/api/centres-interet', corps: { categories: ['bd'] } },
  { nom: 'GET /api/centres-interet', methode: 'get', chemin: '/api/centres-interet' },
  { nom: 'GET /api/notifications', methode: 'get', chemin: '/api/notifications' },
];

describe.each(ROUTES)('Contrôle d’accès — $nom', (route) => {
  let banc: Banc;
  let avant: unknown;

  beforeAll(async () => {
    banc = await demarrerBanc();
  });

  afterAll(() => banc.arreter());

  beforeEach(async () => {
    await viderLaBase(banc.bdd);
    // Des données existantes : à ne pas lire et à ne pas modifier.
    await insererCentresInteret(banc.bdd, MEMBRE_A, ['figurines']);
    await insererNotification(banc.bdd, { membreId: MEMBRE_A });
    avant = await contenuDesTables(banc.bdd);
  });

  function appeler(autorisation?: string) {
    let requete = banc.http()[route.methode](route.chemin);
    if (autorisation !== undefined) requete = requete.set('Authorization', autorisation);
    return route.corps ? requete.send(route.corps) : requete;
  }

  const REFUS_401 = { code: 401, message: 'Jeton absent ou invalide' };
  // Tous les jetons refusés prétendent être ceux du membre A, avec tous les rôles.
  const USURPATEUR = { sujet: MEMBRE_A, roles: ['membre', 'moderateur'] };

  it('CA-01 — sans jeton : 401', async () => {
    const reponse = await appeler();
    expect(reponse.status).toBe(401);
    expect(reponse.body).toEqual(REFUS_401);
    expect(await contenuDesTables(banc.bdd)).toEqual(avant);
  });

  it('CA-01 — jeton expiré : 401', async () => {
    const reponse = await appeler(`Bearer ${await banc.emetteur.jeton({ ...USURPATEUR, dureeEnSecondes: -30 })}`);
    expect(reponse.status).toBe(401);
    expect(reponse.body).toEqual(REFUS_401);
    expect(await contenuDesTables(banc.bdd)).toEqual(avant);
  });

  it('CA-01 — jeton à la signature falsifiée : 401', async () => {
    const reponse = await appeler(`Bearer ${falsifierSignature(await banc.emetteur.jeton(USURPATEUR))}`);
    expect(reponse.status).toBe(401);
    expect(reponse.body).toEqual(REFUS_401);
    expect(await contenuDesTables(banc.bdd)).toEqual(avant);
  });

  it('CA-01 — jeton au contenu falsifié pour prendre l’identité d’un autre membre : 401', async () => {
    const jeton = falsifierContenu(await banc.emetteur.jetonMembre(), (contenu) => {
      contenu.sub = MEMBRE_A;
    });
    const reponse = await appeler(`Bearer ${jeton}`);
    expect(reponse.status).toBe(401);
    expect(reponse.body).toEqual(REFUS_401);
    expect(await contenuDesTables(banc.bdd)).toEqual(avant);
  });

  it('CA-01 — jeton signé par une clé inconnue de l’émetteur : 401', async () => {
    const reponse = await appeler(`Bearer ${await banc.emetteur.jeton({ ...USURPATEUR, cle: 'inconnue' })}`);
    expect(reponse.status).toBe(401);
    expect(reponse.body).toEqual(REFUS_401);
    expect(await contenuDesTables(banc.bdd)).toEqual(avant);
  });

  it('CA-01 — jeton émis pour une autre application (audience) : 401', async () => {
    const reponse = await appeler(`Bearer ${await banc.emetteur.jeton({ ...USURPATEUR, audience: ['account'] })}`);
    expect(reponse.status).toBe(401);
    expect(reponse.body).toEqual(REFUS_401);
    expect(await contenuDesTables(banc.bdd)).toEqual(avant);
  });

  it('CA-02 — un modérateur, qui n’a pas le rôle « membre » : 403', async () => {
    const reponse = await appeler(`Bearer ${await banc.emetteur.jeton({ sujet: MEMBRE_A, roles: ['moderateur'] })}`);
    expect(reponse.status).toBe(403);
    expect(reponse.body).toEqual({ code: 403, message: 'Rôle insuffisant' });
    expect(await contenuDesTables(banc.bdd)).toEqual(avant);
  });
});
