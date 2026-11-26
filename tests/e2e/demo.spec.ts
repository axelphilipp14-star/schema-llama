// Démo du 29/11 : cadrage de départ, bandeau d'accueil, liens directs, lisibilité du panneau.
import { expect, test, type Page } from '@playwright/test'

type L = { text: string; r: [number, number, number, number]; on: boolean; g: string | null }
const labels = (page: Page) => page.evaluate(() => (globalThis as unknown as { __labels: L[] }).__labels)

for (const [w, h] of [[1181, 653], [1400, 840], [1920, 1080]]) {
  test(`cadrage de départ ${w}×${h} : toute la chaîne tient, aucun libellé ne chevauche ni ne flotte`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    await page.goto('./?lang=fr')
    await page.waitForTimeout(4500) // la caméra vole vers la vue d'ensemble
    const stage = await page.locator('.stage').boundingBox()
    const ls = await labels(page)
    const on = ls.filter((l) => l.on)
    // Début, blocs 1 et 28, mot choisi : visibles et dans la scène.
    for (const t of ['1', '28']) expect(on.some((l) => l.text === t), `bloc ${t}`).toBe(true)
    expect(on.some((l) => l.text.startsWith('table d’embedding')), 'table d’embedding').toBe(true)
    expect(on.some((l) => /^·was /.test(l.text)), 'mot choisi').toBe(true)
    for (const l of on) {
      expect(l.r[0], l.text).toBeGreaterThanOrEqual(0)
      expect(l.r[2], l.text).toBeLessThanOrEqual(stage!.width)
      expect(l.r[1], l.text).toBeGreaterThanOrEqual(0)
      expect(l.r[3], l.text).toBeLessThanOrEqual(stage!.height)
    }
    // Aucun chevauchement entre libellés visibles.
    for (let i = 0; i < on.length; i++) for (let j = i + 1; j < on.length; j++) {
      const a = on[i].r, b = on[j].r
      const overlap = a[0] < b[2] - 1 && a[2] > b[0] + 1 && a[1] < b[3] - 1 && a[3] > b[1] + 1
      expect(overlap, `${on[i].text} / ${on[j].text}`).toBe(false)
    }
    // Tokens : tous ou aucun (pas de « ·lost » seul qui flotte).
    const toks = ls.filter((l) => l.g === 'tokens')
    const nOn = toks.filter((l) => l.on).length
    expect([0, toks.length]).toContain(nOn)
  })
}

test('bandeau d’accueil : visible au premier passage, ne revient plus une fois fermé', async ({ page }) => {
  await page.goto('./?lang=fr')
  const w = page.locator('.welcome')
  await expect(w).toBeVisible()
  await expect(w).toContainText('Llama 3.2 3B')
  await expect(w).toContainText('Lecture')
  const lines = await w.locator('p').evaluateAll((ps) => ps.map((p) => Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight))))
  expect(lines.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(2)
  await w.locator('.w-close').click()
  await expect(w).toHaveCount(0)
  await page.reload()
  await page.waitForTimeout(1500)
  await expect(page.locator('.welcome')).toHaveCount(0)
})

test('bandeau d’accueil en anglais', async ({ page }) => {
  await page.goto('./?lang=en')
  await expect(page.locator('.welcome')).toContainText('real numbers')
})

test('liens directs : bloc 1, probabilités, fabriquer › tokenizer', async ({ page }) => {
  await page.goto('./#/bloc/1')
  await expect(page.locator('.timeline .tl-name')).toHaveText(/RMSNorm/)
  await expect(page.locator('.panel .row .mono').first()).toHaveText(/^1 \/ 28$/)
  await page.goto('./#/repondre/probabilites')
  await expect(page.locator('.step-title')).toHaveText(/Probabilités/)
  await page.goto('./#/fabriquer/tokenizer')
  await expect(page.locator('.step-title')).toHaveText(/tokenizer/)
  await page.goto('./#/fabriquer')
  await expect(page.locator('.phase button.on')).toHaveText(/Fabriquer/)
})

test('panneau : corps de texte ≥ 14 px, chiffre clé en tête, note des premiers blocs', async ({ page }) => {
  await page.goto('./?lang=fr#/bloc/1')
  await expect(page.locator('.keyfig .kf-val')).toHaveText(/·it/)
  await expect(page.locator('.early-note')).toContainText('premiers blocs')
  const sizes = await page.locator('.panel p, .panel li, .panel dd').evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent && e.textContent!.trim()).map((e) => parseFloat(getComputedStyle(e).fontSize)))
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(14)
  await page.goto('./?lang=fr#/bloc/3')
  await expect(page.locator('.keyfig')).toBeVisible()
  await expect(page.locator('.early-note')).toHaveCount(0)
})

test('fabriquer : « schéma, pas à l’échelle » dans la scène', async ({ page }) => {
  await page.goto('./#/fabriquer/donnees')
  await page.waitForTimeout(2500)
  const ls = await labels(page)
  expect(ls.some((l) => l.on && l.text === 'schéma, pas à l’échelle')).toBe(true)
})
