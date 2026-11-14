import type { Utilisateur } from './utilisateur';

/** Un jeton refusé. Le motif est destiné au journal du service, jamais à la réponse HTTP. */
export class JetonRefuse extends Error {
  constructor(readonly motif: string) {
    super('jeton refusé');
    this.name = 'JetonRefuse';
  }
}

/**
 * Port de vérification d'un jeton d'accès.
 * La garde ne connaît que ce contrat : elle se teste sans réseau, avec un double.
 */
export abstract class VerificateurJeton {
  /** Rend l'utilisateur décrit par le jeton, ou lève JetonRefuse. */
  abstract verifier(jeton: string): Promise<Utilisateur>;
}
