// test-playwright/h1-style.spec.js
const { test, expect } = require('@playwright/test')

test('page title exists and has an explicit computed font-size', async ({ page }) => {
  await page.goto('/view/welcome-visitors', { waitUntil: 'domcontentloaded' })

  const info = await page.evaluate(() => {
    const title = document.querySelector('h1') || document.querySelector('.page-title')
    if (!title) return { found: false }

    const cs = getComputedStyle(title)
    const toNum = v => {
      const n = parseFloat(v)
      return Number.isFinite(n) ? n : NaN
    }

    return {
      found: true,
      tag: title.tagName,
      className: title.className || '',
      fontSize: cs.fontSize,
      marginTop: cs.marginTop,
      marginBottom: cs.marginBottom,
      paddingTop: cs.paddingTop,
      paddingBottom: cs.paddingBottom,
      marginTopPx: toNum(cs.marginTop),
      marginBottomPx: toNum(cs.marginBottom),
      paddingTopPx: toNum(cs.paddingTop),
      paddingBottomPx: toNum(cs.paddingBottom),
    }
  })

  expect(info.found).toBeTruthy()
  expect(info.fontSize).toMatch(/px$/)

  // Note: we intentionally do NOT assert non-zero margins.
  // Many skins apply CSS resets where h1 margins are 0.
})
