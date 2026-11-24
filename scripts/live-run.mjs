// M0-c : pilote live-test.html dans Chromium (GPU réel, WebGPU), attend le résultat, l'écrit dans docs/preuves/.
// Usage : node scripts/live-run.mjs <modelId> [runs=2]   (2 passages : téléchargement, puis depuis le cache → E5)
import { chromium } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'
const modelId = process.argv[2]
const runs = +(process.argv[3] ?? 2)
mkdirSync('docs/preuves', { recursive: true })
const ctx = await chromium.launchPersistentContext('results/chrome-profile', {
  headless: false, viewport: { width: 1200, height: 900 },
  args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPU', '--use-angle=metal', '--ignore-gpu-blocklist', '--enable-precise-memory-info'],
})
const results = []
for (let r = 0; r < runs; r++) {
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.text().startsWith('[live]')) console.log(m.text()) })
  page.on('crash', () => console.log('[live] ONGLET PLANTÉ'))
  await page.goto('http://localhost:5173/schema-llama/live-test.html')
  await page.waitForTimeout(1500)
  await page.click(`button[data-m="${modelId}"]`)
  const t0 = Date.now()
  let res = null
  while (Date.now() - t0 < 25 * 60 * 1000) {
    await page.waitForTimeout(3000).catch(() => {})
    res = await page.evaluate((id) => window.__live?.[id] ?? null, modelId).catch(() => ({ status: 'crash' }))
    if (res && ['ok', 'error', 'crash'].includes(res.status)) break
  }
  const env = await page.evaluate(() => ({ webgpu: window.__live?.webgpu, adapter: window.__live?.adapter, maxBufferSize: window.__live?.maxBufferSize })).catch(() => ({}))
  results.push({ run: r + 1, wall_s: Math.round((Date.now() - t0) / 1000), ...env, ...res })
  console.log(`[run ${r + 1}]`, JSON.stringify({ status: res?.status, load_s: res?.load_s, gen_tok_s: res?.gen_tok_s, attention_outputs: res?.attention_outputs }))
  await page.close()
}
const file = `docs/preuves/M0c_${modelId.split('/').pop()}.json`
writeFileSync(file, JSON.stringify({ date: new Date().toISOString(), machine: 'MacBook A18 Pro, 8 Go', results }, null, 1))
console.log('écrit', file)
await ctx.close()
