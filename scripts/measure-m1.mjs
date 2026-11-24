// E8 (suivre un token de bout en bout ≤ 60 s) et E3 (≥ 50 i/s) — lecture complète à 1×, écran Retina simulé (dpr 2).
// Usage : node scripts/measure-m1.mjs [traceId]
import { chromium } from '@playwright/test'
const trace = process.argv[2] ?? '3b-instruct-en-satellite'
const browser = await chromium.launch({ headless: false, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.goto(`http://localhost:5173/schema-llama/?trace=${trace}`)
await page.waitForTimeout(3000)
await page.click('.play')
const t0 = Date.now()
const fps = []
// Fin détectée sur la progression elle-même (le texte du bouton réagissait avec retard : AN-003).
let total = null
let lastFps = Date.now()
while (Date.now() - t0 < 120000) {
  await page.waitForTimeout(100)
  const { p, N } = await page.evaluate(() => ({ p: window.__anim.progress, N: document.querySelectorAll('.tl-seg').length }))
  if (Date.now() - lastFps >= 1000) { fps.push(await page.evaluate(() => window.__fps)); lastFps = Date.now() }
  if (p >= N - 0.01) { total = (Date.now() - t0) / 1000; break }
}
const sorted = [...fps].sort((a, b) => a - b)
console.log(JSON.stringify({ trace, dpr: 2, viewport: '1440x900', E8_total_s: total == null ? null : +total.toFixed(1), E3_fps_min: sorted[0], E3_fps_p10: sorted[Math.floor(sorted.length * 0.1)], E3_fps_median: sorted[Math.floor(sorted.length / 2)], samples: fps.length, errors }))
await browser.close()
