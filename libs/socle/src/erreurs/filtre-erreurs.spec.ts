import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnauthorizedException,
  type ArgumentsHost,
} from '@nestjs/common';
import { FiltreErreurs } from './filtre-erreurs';
import { RequeteInvalide } from './requete-invalide';

// Critère CA-03 : un code HTTP et un message lisible, sans chemin de fichier, requête SQL ni trace d'exécution.
describe('FiltreErreurs', () => {
  const filtre = new FiltreErreurs();
  let journal: jest.SpyInstance;

  beforeEach(() => {
    journal = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  function traiter(erreur: unknown, type = 'http'): { code: number; corps: Record<string, unknown> } {
    const reponse = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const hote = {
      getType: () => type,
      switchToHttp: () => ({ getResponse: () => reponse, getRequest: () => ({ method: 'POST', url: '/api/annonces' }) }),
    } as unknown as ArgumentsHost;
    filtre.catch(erreur, hote);
    return { code: reponse.status.mock.calls[0][0], corps: reponse.json.mock.calls[0][0] };
  }

  it.each([
    [new UnauthorizedException(), 401, 'Jeton absent ou invalide'],
    [new ForbiddenException(), 403, 'Rôle insuffisant'],
    [new NotFoundException(), 404, 'Ressource absente'],
    [new PayloadTooLargeException(), 413, 'Requête refusée'],
  ])('traduit %p en code %i et message lisible', (erreur, code, message) => {
    expect(traiter(erreur)).toEqual({ code, corps: { code, message } });
  });

  it('nomme les champs en erreur d’une requête invalide', () => {
    const champs = [{ champ: 'titre', erreurs: ['Le titre compte entre 3 et 100 caractères'] }];
    expect(traiter(new RequeteInvalide(champs))).toEqual({
      code: 400,
      corps: { code: 400, message: 'Requête invalide', champs },
    });
  });

  it("ne recopie pas le détail d'une erreur de lecture du corps JSON", () => {
    const { code, corps } = traiter(new BadRequestException('Unexpected token } in JSON at position 17'));
    expect(code).toBe(400);
    expect(corps).toEqual({ code: 400, message: 'Requête invalide' });
  });

  it('répond 500 sans détail technique à une erreur inattendue, et la journalise', () => {
    const erreur = new Error('relation "annonces" does not exist — SELECT * FROM annonces at /app/dist/depot.js:12');

    const { code, corps } = traiter(erreur);

    expect(code).toBe(500);
    expect(corps).toEqual({ code: 500, message: 'Erreur interne' });
    expect(JSON.stringify(corps)).not.toMatch(/SELECT|relation|\/app\/|\.js/);
    expect(journal).toHaveBeenCalled();
  });

  it('ne journalise pas comme une panne une erreur due au client', () => {
    traiter(new NotFoundException());
    expect(journal).not.toHaveBeenCalled();
  });

  it('hors HTTP (message du broker), relance l’erreur telle quelle', () => {
    const erreur = new Error('base injoignable');
    expect(() => traiter(erreur, 'rpc')).toThrow(erreur);
  });
});
