// playwright.config.js
const { defineConfig } = require('@playwright/test');

const port = process.env.PW_PORT || '3100';
const baseURL = process.env.PW_BASE_URL || `http://localhost:${port}`;

// Path to the wiki server executable. This repo (wiki-client) does not build it.
// Default points at the meta repo build artifact.
const wikiBin =
  process.env.PW_WIKI_BIN ||
  '/Users/rgb/Projects/RalfBarkow/wiki/result/bin/wiki';

module.exports = defineConfig({
  testDir: 'test-playwright',
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
  },

  webServer: {
    command: `${wikiBin} --port ${port}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },

  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
