const base = require('../../jest.base.cjs');

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  rootDir: __dirname,
  testRegex: 'src/.*\\.spec\\.ts$',
  // demarrage.ts est du code de démarrage, comme le main.ts des services : il ne s'exécute que dans les conteneurs.
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/index.ts', '!src/demarrage.ts'],
  coverageDirectory: 'coverage',
};
