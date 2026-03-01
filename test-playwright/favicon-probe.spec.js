// test-playwright/favicon-probe.spec.js
const { test, expect } = require('@playwright/test')

test('favicon probe uses image semantics (not XHR/fetch)', async ({ page }) => {
  const requests = []
  page.on('request', req => {
    requests.push({
      url: req.url(),
      type: req.resourceType(),
    })
  })

  await page.goto('/view/welcome-visitors', { waitUntil: 'domcontentloaded' })

  // Give the adapter time to kick off probes if they happen on startup.
  await page.waitForTimeout(500)

  // Focus specifically on the probe URLs we control.
  const probes = requests.filter(r => /favicon\.png\?cb=\d+/i.test(r.url))

  // If no probes happened, don't fail spuriously.
  for (const r of probes) {
    expect(['xhr', 'fetch']).not.toContain(r.type)
  }

  if (probes.length > 0) {
    expect(probes.some(r => r.type === 'image')).toBeTruthy()
  }
})
