import globals from 'globals';
import js from '@eslint/js';

const baseRules = {
  ...js.configs.recommended.rules,
  'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
  'max-len': [
    'error',
    {
      code: 120,
      tabWidth: 2,
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
      ignoreRegExpLiterals: true,
      ignoreComments: true,
    },
  ],
  'prefer-const': 'error',
  'no-var': 'error',
  'object-shorthand': ['warn', 'always'],
  'prefer-arrow-callback': 'warn',
  'prefer-template': 'warn',
  'no-nested-ternary': 'warn',
  'no-unneeded-ternary': 'warn',
  'no-duplicate-imports': 'error',
  'no-useless-return': 'warn',
  'no-else-return': 'warn',
  'arrow-body-style': 'off',
  'no-lonely-if': 'warn',
  'prefer-destructuring': ['warn', { array: false, object: true }],
  curly: ['error', 'multi-line'],
  eqeqeq: ['error', 'always', { null: 'ignore' }],
};

export { baseRules };

export default [
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/build/',
      '**/coverage/',
      '**/.turbo/',
      '**/package-lock.json',
      '**/pnpm-lock.yaml',
      '**/venv/',
      '**/.venv/',
      '**/packages/word-processing/venv/',
      '**/generated/**',
      '**/__pycache__/**',
      '**/.mypy_cache/**',
      '**/*.pyc',
    ],
  },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      ecmaVersion: 2024,
      sourceType: 'module',
    },
    rules: baseRules,
  },
];
