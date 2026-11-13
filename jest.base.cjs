// Réglages Jest communs à tous les paquets du dépôt.
// NestJS 12 est publié en modules ES : Jest ne les charge par « require » qu'avec l'option
// --experimental-vm-modules de Node.js, posée dans les scripts « test » (voir docs/05-developpement-poc.md).
const path = require('node:path');

const racine = __dirname;

module.exports = {
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  // Le socle est lu depuis ses sources : pas besoin de le compiler avant de lancer les tests.
  moduleNameMapper: {
    '^@epouvante/socle$': path.join(racine, 'libs/socle/src/index.ts'),
    '^@epouvante/socle/outils-de-test$': path.join(racine, 'libs/socle/outils-de-test/index.ts'),
  },
};
