import { randomUUID } from 'node:crypto';
import { falsifierContenu, falsifierSignature, type Ecoute } from '@epouvante/socle/outils-de-test';
import { ANNONCE_VALIDE, contenuDeLaTable, demarrerBanc, viderLaBase, type Banc } from './banc';

// Critères communs CA-01 et CA-02, vérifiés une fois par route du service annonces.
// « Aucune donnée n'est lue ni modifiée » : la réponse ne porte que le code et le message,
// la table est identique avant et après, et aucun événement n'est émis.
interface Route {
  nom: string;
  methode: 'post' | 'get' | 'delete';
  chemin: (annonceId: string) => string;
  corps?: object;
  /** Rôles d'un utilisateur authentifié qui n'a PAS le droit d'appeler la route. */
  rolesInsuffisants: string[];
}

const ROUTES: Route[] = [
  { nom: 'POST /api/annonces', methode: 'post', chemin: () => '/api/annonces', corps: ANNONCE_VALIDE, rolesInsuffisants: ['moderateur'] },
];

describe.each(ROUTES)('Contrôle d’accès — $nom', (route) => {
  let banc: Banc;
  let evenements: Ecoute;
  let annonceId: string;
  let avant: unknown[];

  beforeAll(async () => {
    banc = await demarrerBanc();
    evenements = await banc.sonde.ecouter('annonces', 'annonce.publiee');
  });

  afterAll(() => banc.arreter());

  beforeEach(async () => {
    await viderLaBase(banc.bdd);
    // Une annonce déjà publiée : une donnée à ne pas lire et à ne pas modifier.
    annonceId = randomUUID();
    await banc.bdd.query(
      `INSERT INTO annonces (id, titre, description, categorie, type, statut, auteur_id, publiee_le)
       VALUES ($1, 'Annonce existante', 'Une annonce déjà publiée.', 'bd', 'troc', 'publiee', $2, now())`,
      [annonceId, randomUUID()],
    );
    avant = await contenuDeLaTable(banc.bdd);
  });

  function appeler(autorisation?: string) {
    let requete = banc.http()[route.methode](route.chemin(annonceId));
    if (autorisation !== undefined) requete = requete.set('Authorization', autorisation);
    return route.corps ? requete.send(route.corps) : requete;
  }

  async function rienNaChange(): Promise<void> {
    expect(await contenuDeLaTable(banc.bdd)).toEqual(avant);
    expect(await evenements.nombreApres(100)).toBe(0);
  }

  const REFUS_401 = { code: 401, message: 'Jeton absent ou invalide' };

  it('CA-01 — sans jeton : 401', async () => {
    const reponse = await appeler();
    expect(reponse.status).toBe(401);
    expect(reponse.body).toEqual(REFUS_401);
    await rienNaChange();
  });

  it('CA-01 — jeton expiré : 401', async () => {
    const jeton = await banc.emetteur.jeton({ roles: ['membre', 'moderateur'], dureeEnSecondes: -30 });
    const reponse = await appeler(`Bearer ${jeton}`);
    expect(reponse.status).toBe(401);
    expect(reponse.body).toEqual(REFUS_401);
    await rienNaChange();
  });

  it('CA-01 — jeton à la signature falsifiée : 401', async () => {
    const jeton = falsifierSignature(await banc.emetteur.jeton({ roles: ['membre', 'moderateur'] }));
    const reponse = await appeler(`Bearer ${jeton}`);
    expect(reponse.status).toBe(401);
    expect(reponse.body).toEqual(REFUS_401);
    await rienNaChange();
  });

  it('CA-01 — jeton au contenu falsifié pour s’attribuer les rôles : 401', async () => {
    const jeton = falsifierContenu(await banc.emetteur.jeton({ roles: [] }), (contenu) => {
      (contenu.realm_access as { roles: string[] }).roles.push('membre', 'moderateur');
    });
    const reponse = await appeler(`Bearer ${jeton}`);
    expect(reponse.status).toBe(401);
    expect(reponse.body).toEqual(REFUS_401);
    await rienNaChange();
  });

  it('CA-01 — jeton signé par une clé inconnue de l’émetteur : 401', async () => {
    const jeton = await banc.emetteur.jeton({ roles: ['membre', 'moderateur'], cle: 'inconnue' });
    const reponse = await appeler(`Bearer ${jeton}`);
    expect(reponse.status).toBe(401);
    expect(reponse.body).toEqual(REFUS_401);
    await rienNaChange();
  });

  it('CA-01 — jeton émis pour une autre application (audience) : 401', async () => {
    const jeton = await banc.emetteur.jeton({ roles: ['membre', 'moderateur'], audience: ['account'] });
    const reponse = await appeler(`Bearer ${jeton}`);
    expect(reponse.status).toBe(401);
    expect(reponse.body).toEqual(REFUS_401);
    await rienNaChange();
  });

  it('CA-02 — utilisateur authentifié sans le rôle exigé : 403', async () => {
    const jeton = await banc.emetteur.jeton({ roles: route.rolesInsuffisants });
    const reponse = await appeler(`Bearer ${jeton}`);
    expect(reponse.status).toBe(403);
    expect(reponse.body).toEqual({ code: 403, message: 'Rôle insuffisant' });
    await rienNaChange();
  });
});
