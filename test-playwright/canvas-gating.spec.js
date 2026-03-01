// test-playwright/canvas-gating.spec.js
const { test, expect } = require('@playwright/test');

test('no canvas readback before user gesture', async ({ page }) => {
  // Instrument before any app JS runs.
  await page.addInitScript(() => {
    window.__canvasReadbackCalls = [];

    function wrap(obj, name) {
      const orig = obj && obj[name];
      if (!orig) return;
      Object.defineProperty(obj, name, {
        configurable: true,
        value: function (...args) {
          window.__canvasReadbackCalls.push({ name });
          return orig.apply(this, args);
        }
      });
    }

    wrap(HTMLCanvasElement.prototype, 'toDataURL');
    wrap(HTMLCanvasElement.prototype, 'toBlob');
    wrap(CanvasRenderingContext2D.prototype, 'getImageData');
  });

  await page.goto('/', { waitUntil: 'networkidle' });

  const before = await page.evaluate(() => window.__canvasReadbackCalls);
  expect(before).toEqual([]);

  // Perform a real user gesture.
  await page.mouse.click(10, 10);
  await page.waitForTimeout(250);

  // After gesture, calls are allowed (we don't require them).
  const after = await page.evaluate(() => window.__canvasReadbackCalls);
  expect(Array.isArray(after)).toBeTruthy();
});
