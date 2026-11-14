const path = require('node:path');
const base = require('../../jest.base.cjs');

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  rootDir: __dirname,
  testRegex: 'src/.*\\.spec\\.ts$',
  // demarrage.ts est du code de démarrage, comme le main.ts des services : il ne s'exécute que dans les conteneurs.
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/index.ts', '!src/demarrage.ts'],
  coverageDirectory: 'coverage',
  // Rapports de couverture : le tableau dans la sortie, et un fichier lcov que le pipeline transmet à SonarQube Cloud.
  // « projectRoot » : les chemins du fichier lcov partent de la racine du dépôt, et non du paquet.
  // Sans cela, SonarQube Cloud ne saurait pas à quel paquet rattacher « src/… ».
  coverageReporters: ['text', ['lcov', { projectRoot: path.join(__dirname, '../..') }]],
  // Seuil bloquant du processus de développement (paragraphe 4.3) : le socle n'a que des tests unitaires.
  // Pour les services, la couverture se lit sur les tests unitaires et d'intégration réunis :
  // le seuil est alors vérifié par le quality gate (job « qualite »).
  coverageThreshold: { global: { lines: 80 } },
};
