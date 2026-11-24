// M4 : les nombres calculés de la scène « fabriquer » retombent sur les valeurs publiées.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { llamaParams } from '../src/data/math'

const idx = JSON.parse(readFileSync('public/traces/index.json', 'utf8'))
const cfg = (id: string) => idx.find((x: { id: string }) => x.id === id).config

describe('paramètres recalculés depuis la config', () => {
  it('Llama 3.2 3B ≈ 3,21 Md (Meta : « 3.21B »)', () => expect(llamaParams(cfg('3b-instruct-en-satellite')).total / 1e9).toBeCloseTo(3.21, 2))
  it('Llama 3.2 1B ≈ 1,24 Md (Meta : « 1.23B »)', () => expect(llamaParams(cfg('1b-instruct-en-satellite')).total / 1e9).toBeCloseTo(1.24, 1))
})

describe('résumé des traces (index.json) = traces complètes', () => {
  it('top-5 et logit lens recopiés à l’identique', () => {
    for (const e of idx) {
      const tr = JSON.parse(readFileSync(`public/traces/${e.id}.json`, 'utf8'))
      expect(e.top5).toEqual(tr.output.top10.slice(0, 5))
      expect(e.lens).toEqual(tr.layers.map((l: { lens: unknown[] }) => l.lens[0]))
      expect(e.lens).toHaveLength(tr.config.n_layers)
    }
  })
})
