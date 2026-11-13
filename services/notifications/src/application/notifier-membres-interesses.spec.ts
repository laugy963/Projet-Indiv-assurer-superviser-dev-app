import { CentresInteretEnMemoire, NotificationsEnMemoire } from '../../test/doubles/depots-en-memoire';
import type { EvenementAnnoncePubliee } from '../domaine/evenement-annonce-publiee';
import { NotifierMembresInteresses } from './notifier-membres-interesses';

const AUTEUR = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const MEMBRE_B = '2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d';
const MEMBRE_C = '3c4d5e6f-7081-4b2c-8d3e-4f5a6b7c8d9e';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const EVENEMENT: EvenementAnnoncePubliee = {
  id: '5f0c2a9e-3b7d-4c1a-9e2f-8a6b4d1c7e90',
  type: 'annonce.publiee',
  version: 1,
  date: '2027-02-01T10:15:30Z',
  donnees: {
    annonceId: 'c1d2e3f4-a5b6-4789-8abc-def012345678',
    titre: 'Figurine Evil Ed, édition limitée',
    categorie: 'figurines',
    typeAnnonce: 'don',
    auteurId: AUTEUR,
  },
};

describe('NotifierMembresInteresses (US-04)', () => {
  let centres: CentresInteretEnMemoire;
  let notifications: NotificationsEnMemoire;
  let casDUsage: NotifierMembresInteresses;

  beforeEach(async () => {
    centres = new CentresInteretEnMemoire();
    notifications = new NotificationsEnMemoire();
    casDUsage = new NotifierMembresInteresses(centres, notifications);
    await centres.remplacer(AUTEUR, ['figurines']);
    await centres.remplacer(MEMBRE_B, ['figurines', 'bd']);
    await centres.remplacer(MEMBRE_C, ['bd']);
  });

  it('crée une notification pour le membre intéressé, avec les données de l’événement', async () => {
    const avant = Date.now();

    await casDUsage.executer(EVENEMENT);

    expect(notifications.notifications).toEqual([
      {
        id: expect.stringMatching(UUID),
        membreId: MEMBRE_B,
        annonceId: EVENEMENT.donnees.annonceId,
        titreAnnonce: 'Figurine Evil Ed, édition limitée',
        categorie: 'figurines',
        typeAnnonce: 'don',
        creeeLe: expect.any(Date),
      },
    ]);
    expect(notifications.notifications[0].creeeLe.getTime()).toBeGreaterThanOrEqual(avant);
  });

  it('ne notifie ni le membre qui n’a pas choisi la catégorie, ni l’auteur', async () => {
    await casDUsage.executer(EVENEMENT);

    const notifies = notifications.notifications.map((n) => n.membreId);
    expect(notifies).not.toContain(MEMBRE_C);
    expect(notifies).not.toContain(AUTEUR);
  });

  it('est idempotent : le même événement traité deux fois ne crée qu’une notification', async () => {
    await casDUsage.executer(EVENEMENT);
    await casDUsage.executer(EVENEMENT);

    expect(notifications.notifications).toHaveLength(1);
  });

  it('rend le nombre de membres notifiés', async () => {
    expect(await casDUsage.executer(EVENEMENT)).toBe(1);
    expect(await casDUsage.executer({ ...EVENEMENT, donnees: { ...EVENEMENT.donnees, categorie: 'fanzines' } })).toBe(0);
  });
});
