// test-playwright/canvas-gating.spec.js
const { test, expect } = require('@playwright/test')

test('no canvas readback before user gesture', async ({ page }) => {
  // Instrument *before* any app JS runs.
  await page.addInitScript(() => {
    window.__canvasReadbackCalls = []

    function wrap(obj, name) {
      const orig = obj && obj[name]
      if (!orig) return
      Object.defineProperty(obj, name, {
        configurable: true,
        value: function (...args) {
          try {
            window.__canvasReadbackCalls.push({ name })
          } catch (_) {}
          return orig.apply(this, args)
        },
      })
    }

    wrap(HTMLCanvasElement.prototype, 'toDataURL')
    wrap(HTMLCanvasElement.prototype, 'toBlob')
    wrap(CanvasRenderingContext2D.prototype, 'getImageData')
  })

  // Avoid networkidle: wiki keeps background activity.
  await page.goto('/view/welcome-visitors', { waitUntil: 'domcontentloaded' })

  // Wait for the client to render something meaningful.
  await page.waitForSelector('body')

  const before = await page.evaluate(() => window.__canvasReadbackCalls)
  expect(before).toEqual([])

  // Perform a real gesture.
  await page.mouse.click(10, 10)
  await page.waitForTimeout(250)

  const after = await page.evaluate(() => window.__canvasReadbackCalls)
  expect(Array.isArray(after)).toBeTruthy()
})
