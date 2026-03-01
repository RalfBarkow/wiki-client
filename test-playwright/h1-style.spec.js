// test-playwright/h1-style.spec.js
const { test, expect } = require('@playwright/test');

test('h1 has explicit computed font-size and non-zero margins', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const info = await page.evaluate(() => {
    const h1 =
      document.querySelector('.page h1') ||
      document.querySelector('.story h1') ||
      document.querySelector('.item h1') ||
      document.querySelector('h1');

    if (!h1) return { found: false };

    const cs = getComputedStyle(h1);
    return {
      found: true,
      fontSize: cs.fontSize,
      marginTop: cs.marginTop,
      marginBottom: cs.marginBottom
    };
  });

  expect(info.found).toBeTruthy();
  expect(info.fontSize).toMatch(/px$/);
  expect(info.marginTop).not.toBe('0px');
  expect(info.marginBottom).not.toBe('0px');
});
