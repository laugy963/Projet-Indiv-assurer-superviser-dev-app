// Test de charge du prototype, joué par k6 (fiche 0005) à travers l'Ingress, en HTTPS, avec de vrais jetons de Keycloak.
// Il mesure les indicateurs I2 (temps de réponse au 95e centile d'une publication) et I4 (taux de requêtes réussies),
// et il fait monter la charge pour observer la mise à l'échelle automatique.
// Lancement : tests/charge/lancer.sh (le scénario lit ses réglages dans des variables d'environnement).
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';
import { Counter, Trend } from 'k6/metrics';

const URL_API = __ENV.URL_API;
const URL_JETONS = __ENV.URL_JETONS;
const MOT_DE_PASSE = __ENV.COMPTE_CHARGE_MOT_DE_PASSE;

// Charge nominale : 50 utilisateurs simultanés (hypothèse : 5 000 membres, dont 1 % connectés en même temps).
// Pointe : 4 fois la charge nominale (festival, mise en vente d'une figurine exclusive).
const NOMINALE = Number(__ENV.CHARGE_NOMINALE || 50);
const POINTE = Number(__ENV.CHARGE_POINTE || 200);
// Essai court, pour valider le scénario sans attendre 13 minutes : tests/charge/lancer.sh essai
const ESSAI = __ENV.CHARGE_ESSAI === '1';
const SECONDE = ESSAI ? 0.1 : 1;

// Paliers du test. Les indicateurs I2 et I4 se lisent sur le palier « nominale ».
const PALIERS = [
  { nom: 'montee', duree: 60 * SECONDE, cible: NOMINALE }, //          de 0 à la charge nominale
  { nom: 'nominale', duree: 180 * SECONDE, cible: NOMINALE }, //       charge nominale : mesure de I2 et I4
  { nom: 'montee-pointe', duree: 60 * SECONDE, cible: POINTE }, //     la charge est multipliée par 4
  { nom: 'pointe', duree: 240 * SECONDE, cible: POINTE }, //           pointe : le HPA doit ajouter des pods
  { nom: 'descente', duree: 60 * SECONDE, cible: NOMINALE },
  { nom: 'retour', duree: 180 * SECONDE, cible: NOMINALE }, //         retour à la charge nominale
];
const DUREE_TOTALE = PALIERS.reduce((somme, palier) => somme + palier.duree, 0);

const CATEGORIES = ['figurines', 'jeux-de-societe', 'bd', 'dvd-blu-ray', 'fanzines', 'autres'];

// Délai entre la publication d'une annonce et la notification visible par un membre intéressé (critère CA-11, hypothèse H5).
const delaiNotification = new Trend('delai_notification', true);
const notificationsNonVues = new Counter('notifications_non_vues');

// Indicateur I4 : une requête est en échec si le serveur répond par une erreur (5xx) ou ne répond pas.
// Un refus (4xx) est une réponse correcte du serveur ; les contrôles « check » vérifient, eux, le code attendu.
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 499 }));

export const options = {
  scenarios: {
    // Les membres : le nombre d'utilisateurs simultanés suit les paliers.
    membres: {
      executor: 'ramping-vus',
      exec: 'membre',
      startVUs: 0,
      stages: PALIERS.map((palier) => ({ duration: `${Math.round(palier.duree)}s`, target: palier.cible })),
      gracefulRampDown: '10s',
      gracefulStop: '10s',
    },
    // Un observateur : il publie une annonce toutes les 5 secondes et mesure le délai de la notification.
    observateur: {
      executor: 'constant-vus',
      exec: 'observateur',
      vus: 1,
      duration: `${Math.round(DUREE_TOTALE)}s`,
      gracefulStop: '15s',
    },
  },
  thresholds: {
    // I2 — efficacité de la performance : 95 % des publications en moins de 500 ms, à la charge nominale.
    'http_req_duration{name:publier,phase:nominale}': ['p(95)<500'],
    // I4 — fiabilité : au moins 99 % de requêtes réussies, à la charge nominale et en pointe.
    'http_req_failed{phase:nominale}': ['rate<0.01'],
    'http_req_failed{phase:pointe}': ['rate<0.01'],
    // Hypothèse H5 du backlog : la notification est visible en moins de 5 secondes, ici sous charge.
    'delai_notification{phase:nominale}': ['p(95)<5000'],
    // Les réponses ont le code attendu (200 ou 201).
    checks: ['rate>0.99'],
    // Mesures relevées sans seuil bloquant : elles apparaissent dans le résumé, pour l'analyse.
    'http_req_duration{name:publier,phase:pointe}': ['p(95)>=0'],
    'http_req_duration{name:publier,phase:retour}': ['p(95)>=0'],
    'http_req_duration{name:lister,phase:nominale}': ['p(95)>=0'],
    'http_req_duration{name:lister,phase:pointe}': ['p(95)>=0'],
    'http_req_duration{name:notifications,phase:nominale}': ['p(95)>=0'],
    'http_req_duration{name:notifications,phase:pointe}': ['p(95)>=0'],
    'http_req_duration{name:jeton}': ['p(95)>=0'],
    'http_req_failed{phase:retour}': ['rate>=0'],
    'delai_notification{phase:pointe}': ['p(95)>=0'],
    'delai_notification{phase:retour}': ['p(95)>=0'],
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max', 'count'],
};

// Exécuté une fois, avant les utilisateurs : l'heure de départ sert à savoir dans quel palier tombe chaque requête.
export function setup() {
  if (!URL_API || !URL_JETONS || !MOT_DE_PASSE) {
    exec.test.abort('Réglages absents : lancer le test par tests/charge/lancer.sh');
  }
  return { depart: Date.now() };
}

// Nom du palier en cours : chaque requête le porte en étiquette, et les seuils portent sur un palier précis.
function palierCourant(donnees) {
  let ecoule = (Date.now() - donnees.depart) / 1000;
  for (const palier of PALIERS) {
    if (ecoule < palier.duree) return palier.nom;
    ecoule -= palier.duree;
  }
  return 'fin';
}

// Chaque utilisateur virtuel a ses propres variables : son jeton, et ce qu'il a déjà fait.
let jeton = null;
let jetonObtenuLe = 0;
let centresDeclares = false;

// Demande un jeton à Keycloak, puis le garde 90 secondes : il en vit 120 (deploy/keycloak/epouvante-realm.json).
function jetonDe(compte, phase) {
  if (jeton && Date.now() - jetonObtenuLe < 90000) return jeton;
  const reponse = http.post(
    URL_JETONS,
    { grant_type: 'password', client_id: 'tests', username: compte, password: MOT_DE_PASSE },
    { tags: { name: 'jeton', phase } },
  );
  if (!check(reponse, { 'jeton : 200': (r) => r.status === 200 })) {
    jeton = null;
    return null;
  }
  jeton = reponse.json('access_token');
  jetonObtenuLe = Date.now();
  return jeton;
}

function entetes(jetonAcces) {
  return { Authorization: `Bearer ${jetonAcces}`, 'Content-Type': 'application/json' };
}

function publier(jetonAcces, categorie, phase, nom) {
  const corps = JSON.stringify({
    titre: `Annonce du test de charge ${exec.vu.idInTest}-${exec.vu.iterationInScenario}`,
    description: 'Annonce publiée par le test de charge du prototype.',
    categorie,
    type: Math.random() < 0.5 ? 'troc' : 'don',
  });
  return http.post(`${URL_API}/api/annonces`, corps, { headers: entetes(jetonAcces), tags: { name: nom, phase } });
}

// Un membre : il déclare ses centres d'intérêt une fois, puis à chaque passage il consulte les annonces,
// consulte ses notifications et, une fois sur cinq, publie une annonce. Il agit toutes les 1 à 3 secondes :
// plus vite qu'un utilisateur réel, ce qui donne une marge de sécurité à la mesure.
export function membre(donnees) {
  const phase = palierCourant(donnees);
  const numero = exec.vu.idInTest;
  const jetonAcces = jetonDe(`charge-${String(numero).padStart(3, '0')}`, phase);
  if (!jetonAcces) {
    sleep(1);
    return;
  }

  if (!centresDeclares) {
    // Deux catégories par membre, réparties selon son numéro : chaque annonce intéresse un tiers des membres.
    const categories = [CATEGORIES[numero % 6], CATEGORIES[(numero + 1) % 6]];
    const reponse = http.put(`${URL_API}/api/centres-interet`, JSON.stringify({ categories }), {
      headers: entetes(jetonAcces),
      tags: { name: 'centres-interet', phase },
    });
    centresDeclares = check(reponse, { 'centres d’intérêt : 200': (r) => r.status === 200 });
  }

  const liste = http.get(`${URL_API}/api/annonces`, { headers: entetes(jetonAcces), tags: { name: 'lister', phase } });
  check(liste, { 'liste des annonces : 200': (r) => r.status === 200 });
  sleep(0.5 + Math.random());

  const recues = http.get(`${URL_API}/api/notifications`, {
    headers: entetes(jetonAcces),
    tags: { name: 'notifications', phase },
  });
  check(recues, { 'notifications : 200': (r) => r.status === 200 });

  if (Math.random() < 0.2) {
    const publication = publier(jetonAcces, CATEGORIES[Math.floor(Math.random() * 6)], phase, 'publier');
    check(publication, { 'publication : 201': (r) => r.status === 201 });
  }
  sleep(1 + Math.random() * 2);
}

// L'observateur : deux comptes à lui. A publie une annonce ; B, qui a choisi la catégorie, interroge sa liste
// jusqu'à y trouver la notification. C'est le critère CA-11, mesuré pendant que les membres chargent la plateforme.
let jetonB = null;
let jetonBObtenuLe = 0;
let observateurPret = false;

function jetonObservateurB(phase) {
  if (jetonB && Date.now() - jetonBObtenuLe < 90000) return jetonB;
  const reponse = http.post(
    URL_JETONS,
    { grant_type: 'password', client_id: 'tests', username: 'charge-observateur-b', password: MOT_DE_PASSE },
    { tags: { name: 'jeton', phase } },
  );
  if (reponse.status !== 200) return null;
  jetonB = reponse.json('access_token');
  jetonBObtenuLe = Date.now();
  return jetonB;
}

export function observateur(donnees) {
  const phase = palierCourant(donnees);
  const jetonA = jetonDe('charge-observateur-a', phase);
  const jetonDeB = jetonObservateurB(phase);
  if (!jetonA || !jetonDeB) {
    sleep(1);
    return;
  }

  if (!observateurPret) {
    const reponse = http.put(`${URL_API}/api/centres-interet`, JSON.stringify({ categories: ['fanzines'] }), {
      headers: entetes(jetonDeB),
      tags: { name: 'centres-interet', phase },
    });
    observateurPret = reponse.status === 200;
  }

  const depart = Date.now();
  const publication = publier(jetonA, 'fanzines', phase, 'publier-observateur');
  if (publication.status !== 201) {
    sleep(5);
    return;
  }
  const annonceId = publication.json('id');

  let vue = false;
  while (Date.now() - depart < 10000) {
    const recues = http.get(`${URL_API}/api/notifications`, {
      headers: entetes(jetonDeB),
      tags: { name: 'notifications-observateur', phase },
    });
    if (recues.status === 200 && recues.json('notifications').some((n) => n.annonceId === annonceId)) {
      delaiNotification.add(Date.now() - depart, { phase });
      vue = true;
      break;
    }
    sleep(0.1);
  }
  if (!vue) notificationsNonVues.add(1, { phase });
  sleep(5);
}
