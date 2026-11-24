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
