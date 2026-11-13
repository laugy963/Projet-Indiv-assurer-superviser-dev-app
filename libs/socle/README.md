# Socle technique commun

Paquet interne `@epouvante/socle` : le code technique que les deux services partagent (fiche 0012). Il ne contient aucune règle métier et aucun élément du contrat de l'événement.

Un service qui importe `SocleModule` reçoit, sur toutes ses routes : la garde d'accès, le filtre d'erreurs, la validation par liste blanche et la route interne `/sante`.

| Dossier | Contenu |
|---|---|
| `src/securite/` | Garde d'accès (401, puis 403), vérification locale du jeton, décorateurs `@Roles`, `@RouteInterne`, `@UtilisateurCourant` |
| `src/erreurs/` | Filtre d'erreurs : un libellé fixe par code HTTP, aucun détail technique dans la réponse |
| `src/validation/` | Validation des entrées : tout champ non prévu est refusé |
| `src/configuration/` | Lecture des réglages dans l'environnement |
| `src/sante/` | Route interne `/sante` |
| `src/demarrage.ts` | Démarrage d'un service : journaux JSON, arrêt propre au signal `SIGTERM`, programme de migration |
| `outils-de-test/` | Émetteur de jetons de test, sonde du broker, banc d'intégration. Non compilé dans les images |

Une route qui ne déclare aucun rôle est fermée à tous : oublier `@Roles` ferme la route au lieu de l'ouvrir.

Tests : `npm run test:unit -w @epouvante/socle` (70 tests, exécutés avec succès le 13 novembre 2026).
