// M3 : température appliquée à la trace. Exacte à T = 1 et T → 0 ; ailleurs, approximation qui se comporte comme attendu.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { traceTemperature } from '../src/data/math'

const tr = JSON.parse(readFileSync('public/traces/3b-instruct-en-satellite.json', 'utf8'))
const top50 = tr.output.top50_logits, top10 = tr.output.top10
const H = (ps: number[]) => -ps.filter((p) => p > 0).reduce((a, p) => a + p * Math.log2(p), 0)

describe('température sur la trace', () => {
  it('T = 1 redonne les vraies probabilités du top-10 (à l’arrondi bf16 + 4 décimales près)', () => {
    const r = traceTemperature(top50, top10[0].p, 1)
    expect(r.exact).toBe(true)
    // Comparaison token par token (deux tokens à égalité peuvent échanger leur rang).
    const byId = new Map(r.all.map((x) => [x.id, x.p]))
    for (const x of top10) expect(Math.abs(byId.get(x.id)! - x.p)).toBeLessThan(2e-3)
  })
  it('T → 0 : glouton, 100 % au top-1', () => {
    const r = traceTemperature(top50, top10[0].p, 0)
    expect(r.top10[0].p).toBe(1)
    expect(r.top10.slice(1).every((x) => x.p === 0)).toBe(true)
  })
  it('plus la température monte, plus la distribution s’aplatit (entropie croissante), ordre inchangé', () => {
    // Entropie sur les 50 tokens gardés (sur le seul top-10 elle n'a pas de raison d'être monotone : la masse part vers les rangs 11-50).
    const hs = [0.3, 0.7, 1.5, 2].map((T) => H(traceTemperature(top50, top10[0].p, T).all.map((x) => x.p)))
    for (let i = 1; i < hs.length; i++) expect(hs[i]).toBeGreaterThan(hs[i - 1])
    const r = traceTemperature(top50, top10[0].p, 1.5)
    expect(r.exact).toBe(false)
    expect(r.all.map((x) => x.id)).toEqual(top50.map((x: { id: number }) => x.id))
  })
})
