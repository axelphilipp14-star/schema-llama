// E1 rejoué sur les fichiers JSON publiés (ce que le site affiche réellement).
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Trace } from '../src/data/trace'

const EPS: Record<string, number> = { float32: 2 ** -23, float16: 2 ** -10, bfloat16: 2 ** -7 }
const dir = 'public/traces'
const files = readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_') && f !== 'index.json')

describe.each(files)('trace %s', (f) => {
  const tr: Trace = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'))
  const c = tr.config
  const n = tr.tokens.length

  it('dimensions cohérentes avec la config', () => {
    expect(tr.layers).toHaveLength(c.n_layers)
    expect(c.n_heads % c.n_kv_heads).toBe(0)
    for (const L of tr.layers) {
      expect(L.attn).toHaveLength(c.n_heads)
      for (const h of L.attn) expect(h.map((r) => r.length)).toEqual(Array(n).fill(n))
      expect(L.last.k8).toHaveLength(c.n_kv_heads)
      for (const t of L.mlp.top) expect(t.i).toBeLessThan(c.d_mlp)
    }
    expect(tr.embeddings.first16).toHaveLength(n)
  })

  it('attention : lignes qui somment à 1 (tolérance AN-001) et masque causal', () => {
    const tol = EPS[tr.meta.dtype] / 2 + n * 5e-5
    for (const L of tr.layers)
      for (const h of L.attn)
        h.forEach((row, q) => {
          expect(Math.abs(row.reduce((a, b) => a + b, 0) - 1)).toBeLessThanOrEqual(tol)
          for (let k = q + 1; k < n; k++) expect(row[k]).toBe(0)
        })
  })

  it('sortie : top-10 trié, top-1 = génération gloutonne, contrôles du script verts', () => {
    const p = tr.output.top10.map((t) => t.p)
    expect([...p].sort((a, b) => b - a)).toEqual(p)
    expect(tr.output.top10[0].id).toBe(tr.output.greedy_id)
    expect(tr.checks.greedy_matches_top1).toBe(true)
    expect(tr.checks.dims_match_config).toBe(true)
  })

  it('poids raisonnable (E4 : ≤ 2 Mo gzip)', async () => {
    const { gzipSync } = await import('node:zlib')
    expect(gzipSync(readFileSync(`${dir}/${f}`)).length).toBeLessThan(2e6)
  })
})
