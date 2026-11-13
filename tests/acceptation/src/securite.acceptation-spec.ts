import { annonces, jeton, notifications, publierAnnonce } from './outils';

// La chaîne de sécurité vue de l'extérieur, avec de vrais jetons de Keycloak.
// Les tests d'intégration couvrent chaque cas de refus avec un émetteur de test ;
// ceux-ci prouvent que les services acceptent et refusent aussi les jetons du vrai serveur d'identité.
describe('Sécurité de bout en bout, avec Keycloak', () => {
  it('le jeton de Keycloak porte l’audience de l’API, les rôles du royaume et une durée de vie de 120 secondes', async () => {
    const contenu = JSON.parse(Buffer.from((await jeton('membre-a')).split('.')[1], 'base64url').toString('utf8'));

    expect(contenu.aud).toContain('api-epouvante');
    expect(contenu.realm_access.roles).toContain('membre');
    expect(contenu.realm_access.roles).not.toContain('moderateur');
    expect(contenu.exp - contenu.iat).toBe(120);
  });

  it.each([
    ['POST /api/annonces', () => annonces().post('/api/annonces').send({})],
    ['GET /api/annonces', () => annonces().get('/api/annonces')],
    ['GET /api/notifications', () => notifications().get('/api/notifications')],
    ['GET /api/centres-interet', () => notifications().get('/api/centres-interet')],
  ])('CA-01 — %s sans jeton : 401', async (_route, appeler) => {
    const reponse = await appeler();
    expect(reponse.status).toBe(401);
    expect(reponse.body).toEqual({ code: 401, message: 'Jeton absent ou invalide' });
  });

  it('CA-02 — un modérateur ne publie pas d’annonce : 403', async () => {
    const reponse = await publierAnnonce('moderateur-test', 'bd');
    expect(reponse.status).toBe(403);
  });

  it('CA-18 puis CA-17 — un membre ne retire pas une annonce (403) ; un modérateur la retire (204)', async () => {
    const publication = await publierAnnonce('membre-a', 'autres');
    expect(publication.status).toBe(201);
    const chemin = `/api/annonces/${publication.body.id}`;

    const parLAuteur = await annonces().delete(chemin).set('Authorization', `Bearer ${await jeton('membre-a')}`);
    expect(parLAuteur.status).toBe(403);

    const parLeModerateur = await annonces().delete(chemin).set('Authorization', `Bearer ${await jeton('moderateur-test')}`);
    expect(parLeModerateur.status).toBe(204);

    const liste = await annonces().get('/api/annonces').set('Authorization', `Bearer ${await jeton('membre-b')}`);
    expect(liste.body.annonces.map((a: { id: string }) => a.id)).not.toContain(publication.body.id);
  });
});
