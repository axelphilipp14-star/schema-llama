// E5/E6 via l'interface réelle : onglet « À toi », modèle en direct (GPU du Mac, profil Chromium avec le cache des modèles).
// Usage : node scripts/measure-m3.mjs [1b|3b]
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'
const key = process.argv[2] ?? '1b'
const ctx = await chromium.launchPersistentContext('results/chrome-profile', {
  headless: false, viewport: { width: 1440, height: 900 },
  args: ['--enable-unsafe-webgpu', '--use-angle=metal', '--ignore-gpu-blocklist'],
})
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.goto('http://localhost:5173/schema-llama/?lang=fr')
await page.waitForTimeout(2000)
await page.click('.tabs button:nth-child(2)')
await page.waitForFunction(() => window.__live.getState().tokStatus === 'ready', null, { timeout: 120000 })
const t0 = Date.now()
await page.click(key === '1b' ? '.try .btn.primary' : '.try .row-btns .btn:not(.primary)')
await page.waitForFunction(() => window.__live.getState().top10.length > 0 || window.__live.getState().status === 'error', null, { timeout: 600000 })
const first_result_wall_s = (Date.now() - t0) / 1000
const s1 = await page.evaluate(() => { const s = window.__live.getState(); return { status: s.status, error: s.error, loadS: s.loadS, warmS: s.warmS, firstResultS: s.firstResultS, forwardMs: s.forwardMs, top10: s.top10.map((x) => [x.t, +x.p.toFixed(4)]) } })
const compare = await page.locator('.try p.ok, .try p.warn').allTextContents()
await page.screenshot({ path: `results/m3_live_${key}.png` })
// Température 0,5 puis tirage
await page.evaluate(() => window.__store.getState().setTemperature(0.5))
await page.waitForTimeout(800)
const t05 = await page.evaluate(() => window.__live.getState().top10.slice(0, 3).map((x) => [x.t, +x.p.toFixed(4)]))
await page.click('text=Tirer un token au hasard')
await page.waitForTimeout(800)
const sampled = await page.evaluate(() => window.__live.getState().sampled)
// Une phrase en français, jamais tracée
await page.evaluate(() => window.__store.getState().setTemperature(1))
await page.fill('.try-input', 'Le satellite a perdu son antenne parce qu’elle')
await page.waitForFunction(() => window.__live.getState().resultFor.startsWith('Le satellite'), null, { timeout: 60000 })
const fr = await page.evaluate(() => { const s = window.__live.getState(); return { forwardMs: s.forwardMs, tokens: s.tokens.length, top5: s.top10.slice(0, 5).map((x) => [x.t, +x.p.toFixed(4)]) } })
await page.screenshot({ path: `results/m3_live_${key}_fr.png` })
const res = { date: new Date().toISOString(), machine: 'MacBook A18 Pro, 8 Go', model: key, first_result_wall_s, ...s1, compare, t05_top3: t05, sampled, french: fr, errors }
writeFileSync(`docs/preuves/M3_direct_${key}.json`, JSON.stringify(res, null, 1))
console.log(JSON.stringify(res, null, 1))
await ctx.close()
