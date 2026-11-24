// Idées tirées de bbycroft : comparaison 1B ↔ 3B (valeurs = traces), mini-carte synchronisée et cliquable, légende poids/activations.
import { expect, test } from '@playwright/test'
import index from '../../public/traces/index.json' with { type: 'json' }

const get = (id: string) => (index as any[]).find((x) => x.id === id)
const pctFr = (p: number) => `${(p * 100).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`

test('1B ↔ 3B : dimensions et premier choix = traces', async ({ page }) => {
  await page.goto('./?lang=fr')
  await page.locator('.tabs button', { hasText: '1B ↔ 3B' }).click()
  const a = get('3b-instruct-en-satellite'), b = get('1b-instruct-en-satellite')
  const col = async (m: string) => (await page.locator(`.cmp-table td[data-cmp="${m}"]`).allTextContents()).map((s) => s.replace(/ /g, ' '))
  const c3 = await col('3b'), c1 = await col('1b')
  expect(c3[0]).toBe(String(a.config.n_layers))
  expect(c1[0]).toBe(String(b.config.n_layers))
  expect(c3.at(-1)).toContain(pctFr(a.top5[0].p))
  expect(c1.at(-1)).toContain(pctFr(b.top5[0].p))
  await expect(page.locator('.strip').first().locator('i')).toHaveCount(a.config.n_layers)
  await expect(page.locator('.strip').nth(1).locator('i')).toHaveCount(b.config.n_layers)
})

test('mini-carte : suit la vue et permet de naviguer', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./?lang=fr')
  await expect(page.locator('.minimap .mm-node.on')).toHaveText('Tokens')
  await page.locator('.minimap .mm-node', { hasText: 'Probabilités' }).click()
  await expect(page.locator('.tl-name')).toHaveText(/Probabilités/)
  await page.locator('.minimap .mm-ticks i').nth(9).click()
  await expect(page.locator('.tl-name')).toHaveText(/Bloc 10/)
  await expect(page.locator('.wlegend')).toBeVisible()
  expect(errors).toEqual([])
})
