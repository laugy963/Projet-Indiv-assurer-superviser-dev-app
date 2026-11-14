import { NotificationsEnMemoire } from '../../test/doubles/depots-en-memoire';
import type { Notification } from '../domaine/notification';
import { LIMITE_NOTIFICATIONS, ListerNotifications } from './lister-notifications';

const MEMBRE_A = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const MEMBRE_B = '2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d';

function notification(numero: number, membreId: string): Notification {
  const id = `00000000-0000-4000-8000-${String(numero).padStart(12, '0')}`;
  return { id, membreId, annonceId: id, titreAnnonce: `Annonce ${numero}`, categorie: 'bd', typeAnnonce: 'troc', creeeLe: new Date(Date.UTC(2027, 0, 1, 0, numero)) };
}

describe('ListerNotifications (US-03)', () => {
  it('rend les notifications du membre, de la plus récente à la plus ancienne, et aucune d’un autre membre', async () => {
    const depot = new NotificationsEnMemoire();
    await depot.ajouter([notification(1, MEMBRE_A), notification(2, MEMBRE_B), notification(3, MEMBRE_A)]);

    const liste = await new ListerNotifications(depot).executer(MEMBRE_A);

    expect(liste.map((n) => n.titreAnnonce)).toEqual(['Annonce 3', 'Annonce 1']);
  });

  it('borne la liste', async () => {
    const depot = new NotificationsEnMemoire();
    const lister = jest.spyOn(depot, 'listerPour');

    await new ListerNotifications(depot).executer(MEMBRE_A);

    expect(LIMITE_NOTIFICATIONS).toBe(100);
    expect(lister).toHaveBeenCalledWith(MEMBRE_A, 100);
  });
});
