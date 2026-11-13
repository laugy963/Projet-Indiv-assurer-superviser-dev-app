const base = require('../../jest.base.cjs');

// Tests d'acceptation : les scénarios du backlog, joués de l'extérieur, à travers les deux services déployés.
/** @type {import('jest').Config} */
module.exports = {
  ...base,
  rootDir: __dirname,
  testRegex: 'src/.*\\.acceptation-spec\\.ts$',
  setupFiles: ['<rootDir>/src/preparation.ts'],
  // CA-15 arrête puis relance un service : il lui faut plus que les 5 secondes par défaut.
  testTimeout: 90000,
};
