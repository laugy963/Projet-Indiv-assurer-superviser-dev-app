import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { Utilisateur } from './utilisateur';

export const CLE_ROLES = 'epouvante:roles';
export const CLE_ROUTE_INTERNE = 'epouvante:route-interne';

export type Role = 'membre' | 'moderateur';

/** Rôles autorisés sur la route : il suffit d'en porter un. Sans ce décorateur, la route est refusée à tous. */
export const Roles = (...roles: Role[]) => SetMetadata(CLE_ROLES, roles);

/** Route interne au cluster (sonde de santé) : sans jeton, et jamais exposée par l'Ingress. */
export const RouteInterne = () => SetMetadata(CLE_ROUTE_INTERNE, true);

/** L'utilisateur que la garde a vérifié. L'identité vient du jeton, jamais d'un paramètre de la requête. */
export const UtilisateurCourant = createParamDecorator((_donnee: unknown, contexte: ExecutionContext): Utilisateur => {
  return contexte.switchToHttp().getRequest<{ utilisateur: Utilisateur }>().utilisateur;
});
