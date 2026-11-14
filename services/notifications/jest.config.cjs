const path = require('node:path');
const base = require('../../jest.base.cjs');

// Deux niveaux de tests, visibles dans l'arborescence (fiche 0005) :
//   unitaire    : src/**/*.spec.ts — une règle ou un cas d'usage, sans base ni broker ;
//   integration : test/integration — le service complet, avec PostgreSQL et RabbitMQ réels.
/** @type {import('jest').Config} */
module.exports = {
  projects: [
    { ...base, displayName: 'unitaire', rootDir: __dirname, testRegex: 'src/.*\\.spec\\.ts$' },
    {
      ...base,
      displayName: 'integration',
      rootDir: __dirname,
      testRegex: 'test/integration/.*\\.int-spec\\.ts$',
      setupFiles: ['<rootDir>/test/integration/preparation.ts'],
    },
  ],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/main.ts', '!src/migrer.ts'],
  coverageDirectory: 'coverage',
  // Rapports de couverture : le tableau dans la sortie, et un fichier lcov que le pipeline transmet à SonarQube Cloud.
  // « projectRoot » : les chemins du fichier lcov partent de la racine du dépôt, et non du paquet.
  // Sans cela, SonarQube Cloud ne saurait pas à quel paquet rattacher « src/… ».
  coverageReporters: ['text', ['lcov', { projectRoot: path.join(__dirname, '../..') }]],
};
