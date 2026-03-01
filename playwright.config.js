// playwright.config.js
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'test-playwright',
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    trace: 'retain-on-failure'
  },

  // Uses your exact server command.
  // Assumes you already ran: nix build
  webServer: {
    command: './result/bin/wiki --port 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000
  },

  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } }
  ]
});
