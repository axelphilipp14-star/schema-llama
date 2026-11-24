// E3 dans la vue « dans un bloc » : images/s pendant les vols de caméra entre les 9 étapes (dpr 2, 1440×900).
import { chromium } from '@playwright/test'
const browser = await chromium.launch({ headless: false, args: ['--window-position=-3000,0', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.goto('http://localhost:5173/schema-llama/')
await page.waitForTimeout(2500)
await page.evaluate(() => window.__store.getState().openBlock(9))
const fps = []
for (let s = 0; s < 9; s++) {
  await page.evaluate((i) => window.__store.getState().setBlockStep(i), s)
  for (let k = 0; k < 2; k++) { await page.waitForTimeout(1050); fps.push(await page.evaluate(() => window.__fps)) }
}
const sorted = [...fps].sort((a, b) => a - b)
console.log(JSON.stringify({ view: 'block', dpr: 2, E3_fps_min: sorted[0], E3_fps_median: sorted[Math.floor(sorted.length / 2)], samples: fps.length, series: fps, errors }))
await browser.close()
