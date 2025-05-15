const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 120 * 1000, // Increase timeout to 2 minutes
  expect: {
    timeout: 20000,
  },
  retries: 2, // Add more retries for flaky tests in Docker environment
  // Add verbose reporter settings
  reporter: [
    ['list', { printSteps: true }],
    ['html', { open: 'never' }]
  ],
  use: {
    baseURL: process.env.LINGUA_QUIZ_URL,
    trace: 'off',
    screenshot: 'on',
    video: 'on', // set to 'on' for detailed debugging
    
    // Forward all browser console logs to test output
    logger: {
      isEnabled: (name, severity) => true,
      log: (name, severity, message, args) => console.log(`[${name}] ${message}`),
    },
  },
  reporter: [['html', { open: 'never' }], ['list']],

  projects: [
    // Desktop configurations
    {
      name: 'Desktop Chromium',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'Desktop Firefox',
      testIgnore: 'tests/002-quiz.spec.js',
      use: { browserName: 'firefox', viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'Desktop WebKit',
      testIgnore: 'tests/002-quiz.spec.js',
      use: { browserName: 'webkit', viewport: { width: 1280, height: 720 } },
    },

    // Mobile configurations
    {
      name: 'Mobile Chrome',
      testIgnore: 'tests/002-quiz.spec.js',
      use: {
        browserName: 'chromium',
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'Mobile Safari',
      testIgnore: 'tests/002-quiz.spec.js',
      use: {
        browserName: 'webkit',
        ...devices['iPhone 12'],
      },
    },
  ],
});
