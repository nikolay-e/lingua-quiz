import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { baseRules } from './base.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = dirname(__dirname);

const typescriptRules = {
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
      destructuredArrayIgnorePattern: '^_',
    },
  ],
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/no-non-null-assertion': 'error',
  '@typescript-eslint/no-inferrable-types': 'error',
  '@typescript-eslint/prefer-nullish-coalescing': 'error',
  '@typescript-eslint/prefer-optional-chain': 'error',
  '@typescript-eslint/consistent-type-imports': [
    'warn',
    { prefer: 'type-imports', disallowTypeAnnotations: true, fixStyle: 'inline-type-imports' },
  ],
  '@typescript-eslint/naming-convention': [
    'warn',
    { selector: 'variable', format: ['camelCase', 'PascalCase', 'UPPER_CASE'], leadingUnderscore: 'allow' },
    { selector: 'function', format: ['camelCase', 'PascalCase'] },
    { selector: 'typeLike', format: ['PascalCase'] },
    { selector: 'enumMember', format: ['PascalCase', 'UPPER_CASE'] },
  ],
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
  '@typescript-eslint/strict-boolean-expressions': [
    'error',
    {
      allowString: false,
      allowNumber: false,
      allowNullableObject: false,
      allowNullableBoolean: false,
      allowNullableString: false,
      allowNullableNumber: false,
      allowAny: false,
    },
  ],
  '@typescript-eslint/no-unnecessary-condition': ['warn', { allowConstantLoopConditions: true }],
  '@typescript-eslint/no-unsafe-member-access': 'error',
  '@typescript-eslint/no-unsafe-call': 'error',
  '@typescript-eslint/no-unsafe-assignment': 'error',
  '@typescript-eslint/no-unsafe-return': 'error',
  '@typescript-eslint/no-unsafe-argument': 'error',
  'no-unused-vars': 'off',
  'no-undef': 'off',
  'no-redeclare': 'off',
  '@typescript-eslint/no-redeclare': 'error',
};

const makeTypescriptConfig = (files, project) => ({
  files,
  languageOptions: {
    parser: tsparser,
    parserOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      project,
      tsconfigRootDir: rootDir,
    },
    globals: { ...globals.browser, ...globals.node },
  },
  plugins: { '@typescript-eslint': tseslint },
  rules: {
    ...baseRules,
    ...tseslint.configs.recommended.rules,
    ...typescriptRules,
  },
});

export { typescriptRules };

export default [
  makeTypescriptConfig(['packages/core/src/**/*.ts'], './packages/core/tsconfig.json'),
  makeTypescriptConfig(['apps/frontend/src/**/*.ts'], './apps/frontend/tsconfig.json'),
];
