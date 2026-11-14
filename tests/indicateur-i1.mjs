// Indicateur I1 : taux de critères d'acceptation prouvés (processus de développement, paragraphe 2).
// Lit les rapports JSON de Jest et compte, pour chaque critère CA-01 à CA-19, les tests réussis
// dont le titre porte son identifiant. Un critère sans test réussi compte comme non prouvé.
//   node tests/indicateur-i1.mjs reports/*.json
import { readFileSync } from 'node:fs';

const CRITERES = Array.from({ length: 19 }, (_, i) => `CA-${String(i + 1).padStart(2, '0')}`);
const reussis = new Map(CRITERES.map((critere) => [critere, 0]));
const echoues = new Map(CRITERES.map((critere) => [critere, 0]));
const niveaux = new Map(CRITERES.map((critere) => [critere, new Set()]));

for (const fichier of process.argv.slice(2)) {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- fichiers donnés par le développeur en ligne de commande
  const rapport = JSON.parse(readFileSync(fichier, 'utf8'));
  for (const suite of rapport.testResults) {
    const niveau = suite.name.includes('/tests/acceptation/') ? 'acceptation' : 'intégration';
    for (const test of suite.assertionResults) {
      for (const critere of test.fullName.match(/CA-\d{2}/g) ?? []) {
        if (!reussis.has(critere)) continue;
        const compteur = test.status === 'passed' ? reussis : echoues;
        compteur.set(critere, compteur.get(critere) + 1);
        niveaux.get(critere).add(niveau);
      }
    }
  }
}

console.log('| Critère | Tests réussis | Tests en échec | Niveau |');
console.log('|---|---|---|---|');
for (const critere of CRITERES) {
  console.log(`| ${critere} | ${reussis.get(critere)} | ${echoues.get(critere)} | ${[...niveaux.get(critere)].sort((a, b) => a.localeCompare(b)).join(', ') || '—'} |`);
}
const prouves = CRITERES.filter((critere) => reussis.get(critere) > 0 && echoues.get(critere) === 0).length;
console.log(`\nI1 = ${prouves} critères prouvés sur ${CRITERES.length}, soit ${Math.round((100 * prouves) / CRITERES.length)} %`);
process.exit(prouves === CRITERES.length ? 0 : 1);
