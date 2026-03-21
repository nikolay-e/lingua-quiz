export default [
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
  },
];
