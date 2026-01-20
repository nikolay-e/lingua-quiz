// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';

import globals from 'globals';
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Shared TypeScript rules
const typescriptRules = {
  // TypeScript-specific rules
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
  '@typescript-eslint/explicit-function-return-type': 'off', // TypeScript inference is usually sufficient
  '@typescript-eslint/no-non-null-assertion': 'error', // STRICT: Prevent runtime errors from null/undefined
  '@typescript-eslint/no-inferrable-types': 'error',
  '@typescript-eslint/prefer-nullish-coalescing': 'warn', // TODO: Upgrade to 'error' after fixing all warnings
  '@typescript-eslint/prefer-optional-chain': 'error', // STRICT: Use ?. instead of && chains
  '@typescript-eslint/consistent-type-imports': [
    'warn',
    {
      prefer: 'type-imports',
      disallowTypeAnnotations: true,
      fixStyle: 'inline-type-imports',
    },
  ],
  '@typescript-eslint/naming-convention': [
    'warn',
    {
      selector: 'variable',
      format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
      leadingUnderscore: 'allow',
    },
    {
      selector: 'function',
      format: ['camelCase', 'PascalCase'],
    },
    {
      selector: 'typeLike',
      format: ['PascalCase'],
    },
    {
      selector: 'enumMember',
      format: ['PascalCase', 'UPPER_CASE'],
    },
  ],
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/no-misused-promises': [
    'error',
    {
      checksVoidReturn: false,
    },
  ],
  '@typescript-eslint/strict-boolean-expressions': [
    'warn', // TODO: Upgrade to 'error' after fixing all warnings
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
  '@typescript-eslint/no-unnecessary-condition': [
    'warn',
    {
      allowConstantLoopConditions: true,
    },
  ],
  '@typescript-eslint/no-unsafe-member-access': 'warn', // TODO: Upgrade to 'error' after fixing all warnings
  '@typescript-eslint/no-unsafe-call': 'warn', // TODO: Upgrade to 'error' after fixing all warnings
  '@typescript-eslint/no-unsafe-assignment': 'warn', // TODO: Upgrade to 'error' after fixing all warnings
  '@typescript-eslint/no-unsafe-return': 'warn', // TODO: Upgrade to 'error' after fixing all warnings
  '@typescript-eslint/no-unsafe-argument': 'warn', // TODO: Upgrade to 'error' after fixing all warnings
  // Disable base rules that TypeScript handles
  'no-unused-vars': 'off',
  'no-undef': 'off',
  'no-redeclare': 'off',
  '@typescript-eslint/no-redeclare': 'error',
};

// Base JavaScript rules
const baseRules = {
  ...js.configs.recommended.rules,
  // Console usage
  'no-console': [
    'warn',
    {
      allow: ['warn', 'error', 'info', 'debug'],
    },
  ],
  // Code quality
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
  'arrow-body-style': 'off', // Too opinionated, let developers choose
  'no-lonely-if': 'warn',
  'prefer-destructuring': [
    'warn',
    {
      array: false,
      object: true,
    },
  ],
  // Code consistency
  curly: ['error', 'multi-line'],
  'brace-style': ['error', '1tbs', { allowSingleLine: true }],
  eqeqeq: ['error', 'always', { null: 'ignore' }],
  'no-multi-spaces': 'error',
  'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
  'no-trailing-spaces': 'error',
  'comma-dangle': ['error', 'always-multiline'],
  semi: ['error', 'always'],
  quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
};

export default [
  // Global ignores
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
      '**/generated/**', // Auto-generated code (all packages)
      '**/__pycache__/**', // Python cache
      '**/.mypy_cache/**', // Mypy cache
      '**/*.pyc', // Python compiled files
    ],
  }, // JavaScript files
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      ecmaVersion: 2024,
      sourceType: 'module',
    },
    rules: baseRules,
  }, // TypeScript files - packages/core
  {
    files: ['packages/core/src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        project: './packages/core/tsconfig.json',
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...baseRules,
      ...tseslint.configs.recommended.rules,
      ...typescriptRules,
    },
  }, // TypeScript files - packages/frontend
  {
    files: ['apps/frontend/src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        project: './apps/frontend/tsconfig.json',
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...baseRules,
      ...tseslint.configs.recommended.rules,
      ...typescriptRules,
    },
  }, // TypeScript test files (relaxed rules)
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**/*.ts', '**/test/**/*.ts', '**/__tests__/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        // Don't require project for test files
        project: false,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        ...globals.mocha,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...baseRules,
      ...tseslint.configs.recommended.rules,
      // Relaxed rules for tests
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Disable type-checking rules for tests (no project configured)
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
    },
  }, // Configuration files
  {
    files: ['**/vite.config.ts', '**/vitest.config.ts', '*.config.ts', '*.config.js'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...baseRules,
      ...tseslint.configs.recommended.rules,
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/naming-convention': 'off',
      // Disable type-checking rules
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
    },
  }, // Markdown code blocks
  {
    files: ['**/*.md/*.js', '**/*.md/*.ts'],
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'max-len': 'off',
    },
  }, // TypeScript React files - packages/frontend (TSX)
  {
    files: ['apps/frontend/src/**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        project: './apps/frontend/tsconfig.json',
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...baseRules,
      ...tseslint.configs.recommended.rules,
      ...typescriptRules,
    },
  },
  // Frontend architecture boundaries: shared cannot import from features/pages/app
  {
    files: ['apps/frontend/src/shared/**/*.ts', 'apps/frontend/src/shared/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@features/*', '../features/*', '../../features/*'],
              message: 'shared/ cannot import from features/',
            },
            { group: ['@pages/*', '../pages/*', '../../pages/*'], message: 'shared/ cannot import from pages/' },
            { group: ['@app/*', '../app/*', '../../app/*'], message: 'shared/ cannot import from app/' },
            { group: ['@api/*', '../api/*', '../../api/*'], message: 'shared/ cannot import from api/' },
          ],
        },
      ],
    },
  },
  // Frontend architecture boundaries: features cannot import from pages/app
  {
    files: ['apps/frontend/src/features/**/*.ts', 'apps/frontend/src/features/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@pages/*', '../pages/*', '../../pages/*', '../../../pages/*'],
              message: 'features/ cannot import from pages/',
            },
            {
              group: ['@app/*', '../app/*', '../../app/*', '../../../app/*'],
              message: 'features/ cannot import from app/',
            },
          ],
        },
      ],
    },
  },
  // Frontend architecture boundaries: pages cannot import from app
  {
    files: ['apps/frontend/src/pages/**/*.ts', 'apps/frontend/src/pages/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: ['@app/*', '../app/*', '../../app/*'], message: 'pages/ cannot import from app/' }],
        },
      ],
    },
  }, // Storybook stories (relaxed rules)
  {
    files: ['**/*.stories.tsx', '**/*.stories.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        project: './apps/frontend/tsconfig.json',
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...baseRules,
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
    },
  },
  ...storybook.configs['flat/recommended'],
];
