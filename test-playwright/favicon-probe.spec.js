// test-playwright/favicon-probe.spec.js
const { test, expect } = require('@playwright/test');

test('favicon probing does not use XHR/fetch', async ({ page }) => {
  const requests = [];
  page.on('request', (req) => {
    requests.push({
      url: req.url(),
      type: req.resourceType()
    });
  });

  await page.goto('/', { waitUntil: 'networkidle' });

  const faviconish = requests.filter(r => /favicon\.(png|ico)/i.test(r.url));

  for (const r of faviconish) {
    expect(['xhr', 'fetch']).not.toContain(r.type);
  }
});
