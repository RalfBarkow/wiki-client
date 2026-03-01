// test-playwright/h1-style.spec.js
const { test, expect } = require('@playwright/test')

test('scoped content h1 has explicit font-size and non-zero margins', async ({ page }) => {
  await page.goto('/view/welcome-visitors', { waitUntil: 'domcontentloaded' })

  const info = await page.evaluate(() => {
    const h1 =
      document.querySelector('.page h1') ||
      document.querySelector('.story h1') ||
      document.querySelector('.item h1')

    if (!h1) return { found: false }

    const cs = getComputedStyle(h1)

    const toNum = v => {
      const n = parseFloat(v)
      return Number.isFinite(n) ? n : NaN
    }

    return {
      found: true,
      fontSize: cs.fontSize,
      marginTop: cs.marginTop,
      marginBottom: cs.marginBottom,
      marginTopPx: toNum(cs.marginTop),
      marginBottomPx: toNum(cs.marginBottom),
    }
  })

  expect(info.found).toBeTruthy()
  expect(info.fontSize).toMatch(/px$/)
  expect(info.marginTop).toMatch(/px$/)
  expect(info.marginBottom).toMatch(/px$/)
  expect(info.marginTopPx).toBeGreaterThan(0)
  expect(info.marginBottomPx).toBeGreaterThan(0)
})
