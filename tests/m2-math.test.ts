// M2 : chaque calcul animé dans la vue « dans un bloc » se refait à partir des nombres publiés et retombe sur la trace.
// Tolérance relative 5e-2 (dérivation dans scripts/trace_core.py, AN-001).
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Trace } from '../src/data/trace'
import { softmaxRow, silu, mixV, rmsApply } from '../src/data/math'

const dir = 'public/traces'
const files = readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_'))
const rel = (a: number, b: number, scale: number) => Math.abs(a - b) / (Math.abs(scale) + 1e-2)

describe.each(files)('calculs M2 — %s', (f) => {
  const tr: Trace = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'))
  const { n_heads: H, n_kv_heads: KV } = tr.config
  const n = tr.tokens.length

  it('RMSNorm : y = x / rms × w', () => {
    for (const L of tr.layers) for (const d of [L.norm1, L.norm2]) {
      rmsApply(d).forEach((y, j) => expect(rel(y, d.y8[j], d.y8[j])).toBeLessThan(5e-2))
    }
  })

  it('softmax(scores) = ligne d’attention du dernier token', () => {
    for (const L of tr.layers) for (let h = 0; h < H; h++) {
      const p = softmaxRow(L.last.scores[h])
      p.forEach((v, k) => expect(Math.abs(v - L.attn[h][n - 1][k])).toBeLessThan(2e-2))
    }
  })

  it('mélange des V : Σ p·v = sortie de la tête', () => {
    for (const L of tr.layers) for (let h = 0; h < H; h++) {
      const g = Math.floor(h / (H / KV))
      const ctx = mixV(L.attn[h][n - 1], L.last.v8[g])
      const scale = Math.max(...L.last.ctx8[h].map(Math.abs))
      ctx.forEach((v, j) => expect(rel(v, L.last.ctx8[h][j], scale)).toBeLessThan(5e-2))
    }
  })

  it('SwiGLU : act = silu(gate) × up', () => {
    for (const L of tr.layers) for (const t of L.mlp.top) expect(rel(silu(t.gate) * t.up, t.act, t.act)).toBeLessThan(5e-2)
  })
})
