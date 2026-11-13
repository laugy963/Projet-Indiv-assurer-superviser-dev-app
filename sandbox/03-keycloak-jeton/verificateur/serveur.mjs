// Vérificateur de jetons du bac à sable.
// Un petit serveur HTTP qui fait ce que fera chaque service du prototype (fiche 0009) :
// vérifier la signature du jeton, son émetteur, sa date d'expiration, puis le rôle exigé par la route.
import http from 'node:http';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const EMETTEUR = process.env.EMETTEUR;   // émetteur attendu : l'adresse publique du royaume Keycloak
const URL_CLES = process.env.URL_CLES;   // adresse interne au cluster où lire les clés publiques
const PORT = 8080;

// Les clés publiques sont téléchargées au premier besoin, puis gardées en cache :
// la vérification ne demande aucun appel à Keycloak par requête.
const cles = createRemoteJWKSet(new URL(URL_CLES));

const ROLE_EXIGE = { '/membre': 'membre', '/moderateur': 'moderateur' };

function repondre(reponse, code, corps) {
  reponse.writeHead(code, { 'Content-Type': 'application/json' });
  reponse.end(JSON.stringify(corps));
}

const serveur = http.createServer(async (requete, reponse) => {
  const chemin = new URL(requete.url, 'http://localhost').pathname;
  if (chemin === '/sante') return repondre(reponse, 200, { etat: 'ok' });

  const role = ROLE_EXIGE[chemin];
  if (!role) return repondre(reponse, 404, { erreur: 'ressource absente' });

  const entete = requete.headers.authorization || '';
  if (!entete.startsWith('Bearer ')) return repondre(reponse, 401, { erreur: 'jeton absent' });

  let contenu;
  try {
    // Signature, émetteur et expiration sont vérifiés ici. Seul l'algorithme RS256 est accepté.
    ({ payload: contenu } = await jwtVerify(entete.slice(7), cles, { issuer: EMETTEUR, algorithms: ['RS256'] }));
  } catch (erreur) {
    // Le motif précis reste dans le journal du serveur : la réponse au client n'en dit rien.
    console.log(JSON.stringify({ etat: 'jeton-refuse', motif: erreur.code || erreur.name }));
    return repondre(reponse, 401, { erreur: 'jeton invalide' });
  }

  // Keycloak range les rôles du royaume dans la revendication realm_access.roles.
  const roles = contenu.realm_access?.roles ?? [];
  if (!roles.includes(role)) return repondre(reponse, 403, { erreur: 'rôle insuffisant' });

  // L'identité vient du jeton (revendication sub), jamais d'un paramètre de la requête.
  return repondre(reponse, 200, { acces: 'autorisé', sujet: contenu.sub, roleExige: role });
});

serveur.listen(PORT, () => console.log(JSON.stringify({ etat: 'pret', port: PORT, emetteur: EMETTEUR })));

// Arrêt propre : sans ce traitement, le pod met 30 secondes à s'arrêter (constat de l'expérimentation 1).
const arreter = () => serveur.close(() => process.exit(0));
process.on('SIGTERM', arreter);
process.on('SIGINT', arreter);
