import { randomUUID } from 'node:crypto';
import { NotifierMembresInteresses } from '../../src/application/notifier-membres-interesses';
import { demarrerBanc, FILE, FILE_ECHECS, insererCentresInteret, MEMBRE_A, MEMBRE_B, MEMBRE_C, viderLaBase, type Banc } from './banc';

// US-04 côté service notifications : l'événement est publié sur le vrai broker par une sonde,
// qui tient le rôle du service annonces. Les scénarios complets (CA-11, CA-12, CA-13, CA-15)
// sont dans tests/acceptation, avec les deux services.
describe('US-04 — Être notifié d’une annonce qui m’intéresse (événement « annonce.publiee »)', () => {
  let banc: Banc;
  /** Un élément par événement remis au cas d'usage : la promesse de son traitement. */
  let traitements: Promise<unknown>[];

  beforeAll(async () => {
    banc = await demarrerBanc();
    // Le test observe le cas d'usage réel sans le remplacer : il sait ainsi quand un message a fini d'être traité.
    const casDUsage = banc.app.get(NotifierMembresInteresses);
    const executer = casDUsage.executer.bind(casDUsage);
    jest.spyOn(casDUsage, 'executer').mockImplementation((evenement) => {
      const traitement = executer(evenement);
      traitements.push(traitement.catch(() => undefined));
      return traitement;
    });
  });

  afterAll(() => banc.arreter());

  beforeEach(async () => {
    traitements = [];
    await viderLaBase(banc.bdd);
    await banc.sonde.vider(FILE_ECHECS);
    await insererCentresInteret(banc.bdd, MEMBRE_A, ['figurines']);
    await insererCentresInteret(banc.bdd, MEMBRE_B, ['figurines']);
    await insererCentresInteret(banc.bdd, MEMBRE_C, ['bd']);
  });

  function evenement(annonceId = randomUUID(), donnees: Record<string, unknown> = {}) {
    return {
      id: randomUUID(),
      type: 'annonce.publiee',
      version: 1,
      date: new Date().toISOString(),
      donnees: { annonceId, titre: 'Figurine Evil Ed, édition limitée', categorie: 'figurines', typeAnnonce: 'don', auteurId: MEMBRE_A, ...donnees },
    };
  }

  async function notificationsDe(membre: string) {
    const reponse = await banc
      .http()
      .get('/api/notifications')
      .set('Authorization', `Bearer ${await banc.emetteur.jetonMembre(membre)}`);
    expect(reponse.status).toBe(200);
    return reponse.body.notifications as { annonceId: string; titre: string; categorie: string; typeAnnonce: string }[];
  }

  async function attendre(condition: () => Promise<boolean> | boolean, quoi: string): Promise<void> {
    const limite = Date.now() + 5000;
    while (!(await condition())) {
      if (Date.now() > limite) throw new Error(`${quoi} : toujours pas après 5 secondes`);
      await new Promise((suite) => setTimeout(suite, 20));
    }
  }

  /** Attend que le service ait reçu « nombre » événements, et fini de les traiter. */
  async function evenementsTraites(nombre: number): Promise<void> {
    await attendre(() => traitements.length >= nombre, `${nombre} événement(s) remis au service`);
    await Promise.all(traitements);
    // L'accusé de réception suit le traitement : la file ne garde alors aucun message.
    await attendre(async () => (await banc.sonde.enAttente(FILE)) === 0, 'File vide');
  }

  it('un événement crée une notification pour le membre intéressé, pas pour les autres ni pour l’auteur', async () => {
    const publie = evenement();

    await banc.sonde.publier('annonces', 'annonce.publiee', publie);
    await evenementsTraites(1);

    expect(await notificationsDe(MEMBRE_B)).toEqual([
      expect.objectContaining({ annonceId: publie.donnees.annonceId, titre: publie.donnees.titre, categorie: 'figurines', typeAnnonce: 'don' }),
    ]);
    expect(await notificationsDe(MEMBRE_C)).toEqual([]);
    expect(await notificationsDe(MEMBRE_A)).toEqual([]);
  });

  it('CA-14 — le même événement remis une seconde fois ne crée pas de seconde notification', async () => {
    const publie = evenement();
    await banc.sonde.publier('annonces', 'annonce.publiee', publie);
    await evenementsTraites(1);
    expect(await notificationsDe(MEMBRE_B)).toHaveLength(1);

    // Seconde remise du même événement : même identifiant, même annonce.
    await banc.sonde.publier('annonces', 'annonce.publiee', publie);
    await evenementsTraites(2);

    expect(await notificationsDe(MEMBRE_B)).toHaveLength(1);
    const lignes = await banc.bdd.query('SELECT count(*)::int AS nombre FROM notifications WHERE annonce_id = $1', [publie.donnees.annonceId]);
    expect(lignes).toEqual([{ nombre: 1 }]);
    // Les deux messages ont été accusés : aucun n'est parti en file des échecs.
    expect(await banc.sonde.enAttente(FILE_ECHECS)).toBe(0);
  });

  it.each([
    ['une version de contrat inconnue', { ...evenement(), version: 2 }],
    ['des données incomplètes', { ...evenement(), donnees: { titre: 'Sans identifiant' } }],
    ['un contenu qui n’est pas un événement', 'pas un événement'],
  ])('un message défectueux (%s) part en file des échecs et ne bloque pas la file', async (_cas, defectueux) => {
    await banc.sonde.publier('annonces', 'annonce.publiee', defectueux);
    const suivant = evenement();
    await banc.sonde.publier('annonces', 'annonce.publiee', suivant);
    // Seul le message valide atteint le cas d'usage ; le message défectueux est refusé avant.
    await evenementsTraites(1);
    await attendre(async () => (await banc.sonde.enAttente(FILE_ECHECS)) === 1, 'Message en file des échecs');

    expect(await banc.sonde.enAttente(FILE_ECHECS)).toBe(1);
    // Le message suivant est traité normalement.
    expect((await notificationsDe(MEMBRE_B)).map((n) => n.annonceId)).toEqual([suivant.donnees.annonceId]);
  });
});
