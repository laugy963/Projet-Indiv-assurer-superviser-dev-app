// Outils des tests d'acceptation. Les tests ne connaissent que ce qu'un client connaît :
// des adresses HTTP et des comptes. Ils n'accèdent ni aux bases ni au broker.
import { execSync } from 'node:child_process';
import request from 'supertest';

// Par défaut : l'environnement Docker Compose du poste. Les mêmes tests visent un autre
// environnement (pipeline, cluster) en changeant ces variables.
const URL_ANNONCES = process.env.URL_ANNONCES ?? 'http://localhost:3001';
const URL_NOTIFICATIONS = process.env.URL_NOTIFICATIONS ?? 'http://localhost:3002';
const URL_JETONS = process.env.URL_JETONS ?? 'http://localhost:8081/realms/epouvante/protocol/openid-connect/token';
const COMPOSE = 'docker compose -f ../environnement/compose.yaml --env-file ../environnement/.env --profile acceptation';
const CMD_ARRET_NOTIFICATIONS = process.env.CMD_ARRET_NOTIFICATIONS ?? `${COMPOSE} stop notifications`;
const CMD_RELANCE_NOTIFICATIONS = process.env.CMD_RELANCE_NOTIFICATIONS ?? `${COMPOSE} start notifications`;

export type Compte = 'membre-a' | 'membre-b' | 'membre-c' | 'moderateur-test';

const VARIABLE_DU_MOT_DE_PASSE: Record<Compte, string> = {
  'membre-a': 'COMPTE_MEMBRE_A_MOT_DE_PASSE',
  'membre-b': 'COMPTE_MEMBRE_B_MOT_DE_PASSE',
  'membre-c': 'COMPTE_MEMBRE_C_MOT_DE_PASSE',
  'moderateur-test': 'COMPTE_MODERATEUR_MOT_DE_PASSE',
};

export const annonces = () => request(URL_ANNONCES);
export const notifications = () => request(URL_NOTIFICATIONS);

/**
 * Demande un jeton à Keycloak pour un compte de test, par connexion directe.
 * Ce mode est réservé au client « tests » et aux comptes de test (fiche 0009).
 */
export async function jeton(compte: Compte): Promise<string> {
  // eslint-disable-next-line security/detect-object-injection -- nom de compte typé, écrit dans les tests
  const motDePasse = process.env[VARIABLE_DU_MOT_DE_PASSE[compte]];
  if (!motDePasse) throw new Error(`Mot de passe du compte ${compte} absent de l'environnement`);
  const reponse = await fetch(URL_JETONS, {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'password', client_id: 'tests', username: compte, password: motDePasse }),
  });
  if (!reponse.ok) throw new Error(`Keycloak a refusé le jeton du compte ${compte} : ${reponse.status}`);
  return ((await reponse.json()) as { access_token: string }).access_token;
}

export async function choisirCentresInteret(compte: Compte, categories: string[]): Promise<void> {
  const reponse = await notifications()
    .put('/api/centres-interet')
    .set('Authorization', `Bearer ${await jeton(compte)}`)
    .send({ categories });
  if (reponse.status !== 200) throw new Error(`Centres d'intérêt de ${compte} : ${reponse.status}`);
}

export interface AnnoncePubliee {
  id: string;
  titre: string;
}

/** Publie une annonce au titre unique, pour la reconnaître parmi celles des exécutions précédentes. */
export async function publierAnnonce(compte: Compte, categorie: string, type: 'troc' | 'don' = 'don') {
  const titre = `Annonce de test ${categorie} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return annonces()
    .post('/api/annonces')
    .set('Authorization', `Bearer ${await jeton(compte)}`)
    .send({ titre, description: 'Annonce publiée par un test d’acceptation.', categorie, type });
}

export interface NotificationRecue {
  id: string;
  annonceId: string;
  titre: string;
  categorie: string;
  typeAnnonce: string;
  date: string;
}

export async function notificationsDe(compte: Compte): Promise<NotificationRecue[]> {
  const reponse = await notifications()
    .get('/api/notifications')
    .set('Authorization', `Bearer ${await jeton(compte)}`);
  if (reponse.status !== 200) throw new Error(`Notifications de ${compte} : ${reponse.status}`);
  return reponse.body.notifications;
}

/** Interroge la liste du membre jusqu'à y trouver la notification de l'annonce. Rend aussi le délai mesuré. */
export async function attendreNotification(
  compte: Compte,
  annonceId: string,
  delaiMaxMs: number,
): Promise<{ notification: NotificationRecue; delaiMs: number }> {
  const depart = Date.now();
  const autorisation = `Bearer ${await jeton(compte)}`;
  for (;;) {
    const reponse = await notifications().get('/api/notifications').set('Authorization', autorisation);
    const trouvee = (reponse.body.notifications as NotificationRecue[] | undefined)?.find((n) => n.annonceId === annonceId);
    if (trouvee) return { notification: trouvee, delaiMs: Date.now() - depart };
    if (Date.now() - depart > delaiMaxMs) {
      throw new Error(`Aucune notification pour l'annonce ${annonceId} après ${delaiMaxMs} ms`);
    }
    await new Promise((suite) => setTimeout(suite, 100));
  }
}

/**
 * Le service notifications répond-il ? Vu de l'extérieur, comme le reste de ces tests :
 * en marche, une route de l'API refuse un appel sans jeton (401). Arrêté, la connexion échoue
 * (Docker Compose) ou le point d'entrée répond 503 (cluster). La route /sante ne convient pas :
 * interne, elle n'est pas exposée par l'Ingress.
 */
async function serviceNotificationsRepond(): Promise<boolean> {
  try {
    const reponse = await fetch(`${URL_NOTIFICATIONS}/api/notifications`, { signal: AbortSignal.timeout(1000) });
    return reponse.status === 401;
  } catch {
    return false;
  }
}

async function attendre(condition: () => Promise<boolean>, delaiMaxMs: number, quoi: string): Promise<number> {
  const depart = Date.now();
  while (!(await condition())) {
    if (Date.now() - depart > delaiMaxMs) throw new Error(`${quoi} : toujours pas après ${delaiMaxMs} ms`);
    await new Promise((suite) => setTimeout(suite, 200));
  }
  return Date.now() - depart;
}

/** Arrête le service notifications et vérifie qu'il ne répond plus. Rend la durée de l'arrêt. */
export async function arreterServiceNotifications(): Promise<number> {
  const depart = Date.now();
  // Commande fixe ou fournie par l'environnement du test, jamais par une donnée extérieure.
  execSync(CMD_ARRET_NOTIFICATIONS, { cwd: __dirname + '/..', stdio: 'pipe' });
  await attendre(async () => !(await serviceNotificationsRepond()), 40000, 'Arrêt du service notifications');
  return Date.now() - depart;
}

/** Relance le service notifications et attend qu'il réponde. Rend la durée de la relance. */
export async function relancerServiceNotifications(): Promise<number> {
  const depart = Date.now();
  execSync(CMD_RELANCE_NOTIFICATIONS, { cwd: __dirname + '/..', stdio: 'pipe' });
  await attendre(serviceNotificationsRepond, 60000, 'Relance du service notifications');
  return Date.now() - depart;
}

/** Écrit une mesure dans la sortie du test : elle est reprise dans le journal de bord. */
export function mesure(libelle: string, valeur: string): void {
  process.stdout.write(`MESURE ${libelle} : ${valeur}\n`);
}
