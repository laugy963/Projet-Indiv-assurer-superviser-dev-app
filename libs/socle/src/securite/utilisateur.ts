/** L'utilisateur authentifié, tel que le jeton le décrit. */
export interface Utilisateur {
  /** Identifiant technique du membre dans Keycloak (revendication « sub »). */
  id: string;
  /** Rôles du royaume (revendication « realm_access.roles »). */
  roles: string[];
}
