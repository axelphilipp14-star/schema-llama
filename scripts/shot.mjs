// Boucle visuelle : capture de la page + erreurs console. Usage : node scripts/shot.mjs [url] [sortie.png] [attente ms]
import { chromium } from '@playwright/test'
const url = process.argv[2] || 'http://localhost:5173/schema-llama/'
const out = process.argv[3] ?? 'results/shot.png'
const wait = +(process.argv[4] ?? 2500)
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'], headless: false })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const logs = []
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`) })
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
await page.goto(url)
await page.waitForTimeout(wait)
if (process.env.HOVER) { const [x, y] = process.env.HOVER.split(',').map(Number); await page.mouse.move(x - 20, y - 20); await page.mouse.move(x, y, { steps: 8 }); await page.waitForTimeout(600) }
await page.screenshot({ path: out })
const hover = await page.evaluate(() => document.querySelector('.hover')?.textContent ?? null)
const fps = await page.evaluate(() => window.__fps ?? null)
console.log(JSON.stringify({ out, fps, hover, logs: logs.slice(0, 15) }, null, 1))
await browser.close()
