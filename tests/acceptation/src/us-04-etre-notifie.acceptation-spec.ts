import {
  arreterServiceNotifications,
  attendreNotification,
  choisirCentresInteret,
  mesure,
  notificationsDe,
  publierAnnonce,
  relancerServiceNotifications,
} from './outils';

// US-04 — En tant que membre, je veux recevoir une notification quand une annonce correspond
// à l'un de mes centres d'intérêt. Scénario complet : Keycloak, service annonces, broker, service notifications.
describe('US-04 — Être notifié d’une annonce qui m’intéresse', () => {
  beforeAll(async () => {
    // Étant donné : A (l'auteur) et B ont choisi « figurines » ; C ne l'a pas choisie.
    await choisirCentresInteret('membre-a', ['figurines']);
    await choisirCentresInteret('membre-b', ['figurines']);
    await choisirCentresInteret('membre-c', ['bd']);
  });

  it('CA-11 — B a choisi « figurines » ; A publie une annonce de cette catégorie : B la trouve en moins de 5 secondes', async () => {
    const publication = await publierAnnonce('membre-a', 'figurines', 'don');
    expect(publication.status).toBe(201);

    const { notification, delaiMs } = await attendreNotification('membre-b', publication.body.id, 5000);

    mesure('CA-11, délai entre la publication et la notification visible', `${delaiMs} ms`);
    expect(delaiMs).toBeLessThan(5000);
    expect(notification).toMatchObject({
      annonceId: publication.body.id,
      titre: publication.body.titre,
      categorie: 'figurines',
      typeAnnonce: 'don',
    });
  });

  it('CA-12 — C n’a pas choisi cette catégorie : il ne reçoit aucune notification', async () => {
    const publication = await publierAnnonce('membre-a', 'figurines');
    // L'événement a bien été traité : B, lui, est notifié.
    await attendreNotification('membre-b', publication.body.id, 5000);

    const recues = await notificationsDe('membre-c');

    expect(recues.map((n) => n.annonceId)).not.toContain(publication.body.id);
  });

  it('CA-13 — A a lui-même choisi « figurines » : il n’est pas notifié de sa propre annonce', async () => {
    const publication = await publierAnnonce('membre-a', 'figurines');
    await attendreNotification('membre-b', publication.body.id, 5000);

    const recues = await notificationsDe('membre-a');

    expect(recues.map((n) => n.annonceId)).not.toContain(publication.body.id);
  });

  it('CA-13 — A reste notifié des annonces des autres membres', async () => {
    const publication = await publierAnnonce('membre-b', 'figurines', 'troc');

    const { notification } = await attendreNotification('membre-a', publication.body.id, 5000);

    expect(notification.typeAnnonce).toBe('troc');
  });

  describe('CA-15 — le service notifications est arrêté', () => {
    // Quoi qu'il arrive, le service est relancé pour les tests suivants.
    afterAll(() => relancerServiceNotifications());

    it('la publication réussit (201) ; au redémarrage du service, B reçoit sa notification', async () => {
      mesure('CA-15, arrêt du service notifications', `${await arreterServiceNotifications()} ms`);

      // Le service annonces fonctionne sans le service notifications : communication asynchrone.
      const publication = await publierAnnonce('membre-a', 'figurines');
      expect(publication.status).toBe(201);

      mesure('CA-15, relance du service notifications', `${await relancerServiceNotifications()} ms`);

      // L'événement a attendu dans la file du broker : aucun message n'est perdu.
      const { delaiMs } = await attendreNotification('membre-b', publication.body.id, 15000);
      mesure('CA-15, notification visible après la relance', `${delaiMs} ms`);
    });
  });
});
