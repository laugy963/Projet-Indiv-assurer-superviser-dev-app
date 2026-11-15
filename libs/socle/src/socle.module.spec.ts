import { Body, Controller, Get, Global, Module, Post, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsString } from 'class-validator';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { EmetteurDeTest } from '../outils-de-test/emetteur-de-test';
import { Roles, UtilisateurCourant } from './securite/decorateurs';
import type { Utilisateur } from './securite/utilisateur';
import { SocleModule } from './socle.module';

class CorpsDto {
  @IsString()
  nom!: string;
}

// Un contrôleur d'exemple, sans rien de métier : il montre ce que reçoit un service qui importe le socle.
@Controller('api/exemple')
class ControleurExemple {
  @Get()
  @Roles('membre')
  lire(@UtilisateurCourant() utilisateur: Utilisateur): { id: string } {
    return { id: utilisateur.id };
  }

  @Post()
  @Roles('membre')
  ecrire(@Body() corps: CorpsDto): CorpsDto {
    return corps;
  }

  // Oubli volontaire : aucun rôle déclaré.
  @Get('oubli')
  sansRole(): { fuite: boolean } {
    return { fuite: true };
  }

  @Get('panne')
  @Roles('membre')
  panne(): never {
    throw new Error('relation "secrets" does not exist — SELECT * FROM secrets');
  }
}

describe('SocleModule — ce que reçoit un service qui l’importe', () => {
  const MEMBRE = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
  let emetteur: EmetteurDeTest;
  let app: INestApplication;
  let jeton: string;

  beforeAll(async () => {
    emetteur = await EmetteurDeTest.demarrer();
    const module = await Test.createTestingModule({
      imports: [SocleModule.configurer({ emetteur: emetteur.emetteur, urlCles: emetteur.urlCles, audience: emetteur.audience })],
      controllers: [ControleurExemple],
    }).compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
    jeton = await emetteur.jetonMembre(MEMBRE);
  });

  afterAll(async () => {
    await app.close();
    await emetteur.arreter();
  });

  const http = () => request(app.getHttpServer());

  it('la garde protège toutes les routes : 401 sans jeton', async () => {
    const reponse = await http().get('/api/exemple');
    expect(reponse.status).toBe(401);
    expect(reponse.body).toEqual({ code: 401, message: 'Jeton absent ou invalide' });
  });

  it("l'identité transmise au contrôleur est celle du jeton", async () => {
    const reponse = await http().get('/api/exemple').set('Authorization', `Bearer ${jeton}`);
    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual({ id: MEMBRE });
  });

  it('une route qui oublie de déclarer un rôle est fermée, même avec un jeton valide', async () => {
    const reponse = await http().get('/api/exemple/oubli').set('Authorization', `Bearer ${jeton}`);
    expect(reponse.status).toBe(403);
    expect(reponse.body).toEqual({ code: 403, message: 'Rôle insuffisant' });
  });

  it('la validation par liste blanche s’applique à toutes les routes', async () => {
    const reponse = await http().post('/api/exemple').set('Authorization', `Bearer ${jeton}`).send({ nom: 'ok', admin: true });
    expect(reponse.status).toBe(400);
    expect(reponse.body.champs).toEqual([{ champ: 'admin', erreurs: ['Champ non prévu'] }]);
  });

  it('une erreur inattendue donne 500, sans détail technique', async () => {
    const reponse = await http().get('/api/exemple/panne').set('Authorization', `Bearer ${jeton}`);
    expect(reponse.status).toBe(500);
    expect(reponse.body).toEqual({ code: 500, message: 'Erreur interne' });
  });

  it('la route interne /sante répond sans jeton', async () => {
    const reponse = await http().get('/sante');
    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual({ etat: 'ok' });
  });

  it('la route interne /sante/pret répond 200 : ce service d’exemple n’a aucune dépendance', async () => {
    const reponse = await http().get('/sante/pret');
    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual({ etat: 'pret' });
  });

  describe('la route interne /metrics', () => {
    const metriques = async (): Promise<string> => (await http().get('/metrics')).text;
    const compte = (texte: string, methode: string, route: string, code: number): boolean =>
      texte.includes(`http_request_duration_seconds_count{method="${methode}",route="${route}",code="${code}"}`);

    it('répond sans jeton, au format texte de Prometheus', async () => {
      const reponse = await http().get('/metrics');
      expect(reponse.status).toBe(200);
      expect(reponse.headers['content-type']).toContain('text/plain');
      expect(reponse.text).toContain('process_cpu_seconds_total');
    });

    it('compte chaque requête de l’API par route et par code, refus de la garde et erreurs compris', async () => {
      await http().get('/api/exemple').set('Authorization', `Bearer ${jeton}`);
      await http().get('/api/exemple');
      await http().get('/api/exemple/oubli').set('Authorization', `Bearer ${jeton}`);
      await http().post('/api/exemple').set('Authorization', `Bearer ${jeton}`).send({ nom: 'ok', admin: true });
      await http().get('/api/exemple/panne').set('Authorization', `Bearer ${jeton}`);

      const texte = await metriques();

      expect(compte(texte, 'GET', '/api/exemple', 200)).toBe(true);
      expect(compte(texte, 'GET', '/api/exemple', 401)).toBe(true);
      expect(compte(texte, 'GET', '/api/exemple/oubli', 403)).toBe(true);
      expect(compte(texte, 'POST', '/api/exemple', 400)).toBe(true);
      expect(compte(texte, 'GET', '/api/exemple/panne', 500)).toBe(true);
    });

    it('range sous « inconnue » un chemin qui n’existe pas, quel qu’il soit', async () => {
      await http().get('/api/inexistant/123');
      await http().get('/api/inexistant/456');

      const texte = await metriques();

      expect(compte(texte, 'GET', 'inconnue', 404)).toBe(true);
      expect(texte).not.toContain('inexistant');
    });

    it('ne compte ni les sondes ni la collecte elle-même', async () => {
      await http().get('/sante');
      await http().get('/sante/pret');

      const texte = await metriques();

      expect(texte).not.toContain('route="/sante');
      expect(texte).not.toContain('route="/metrics"');
    });
  });
});

// Un service qui a une base de données : le socle la vérifie pour la sonde « prêt ».
describe('SocleModule — sonde « prêt » d’un service dont la base ne répond pas', () => {
  const baseEnPanne = { query: jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED 10.42.0.17:5432')) };

  @Global()
  @Module({ providers: [{ provide: DataSource, useValue: baseEnPanne }], exports: [DataSource] })
  class BaseEnPanneModule {}

  let emetteur: EmetteurDeTest;
  let app: INestApplication;

  beforeAll(async () => {
    emetteur = await EmetteurDeTest.demarrer();
    const module = await Test.createTestingModule({
      imports: [
        BaseEnPanneModule,
        SocleModule.configurer({ emetteur: emetteur.emetteur, urlCles: emetteur.urlCles, audience: emetteur.audience }),
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await emetteur.arreter();
  });

  it('/sante/pret répond 503, sans détail technique : le pod sort du Service', async () => {
    const reponse = await request(app.getHttpServer()).get('/sante/pret');

    expect(reponse.status).toBe(503);
    expect(reponse.body).toEqual({ etat: 'indisponible' });
    expect(baseEnPanne.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('/sante répond toujours 200 : le pod n’est pas redémarré pour une panne de la base', async () => {
    const reponse = await request(app.getHttpServer()).get('/sante');

    expect(reponse.status).toBe(200);
  });
});
