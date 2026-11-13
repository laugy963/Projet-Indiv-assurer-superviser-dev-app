// Lint du dépôt : règles recommandées d'ESLint et de typescript-eslint,
// plus l'extension de sécurité prévue par le processus de développement (étape « Coder »).
import js from '@eslint/js';
import security from 'eslint-plugin-security';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', 'sandbox/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  security.configs.recommended,
  {
    // Scripts Node.js en modules ES (tests/indicateur-i1.mjs).
    files: ['**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
  },
  {
    // Fichiers de configuration en CommonJS.
    files: ['**/*.cjs'],
    languageOptions: { globals: { module: 'writable', require: 'readonly', __dirname: 'readonly' } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
