import { Body, Controller, Get, Post, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsString } from 'class-validator';
import request from 'supertest';
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
});
