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
};
