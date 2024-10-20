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
  plugins: ['prettier', 'mocha', 'jest'],
  rules: {
    'prettier/prettier': [
      'error',
      {
        printWidth: 100,
        singleQuote: true,
        trailingComma: 'es5',
      },
    ],
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'max-len': ['error', { code: 100 }],
    'import/no-mutable-exports': 'off',
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
