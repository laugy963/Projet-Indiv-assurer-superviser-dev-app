import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CLE_ROLES, CLE_ROUTE_INTERNE } from './decorateurs';
import type { Utilisateur } from './utilisateur';
import { JetonRefuse, VerificateurJeton } from './verificateur-jeton';

interface RequeteHttp {
  headers: Record<string, string | string[] | undefined>;
  utilisateur?: Utilisateur;
}

/**
 * Garde appliquée à toutes les routes de chaque service (bonne pratique de sécurité n° 1).
 * Elle s'exécute avant la validation et avant le contrôleur : une requête refusée ne lit ni ne modifie rien.
 *   1. authentification : jeton absent ou refusé -> 401 ;
 *   2. autorisation : aucun des rôles exigés par la route -> 403.
 * Une route qui ne déclare aucun rôle est refusée : l'oubli d'un décorateur ferme la route au lieu de l'ouvrir.
 */
@Injectable()
export class GardeAcces implements CanActivate {
  private readonly journal = new Logger(GardeAcces.name);

  constructor(
    private readonly reflecteur: Reflector,
    private readonly verificateur: VerificateurJeton,
  ) {}

  async canActivate(contexte: ExecutionContext): Promise<boolean> {
    // Un message du broker ne porte pas de jeton : c'est le compte du service sur le broker qui l'authentifie.
    if (contexte.getType() !== 'http') return true;

    const cibles = [contexte.getHandler(), contexte.getClass()];
    if (this.reflecteur.getAllAndOverride<boolean>(CLE_ROUTE_INTERNE, cibles)) return true;

    const requete = contexte.switchToHttp().getRequest<RequeteHttp>();
    const jeton = extraireJeton(requete.headers.authorization);
    if (!jeton) throw new UnauthorizedException();

    try {
      requete.utilisateur = await this.verificateur.verifier(jeton);
    } catch (erreur) {
      // Le motif précis reste dans le journal : la réponse au client n'en dit rien.
      const motif = erreur instanceof JetonRefuse ? erreur.motif : 'VERIFICATION_IMPOSSIBLE';
      this.journal.warn({ etat: 'jeton-refuse', motif });
      throw new UnauthorizedException();
    }

    const rolesExiges = this.reflecteur.getAllAndOverride<string[]>(CLE_ROLES, cibles) ?? [];
    const rolesPortes = requete.utilisateur.roles;
    if (!rolesExiges.some((role) => rolesPortes.includes(role))) throw new ForbiddenException();

    return true;
  }
}

/** Lit « Bearer <jeton> ». Tout autre format est traité comme une absence de jeton. */
function extraireJeton(entete: string | string[] | undefined): string | undefined {
  if (typeof entete !== 'string') return undefined;
  const [schema, jeton, ...reste] = entete.split(' ');
  if (schema !== 'Bearer' || !jeton || reste.length > 0) return undefined;
  return jeton;
}
