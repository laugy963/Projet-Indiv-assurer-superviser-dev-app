import { Logger } from '@nestjs/common';
import type { RmqContext } from '@nestjs/microservices';
import type { NotifierMembresInteresses } from '../application/notifier-membres-interesses';
import { AnnoncePublieeConsommateur } from './annonce-publiee.consommateur';

const EVENEMENT = {
  id: '5f0c2a9e-3b7d-4c1a-9e2f-8a6b4d1c7e90',
  type: 'annonce.publiee',
  version: 1,
  date: '2027-02-01T10:15:30Z',
  donnees: {
    annonceId: 'c1d2e3f4-a5b6-4789-8abc-def012345678',
    titre: 'Figurine Evil Ed, édition limitée',
    categorie: 'figurines',
    typeAnnonce: 'don',
    auteurId: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
  },
};

// Garanties de livraison (architecture, paragraphe 6.3), vérifiées sans broker, avec un canal factice.
describe('AnnoncePublieeConsommateur — accusé de réception manuel', () => {
  let appels: string[];
  let canal: { ack: jest.Mock; nack: jest.Mock };
  let notifier: { executer: jest.Mock };
  let consommateur: AnnoncePublieeConsommateur;

  beforeEach(() => {
    appels = [];
    canal = {
      ack: jest.fn(() => appels.push('ack')),
      nack: jest.fn((_message, _tous, remettre) => appels.push(remettre ? 'nack-remise' : 'nack-echec')),
    };
    notifier = { executer: jest.fn(async () => appels.push('notifier')) };
    consommateur = new AnnoncePublieeConsommateur(notifier as unknown as NotifierMembresInteresses);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  function contexte(dejaRemis = false) {
    const message = { fields: { redelivered: dejaRemis } };
    return { message, contexte: { getMessage: () => message, getChannelRef: () => canal } as unknown as RmqContext };
  }

  it('accuse réception après l’enregistrement des notifications, jamais avant', async () => {
    const { contexte: ctx, message } = contexte();

    await consommateur.traiter(EVENEMENT, ctx);

    expect(appels).toEqual(['notifier', 'ack']);
    expect(canal.ack).toHaveBeenCalledWith(message);
  });

  it('refuse sans remise en file un événement qui ne respecte pas le contrat : il part en file des échecs', async () => {
    const { contexte: ctx } = contexte();

    await consommateur.traiter({ ...EVENEMENT, version: 2 }, ctx);

    expect(appels).toEqual(['nack-echec']);
    expect(notifier.executer).not.toHaveBeenCalled();
  });

  it('remet le message en file à la première panne du traitement', async () => {
    notifier.executer.mockRejectedValue(new Error('base injoignable'));
    const { contexte: ctx } = contexte(false);

    await consommateur.traiter(EVENEMENT, ctx);

    expect(appels).toEqual(['nack-remise']);
  });

  it('envoie le message en file des échecs à la seconde panne : pas de boucle sans fin', async () => {
    notifier.executer.mockRejectedValue(new Error('base injoignable'));
    const { contexte: ctx } = contexte(true);

    await consommateur.traiter(EVENEMENT, ctx);

    expect(appels).toEqual(['nack-echec']);
  });
});
