// E7 : FR et EN ont les mêmes clés, aucune valeur vide, et l'anglais n'est pas une copie du français.
import { describe, expect, it } from 'vitest'
import { dicts } from '../src/i18n'

type Any = Record<string, unknown>
function flat(o: Any, p = ''): Record<string, unknown> {
  return Object.entries(o).reduce((acc, [k, v]) => (v && typeof v === 'object' ? { ...acc, ...flat(v as Any, p + k + '.') } : { ...acc, [p + k]: v }), {})
}
// Mots identiques dans les deux langues (termes techniques) : autorisés.
const SAME_OK = new Set('tokensCount pause title finalNorm builtWith blk.stepName.norm1 blk.stepName.qkv blk.stepName.softmax blk.stepName.add1 blk.stepName.mlp blk.stepName.add2 blk.fromTrace blk.rowRms blk.rowXr blk.colTok blk.colScore blk.colExp blk.mixRow blk.normMid blk.gate blk.siluGate blk.up blk.act blk.normLbl make.vocabTitle make.src.meta make.src.trace aboutPage.sections.4.h aboutPage.bbycroft'.split(' '))
const sample = (v: unknown) => (typeof v === 'function' ? (v as (...a: unknown[]) => string)(1, 2, 'x', 3) : v)

describe('i18n', () => {
  const fr = flat(dicts.fr as unknown as Any), en = flat(dicts.en as unknown as Any)
  it('mêmes clés', () => expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort()))
  it('aucune valeur vide', () => { for (const [k, v] of Object.entries(en)) expect(String(sample(v)).trim().length, k).toBeGreaterThan(0) })
  it('anglais ≠ français (hors termes techniques)', () => {
    for (const k of Object.keys(fr)) if (!SAME_OK.has(k)) expect(String(sample(en[k])), k).not.toEqual(String(sample(fr[k])))
  })
})
