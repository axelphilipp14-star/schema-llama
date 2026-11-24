// Liste des traces disponibles → public/traces/index.json (lue par l'onglet « À toi »).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
const dir = resolve(import.meta.dirname, '..', 'public', 'traces')
const list = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json' && !f.startsWith('_')).sort().map((f) => {
  const t = JSON.parse(readFileSync(join(dir, f), 'utf8'))
  return { id: f.replace(/\.json$/, ''), prompt: t.prompt, model: t.meta.model_id, n_layers: t.config.n_layers, dtype: t.meta.dtype }
})
writeFileSync(join(dir, 'index.json'), JSON.stringify(list, null, 1) + '\n')
console.log(`${list.length} trace(s) indexée(s)`)
