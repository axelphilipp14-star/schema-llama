// Liste des traces disponibles → public/traces/index.json (lue par l'onglet « À toi »).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
const dir = resolve(import.meta.dirname, '..', 'public', 'traces')
const list = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json' && !f.startsWith('_')).sort().map((f) => {
  const t = JSON.parse(readFileSync(join(dir, f), 'utf8'))
  return {
    id: f.replace(/\.json$/, ''), prompt: t.prompt, model: t.meta.model_id, n_layers: t.config.n_layers, dtype: t.meta.dtype,
    // Résumé pour la scène « fabriquer » (M4) : tokens et top-5 de sortie, sans charger la trace entière.
    tokens: t.tokens, top5: t.output.top10.slice(0, 5), config: t.config,
    // Comparaison 1B ↔ 3B : top-1 lu à la sortie de chaque bloc (logit lens).
    lens: t.layers.map((l) => l.lens[0]),
  }
})
writeFileSync(join(dir, 'index.json'), JSON.stringify(list, null, 1) + '\n')
console.log(`${list.length} trace(s) indexée(s)`)
