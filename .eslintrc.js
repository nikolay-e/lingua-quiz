module.exports = {
  env: {
    browser: true,
    es2021: true,
    mocha: true,
    jest: true,
  },
  extends: ['airbnb-base', 'plugin:prettier/recommended'],
  ignorePatterns: ['**/tests/**/*'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.mjs', '.cjs'],
      },
    },
  },
  plugins: ['prettier', 'mocha', 'jest', 'import'],
  rules: {
    'eol-last': ['error', 'always'],
    'prettier/prettier': [
      'error',
      {
        printWidth: 150,
        singleQuote: true,
        trailingComma: 'es5',
      },
    ],
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'max-len': ['error', { code: 150 }],
    'import/no-mutable-exports': 'off',
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'import/extensions': 'off',
    'no-unused-vars': [
      'error',
      {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
      },
    ],
    camelcase: [
      'error',
      {
        allow: ['translation_ids'],
      },
    ],
  },
};
