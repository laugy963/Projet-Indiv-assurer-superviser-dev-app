// Capture le tableau de bord Grafana du prototype dans des images PNG, sur une période donnée.
// Lancé par capturer.sh, qui prépare Grafana et un Chrome sans affichage ; ce programme pilote ce Chrome
// par son protocole de débogage (Chrome DevTools Protocol) : ouvrir une page, attendre les courbes, photographier.
//
//   node capturer.mjs <début> <fin> <dossier de sortie> <préfixe>
//   début et fin : heure locale, par exemple 2026-11-15T16:55
//
// Seul réglage lu dans l'environnement : GRAFANA_MOT_DE_PASSE.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [debut, fin, dossier, prefixe] = process.argv.slice(2);
// Adresses locales, fixées ici et dans capturer.sh : le programme ne se connecte à aucune adresse reçue d'ailleurs.
// SonarQube Cloud a signalé la première version, qui lisait ces adresses dans l'environnement puis dans la réponse
// de Chrome sans les vérifier (constats S7044, S8476 et S8480 du 15 novembre 2026).
const GRAFANA = 'http://127.0.0.1:13000';
const CHROME = '127.0.0.1:9333';
const motDePasse = process.env.GRAFANA_MOT_DE_PASSE;
if (!debut || !fin || !dossier || !prefixe || !motDePasse) {
  console.error('Usage : capturer.sh <début> <fin> <dossier de sortie> <préfixe>   (heure locale : 2026-11-15T16:55)');
  process.exit(2);
}

// Identifiant du tableau de bord et numéros de ses panneaux : lus dans tableau-de-bord.json, ou repris de lui.
// eslint-disable-next-line security/detect-non-literal-fs-filename -- chemin fixé ici, voisin de ce programme
const tableau = JSON.parse(await readFile(new URL('./tableau-de-bord.json', import.meta.url), 'utf8'));
const TABLEAU = tableau.uid;
const VUES = [
  { nom: 'ensemble', largeur: 1600, hauteur: 1340 },
  { nom: 'i2-temps-de-reponse', panneau: 1, largeur: 1400, hauteur: 700 },
  { nom: 'i4-requetes-reussies', panneau: 2, largeur: 1400, hauteur: 700 },
  { nom: 'pods-et-hpa', panneau: 3, largeur: 1400, hauteur: 700 },
  { nom: 'processeur-par-pod', panneau: 4, largeur: 1400, hauteur: 700 },
  { nom: 'file-du-broker', panneau: 7, largeur: 1400, hauteur: 700 },
];

const pause = (ms) => new Promise((suite) => setTimeout(suite, ms));

// Un onglet neuf, puis une connexion WebSocket à cet onglet : chaque commande reçoit une réponse au même numéro.
// De la réponse de Chrome, on ne garde que l'identifiant de l'onglet, après avoir vérifié sa forme :
// l'adresse de la connexion est construite ici, elle n'est pas reprise telle quelle.
const reponseOnglet = await (await fetch(`http://${CHROME}/json/new?about:blank`, { method: 'PUT' })).json();
const ongletId = String(reponseOnglet.id);
if (!/^[0-9A-F]{32}$/.test(ongletId)) throw new Error('Identifiant d’onglet inattendu dans la réponse de Chrome');
const liaison = new WebSocket(`ws://${CHROME}/devtools/page/${ongletId}`);
await new Promise((ouverte, erreur) => {
  liaison.onopen = ouverte;
  liaison.onerror = erreur;
});
const attentes = new Map();
let numero = 0;
liaison.onmessage = (message) => {
  const reponse = JSON.parse(message.data);
  const attente = attentes.get(reponse.id);
  if (!attente) return;
  attentes.delete(reponse.id);
  if (reponse.error) attente.echec(new Error(reponse.error.message));
  else attente.reussite(reponse.result);
};
const commande = (methode, parametres = {}) =>
  new Promise((reussite, echec) => {
    numero += 1;
    attentes.set(numero, { reussite, echec });
    liaison.send(JSON.stringify({ id: numero, method: methode, params: parametres }));
  });

await commande('Network.enable');
// Le compte de Grafana accompagne chaque requête : rien n'est saisi dans la page, rien n'est enregistré sur le disque.
const identite = Buffer.from(`admin:${motDePasse}`).toString('base64');
await commande('Network.setExtraHTTPHeaders', { headers: { Authorization: `Basic ${identite}` } });
await commande('Page.enable');

const de = new Date(debut).getTime();
const a = new Date(fin).getTime();
// Le dossier de sortie est choisi par la personne qui lance le script, sur son poste : ce n'est pas une donnée
// reçue d'un tiers. Même raison pour l'écriture de chaque image, plus bas.
// eslint-disable-next-line security/detect-non-literal-fs-filename -- argument de la ligne de commande
await mkdir(dossier, { recursive: true });

for (const vue of VUES) {
  // Deux fois plus de points que de pixels : les captures restent nettes une fois projetées.
  await commande('Emulation.setDeviceMetricsOverride', {
    width: vue.largeur,
    height: vue.hauteur,
    deviceScaleFactor: 2,
    mobile: false,
  });
  const reglages = new URLSearchParams({ orgId: '1', from: String(de), to: String(a), timezone: 'browser', theme: 'light' });
  if (vue.panneau) reglages.set('viewPanel', `panel-${vue.panneau}`);
  await commande('Page.navigate', { url: `${GRAFANA}/d/${TABLEAU}/?${reglages}&kiosk` });

  // Chaque graphique est dessiné dans un élément « canvas ». On attend qu'ils soient tous là (un par panneau),
  // puis que leur nombre ne bouge plus pendant 3 secondes : une première version photographiait trop tôt,
  // et la moitié des panneaux de la vue d'ensemble étaient encore vides.
  const attendus = vue.panneau ? 1 : tableau.panels.length;
  let courbes = 0;
  let stable = 0;
  for (let essai = 0; essai < 90 && stable < 3; essai += 1) {
    await pause(1000);
    const mesure = await commande('Runtime.evaluate', { expression: 'document.querySelectorAll("canvas").length' });
    stable = mesure.result.value >= attendus && mesure.result.value === courbes ? stable + 1 : 0;
    courbes = mesure.result.value;
  }
  if (courbes < attendus) console.error(`Attention : ${courbes} graphique(s) dessiné(s) sur ${attendus} attendu(s) pour « ${vue.nom} »`);
  // Le tableau de bord se rafraîchit toutes les 10 secondes : on évite de photographier en plein rafraîchissement,
  // quand le bouton « Refresh » affiche « Cancel ».
  for (let essai = 0; essai < 20; essai += 1) {
    const texte = await commande('Runtime.evaluate', { expression: 'document.body.innerText.includes("Cancel")' });
    if (!texte.result.value) break;
    await pause(500);
  }

  const image = await commande('Page.captureScreenshot', { format: 'png' });
  const fichier = path.join(dossier, `${prefixe}-${vue.nom}.png`);
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- argument de la ligne de commande
  await writeFile(fichier, Buffer.from(image.data, 'base64'));
  console.log(`${fichier} (${courbes} graphique${courbes > 1 ? 's' : ''} sur ${attendus})`);
}

await fetch(`http://${CHROME}/json/close/${ongletId}`);
liaison.close();
