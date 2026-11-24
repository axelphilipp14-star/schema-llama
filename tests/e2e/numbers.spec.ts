// E2 : les nombres affichés dans le panneau sont ceux de la trace, à l'arrondi affiché près.
import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const trace = JSON.parse(readFileSync('public/traces/dev-1b-satellite.json', 'utf8'))
const pctFr = (p: number) => `${(p * 100).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`

test('top-10 final et logit lens de chaque bloc = trace', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./?lang=fr')
  await expect(page.locator('.lens li')).toHaveCount(trace.config.n_layers)

  // Logit lens : colonne de droite du panneau, une ligne par bloc.
  const lens = await page.locator('.lens li .num').allTextContents()
  expect(lens.map((s) => s.replace(/ /g, ' '))).toEqual(trace.layers.map((l: any) => pctFr(l.lens[0].p)))

  // Chaque bloc pas à pas : le top-3 affiché = lens[0..2] de la trace.
  await page.keyboard.press('ArrowRight') // embed
  for (let l = 0; l < trace.config.n_layers; l++) {
    await page.keyboard.press('ArrowRight')
    const shown = (await page.locator('.step-body .probs .num').allTextContents()).map((s) => s.replace(/ /g, ' '))
    expect(shown, `bloc ${l + 1}`).toEqual(trace.layers[l].lens.slice(0, 3).map((x: any) => pctFr(x.p)))
  }

  // Fin : top-10 final.
  await page.locator('.tl-seg').last().click()
  const top = (await page.locator('.step-body .probs .num').allTextContents()).map((s) => s.replace(/ /g, ' '))
  expect(top).toEqual(trace.output.top10.map((x: any) => pctFr(x.p)))
  expect(errors).toEqual([])
})
