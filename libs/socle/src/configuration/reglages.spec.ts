import { lireReglages, urlBroker } from './reglages';

const ENVIRONNEMENT = {
  PORT: '3000',
  BDD_HOTE: 'postgres',
  BDD_PORT: '5432',
  BDD_NOM: 'annonces',
  BDD_UTILISATEUR: 'annonces',
  BDD_MOT_DE_PASSE: 'mdp-bdd',
  AMQP_HOTE: 'rabbitmq',
  AMQP_PORT: '5672',
  AMQP_UTILISATEUR: 'annonces',
  AMQP_MOT_DE_PASSE: 'mdp-broker',
  OIDC_EMETTEUR: 'https://auth.epouvante.test/realms/epouvante',
  OIDC_URL_CLES: 'http://keycloak:8080/realms/epouvante/protocol/openid-connect/certs',
  OIDC_AUDIENCE: 'api-epouvante',
};

describe('lireReglages', () => {
  it('lit tous les réglages du service dans l’environnement', () => {
    expect(lireReglages(ENVIRONNEMENT)).toEqual({
      port: 3000,
      bdd: { hote: 'postgres', port: 5432, nom: 'annonces', utilisateur: 'annonces', motDePasse: 'mdp-bdd' },
      broker: { hote: 'rabbitmq', port: 5672, utilisateur: 'annonces', motDePasse: 'mdp-broker' },
      oidc: {
        emetteur: 'https://auth.epouvante.test/realms/epouvante',
        urlCles: 'http://keycloak:8080/realms/epouvante/protocol/openid-connect/certs',
        audience: 'api-epouvante',
      },
    });
  });

  it.each(Object.keys(ENVIRONNEMENT))('refuse de démarrer sans la variable %s', (variable) => {
    expect(() => lireReglages({ ...ENVIRONNEMENT, [variable]: undefined })).toThrow(variable);
  });

  it('règle séparément l’émetteur attendu et l’adresse des clés (règle du bac à sable)', () => {
    const { oidc } = lireReglages(ENVIRONNEMENT);
    expect(new URL(oidc.emetteur).host).not.toBe(new URL(oidc.urlCles).host);
  });
});

describe('urlBroker', () => {
  it('compose l’adresse AMQP du broker', () => {
    expect(urlBroker({ hote: 'rabbitmq', port: 5672, utilisateur: 'annonces', motDePasse: 'abc123' })).toBe(
      'amqp://annonces:abc123@rabbitmq:5672',
    );
  });

  it('encode un mot de passe qui contient des caractères réservés d’une adresse', () => {
    const url = urlBroker({ hote: 'rabbitmq', port: 5672, utilisateur: 'annonces', motDePasse: 'p@ss/w:rd' });
    expect(new URL(url).hostname).toBe('rabbitmq');
    expect(decodeURIComponent(new URL(url).password)).toBe('p@ss/w:rd');
  });
});
