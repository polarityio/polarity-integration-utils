import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import tsdoc from 'eslint-plugin-tsdoc';

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  {
    ignores: ['dist', 'node_modules', 'coverage', 'jest.config.js']
  },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      tsdoc: tsdoc
    }
  },
  {
    rules: {
      'tsdoc/syntax': 'warn'
    }
  }
];
