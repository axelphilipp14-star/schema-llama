// E2 (M2) : les nombres des cartes de calcul de la vue « dans un bloc » = trace.
import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const tr = JSON.parse(readFileSync('public/traces/dev-1b-satellite.json', 'utf8'))
const n = tr.tokens.length
const LAYER = 9, HEAD = 0 // bloc 10, tête 1 (celle des captures)
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9

test('cartes du bloc : RMSNorm, softmax, mélange des V, MLP = trace', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./?lang=en')
  await page.evaluate(([l, h]) => { const s = (window as any).__store.getState(); s.openBlock(l); s.setHead(h) }, [LAYER, HEAD])
  const L = tr.layers[LAYER]

  // ① RMSNorm : ligne y = y8 de la trace
  const rows = page.locator('.calc .crow.result .cval[data-v]')
  await expect(rows).toHaveCount(8)
  const y = (await rows.evaluateAll((els) => els.map((e) => +(e as HTMLElement).dataset.v!)))
  expect(y.every((v, j) => close(v, L.norm1.y8[j]))).toBe(true)

  // ④ Softmax : parts = ligne d'attention du dernier token
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight')
  const ps = await page.locator('.calc [data-p]').evaluateAll((els) => els.map((e) => +(e as HTMLElement).dataset.p!))
  expect(ps).toEqual(L.attn[HEAD][n - 1])

  // ⑤ Mélange : ligne « sortie de la tête » = ctx8
  await page.keyboard.press('ArrowRight')
  const ctx = await page.locator('.calc .crow.result .cval[data-v]').evaluateAll((els) => els.map((e) => +(e as HTMLElement).dataset.v!))
  expect(ctx).toEqual(L.last.ctx8[HEAD])

  // ⑧ MLP : act des 8 premiers neurones
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight')
  const acts = await page.locator('.calc td[data-v]').evaluateAll((els) => els.map((e) => +(e as HTMLElement).dataset.v!))
  expect(acts).toEqual(L.mlp.top.slice(0, 8).map((x: any) => x.act))
  expect(errors).toEqual([])
})
