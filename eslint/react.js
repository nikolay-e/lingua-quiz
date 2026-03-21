import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { baseRules } from './base.js';
import { typescriptRules } from './typescript.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = dirname(__dirname);

export default [
  {
    files: ['apps/frontend/src/**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        project: './apps/frontend/tsconfig.json',
        tsconfigRootDir: rootDir,
        ecmaFeatures: { jsx: true },
      },
      globals: { ...globals.browser },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      ...baseRules,
      ...tseslint.configs.recommended.rules,
      ...typescriptRules,
    },
  },
];
