// E4 et vérification du site publié (GitHub Pages) : chargement, poids de la trace, erreurs, vues principales.
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'
const URL = process.argv[2] ?? 'https://axelphilipp14-star.github.io/schema-llama/'
const browser = await chromium.launch({ headless: false, args: ['--use-angle=metal'] })
const out = { url: URL, date: new Date().toISOString(), runs: [] }
for (let r = 0; r < 3; r++) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }) // contexte neuf = cache vide
  const page = await ctx.newPage()
  const errors = []
  const sizes = {}
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('response', async (res) => {
    const u = res.url()
    if (/traces\/.*\.json|\.js$/.test(u)) {
      const h = await res.allHeaders()
      sizes[u.split('/').pop()] = { encoding: h['content-encoding'] ?? 'none', transfer: Number(h['content-length'] ?? 0) }
    }
  })
  const t0 = Date.now()
  await page.goto(URL)
  await page.waitForSelector('.panel h1', { timeout: 30000 })
  await page.waitForSelector('canvas')
  const usable_s = (Date.now() - t0) / 1000
  await page.waitForTimeout(2500)
  if (r === 0) {
    await page.screenshot({ path: 'results/m6_live_home.png' })
    for (const [name, url] of [['about', '#/a-propos'], ['enquete', '#/enquete/13'], ['make', '?phase=make'], ['en', '?lang=en']]) {
      await page.goto(URL + url)
      await page.waitForTimeout(3000)
      await page.screenshot({ path: `results/m6_live_${name}.png` })
    }
  }
  out.runs.push({ run: r + 1, usable_s, errors, sizes })
  await ctx.close()
}
writeFileSync('docs/preuves/M6_site_publie.json', JSON.stringify(out, null, 1))
console.log(JSON.stringify(out.runs.map((x) => ({ run: x.run, usable_s: x.usable_s, errors: x.errors, trace: Object.entries(x.sizes).filter(([k]) => k.endsWith('.json')) })), null, 1))
await browser.close()
