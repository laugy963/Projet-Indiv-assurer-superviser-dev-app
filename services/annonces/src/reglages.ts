import { lireVariable, type ReglagesOidc } from '@epouvante/socle';

export interface Reglages {
  port: number;
  bdd: { hote: string; port: number; nom: string; utilisateur: string; motDePasse: string };
  broker: { hote: string; port: number; utilisateur: string; motDePasse: string };
  oidc: ReglagesOidc;
}

/** Tous les réglages viennent de l'environnement ; les mots de passe, d'un objet Secret. Rien n'est écrit dans le code. */
export function lireReglages(env: Record<string, string | undefined> = process.env): Reglages {
  return {
    port: Number(lireVariable('PORT', env)),
    bdd: {
      hote: lireVariable('BDD_HOTE', env),
      port: Number(lireVariable('BDD_PORT', env)),
      nom: lireVariable('BDD_NOM', env),
      utilisateur: lireVariable('BDD_UTILISATEUR', env),
      motDePasse: lireVariable('BDD_MOT_DE_PASSE', env),
    },
    broker: {
      hote: lireVariable('AMQP_HOTE', env),
      port: Number(lireVariable('AMQP_PORT', env)),
      utilisateur: lireVariable('AMQP_UTILISATEUR', env),
      motDePasse: lireVariable('AMQP_MOT_DE_PASSE', env),
    },
    oidc: {
      emetteur: lireVariable('OIDC_EMETTEUR', env),
      urlCles: lireVariable('OIDC_URL_CLES', env),
      audience: lireVariable('OIDC_AUDIENCE', env),
    },
  };
}

export function urlBroker(broker: Reglages['broker']): string {
  return `amqp://${encodeURIComponent(broker.utilisateur)}:${encodeURIComponent(broker.motDePasse)}@${broker.hote}:${broker.port}`;
}
