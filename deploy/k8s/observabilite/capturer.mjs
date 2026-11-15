// Capture le tableau de bord Grafana du prototype dans des images PNG, sur une période donnée.
// Lancé par capturer.sh, qui ouvre Grafana sur le poste. Ce programme lance un Chrome sans fenêtre et le pilote
// par son protocole de débogage (Chrome DevTools Protocol) : ouvrir une page, attendre les courbes, photographier.
//
//   node capturer.mjs <début> <fin> <dossier de sortie> <préfixe>
//   début et fin : heure locale, par exemple 2026-11-15T16:55
//
// Seul réglage lu dans l'environnement : GRAFANA_MOT_DE_PASSE.
//
// Chrome est piloté par un tube entre les deux processus (« --remote-debugging-pipe »), et non par un port réseau.
// Les deux premières versions ouvraient un port de débogage sur le poste : SonarQube Cloud puis Semgrep ont signalé
// des connexions vers une adresse non vérifiée, puis non chiffrées (15 novembre 2026). Sans port, il n'y a plus
// de connexion à protéger, et aucun autre programme du poste ne peut prendre la main sur ce Chrome.
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const [debut, fin, dossier, prefixe] = process.argv.slice(2);
const motDePasse = process.env.GRAFANA_MOT_DE_PASSE;
if (!debut || !fin || !dossier || !prefixe || !motDePasse) {
  console.error('Usage : capturer.sh <début> <fin> <dossier de sortie> <préfixe>   (heure locale : 2026-11-15T16:55)');
  process.exit(2);
}

// Adresse de Grafana sur le poste : le transfert de port ouvert par capturer.sh. Chemin de Chrome sur macOS.
const GRAFANA = 'http://127.0.0.1:13000';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Identifiant du tableau de bord et numéros de ses panneaux : lus dans tableau-de-bord.json, ou repris de lui.
// eslint-disable-next-line security/detect-non-literal-fs-filename -- chemin fixé ici, voisin de ce programme
const tableau = JSON.parse(await readFile(new URL('./tableau-de-bord.json', import.meta.url), 'utf8'));
const VUES = [
  { nom: 'ensemble', largeur: 1600, hauteur: 1340 },
  { nom: 'i2-temps-de-reponse', panneau: 1, largeur: 1400, hauteur: 700 },
  { nom: 'i4-requetes-reussies', panneau: 2, largeur: 1400, hauteur: 700 },
  { nom: 'pods-et-hpa', panneau: 3, largeur: 1400, hauteur: 700 },
  { nom: 'processeur-par-pod', panneau: 4, largeur: 1400, hauteur: 700 },
  { nom: 'file-du-broker', panneau: 7, largeur: 1400, hauteur: 700 },
];

const pause = (ms) => new Promise((suite) => setTimeout(suite, ms));

// Chrome sans fenêtre, avec un profil provisoire détruit à la fin. Le tube : Chrome lit ses commandes sur le
// descripteur 3 et écrit ses réponses sur le descripteur 4.
const profil = await mkdtemp(path.join(tmpdir(), 'capture-grafana-'));
const chrome = spawn(
  CHROME,
  ['--headless=new', '--remote-debugging-pipe', `--user-data-dir=${profil}`, '--no-first-run', '--hide-scrollbars'],
  { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] },
);
const versChrome = chrome.stdio[3];
const deChrome = chrome.stdio[4];

// Chaque message est un objet JSON terminé par un octet nul. Une commande reçoit une réponse au même numéro.
const attentes = new Map();
let numero = 0;
let recu = '';
deChrome.setEncoding('utf8');
deChrome.on('data', (morceau) => {
  recu += morceau;
  let finDuMessage = recu.indexOf('\0');
  while (finDuMessage !== -1) {
    const reponse = JSON.parse(recu.slice(0, finDuMessage));
    recu = recu.slice(finDuMessage + 1);
    const attente = attentes.get(reponse.id);
    if (attente) {
      attentes.delete(reponse.id);
      if (reponse.error) attente.echec(new Error(reponse.error.message));
      else attente.reussite(reponse.result);
    }
    finDuMessage = recu.indexOf('\0');
  }
});
const commande = (methode, parametres = {}, session = undefined) =>
  new Promise((reussite, echec) => {
    numero += 1;
    attentes.set(numero, { reussite, echec });
    versChrome.write(`${JSON.stringify({ id: numero, method: methode, params: parametres, sessionId: session })}\0`);
  });

try {
  // Un onglet, puis une session attachée à cet onglet : les commandes suivantes lui sont adressées.
  const { targetId } = await commande('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await commande('Target.attachToTarget', { targetId, flatten: true });
  const onglet = (methode, parametres) => commande(methode, parametres, sessionId);

  await onglet('Network.enable');
  // Le compte de Grafana accompagne chaque requête : rien n'est saisi dans la page, rien n'est enregistré sur le disque.
  const identite = Buffer.from(`admin:${motDePasse}`).toString('base64');
  await onglet('Network.setExtraHTTPHeaders', { headers: { Authorization: `Basic ${identite}` } });
  await onglet('Page.enable');

  const de = new Date(debut).getTime();
  const a = new Date(fin).getTime();
  // Le dossier de sortie est choisi par la personne qui lance le script, sur son poste : ce n'est pas une donnée
  // reçue d'un tiers. Même raison pour l'écriture de chaque image, plus bas.
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- argument de la ligne de commande
  await mkdir(dossier, { recursive: true });

  for (const vue of VUES) {
    // Deux fois plus de points que de pixels : les captures restent nettes une fois projetées.
    await onglet('Emulation.setDeviceMetricsOverride', {
      width: vue.largeur,
      height: vue.hauteur,
      deviceScaleFactor: 2,
      mobile: false,
    });
    const reglages = new URLSearchParams({ orgId: '1', from: String(de), to: String(a), timezone: 'browser', theme: 'light' });
    if (vue.panneau) reglages.set('viewPanel', `panel-${vue.panneau}`);
    await onglet('Page.navigate', { url: `${GRAFANA}/d/${tableau.uid}/?${reglages}&kiosk` });

    // Chaque graphique est dessiné dans un élément « canvas ». On attend qu'ils soient tous là (un par panneau),
    // puis que leur nombre ne bouge plus pendant 3 secondes : une première version photographiait trop tôt,
    // et la moitié des panneaux de la vue d'ensemble étaient encore vides.
    const attendus = vue.panneau ? 1 : tableau.panels.length;
    let courbes = 0;
    let stable = 0;
    for (let essai = 0; essai < 90 && stable < 3; essai += 1) {
      await pause(1000);
      const mesure = await onglet('Runtime.evaluate', { expression: 'document.querySelectorAll("canvas").length' });
      stable = mesure.result.value >= attendus && mesure.result.value === courbes ? stable + 1 : 0;
      courbes = mesure.result.value;
    }
    if (courbes < attendus) console.error(`Attention : ${courbes} graphique(s) dessiné(s) sur ${attendus} attendu(s) pour « ${vue.nom} »`);
    // Le tableau de bord se rafraîchit toutes les 10 secondes : on évite de photographier en plein rafraîchissement,
    // quand le bouton « Refresh » affiche « Cancel ».
    for (let essai = 0; essai < 20; essai += 1) {
      const texte = await onglet('Runtime.evaluate', { expression: 'document.body.innerText.includes("Cancel")' });
      if (!texte.result.value) break;
      await pause(500);
    }

    const image = await onglet('Page.captureScreenshot', { format: 'png' });
    const fichier = path.join(dossier, `${prefixe}-${vue.nom}.png`);
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- argument de la ligne de commande
    await writeFile(fichier, Buffer.from(image.data, 'base64'));
    console.log(`${fichier} (${courbes} graphique${courbes > 1 ? 's' : ''} sur ${attendus})`);
  }
} finally {
  // On attend que Chrome soit réellement arrêté avant de détruire son profil provisoire : tant qu'il tourne,
  // il y écrit encore, et la suppression échouait (« directory not empty », constaté le 15 novembre 2026).
  const arrete = new Promise((fini) => chrome.once('exit', fini));
  chrome.kill();
  await arrete;
  await rm(profil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
