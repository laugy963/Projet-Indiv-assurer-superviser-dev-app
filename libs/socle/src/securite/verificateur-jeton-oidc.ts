import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Utilisateur } from './utilisateur';
import { JetonRefuse, VerificateurJeton } from './verificateur-jeton';

export interface ReglagesOidc {
  /** Émetteur attendu : l'adresse publique du royaume, telle qu'elle est écrite dans les jetons. */
  emetteur: string;
  /** Adresse où lire les clés publiques du royaume : une adresse interne au cluster. */
  urlCles: string;
  /** Destinataire attendu : le jeton doit avoir été émis pour cette API. */
  audience: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Vérification locale d'un jeton OpenID Connect (fiches 0009 et 0014).
 * Les clés publiques sont lues au premier besoin puis gardées en cache :
 * aucune requête à Keycloak n'est faite pour vérifier un jeton.
 */
export class VerificateurJetonOidc extends VerificateurJeton {
  private readonly cles: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly reglages: ReglagesOidc) {
    super();
    this.cles = createRemoteJWKSet(new URL(reglages.urlCles));
  }

  async verifier(jeton: string): Promise<Utilisateur> {
    let contenu;
    try {
      // Signature, émetteur, audience et expiration sont vérifiés ici. Seul RS256 est accepté :
      // un jeton « none » ou signé par un secret partagé (HS256) est refusé.
      ({ payload: contenu } = await jwtVerify(jeton, this.cles, {
        issuer: this.reglages.emetteur,
        audience: this.reglages.audience,
        algorithms: ['RS256'],
        requiredClaims: ['sub', 'exp'],
      }));
    } catch (erreur) {
      throw new JetonRefuse(motifDe(erreur));
    }

    // L'identité sert de clé dans les bases : elle doit être l'UUID que Keycloak attribue.
    if (typeof contenu.sub !== 'string' || !UUID.test(contenu.sub)) {
      throw new JetonRefuse('SUJET_INVALIDE');
    }

    // Keycloak range les rôles du royaume dans « realm_access.roles ».
    const acces = contenu.realm_access as { roles?: unknown } | undefined;
    const roles = Array.isArray(acces?.roles) ? acces.roles.filter((role): role is string => typeof role === 'string') : [];

    return { id: contenu.sub, roles };
  }
}

function motifDe(erreur: unknown): string {
  if (typeof erreur === 'object' && erreur !== null) {
    const { code, name } = erreur as { code?: unknown; name?: unknown };
    if (typeof code === 'string') return code;
    if (typeof name === 'string') return name;
  }
  return 'ERREUR_INCONNUE';
}
