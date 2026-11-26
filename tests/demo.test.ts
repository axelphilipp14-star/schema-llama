// Démo du 29/11 : liens directs, note « premiers blocs » calculée sur la trace, branches des enquêtes, balises Open Graph.
import { readFileSync, existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseSchemaLink } from '../src/route'
import { lensEchoesInput, type Trace } from '../src/data/trace'
import enquetes from '../content/enquetes.json'

describe('liens directs (#/…)', () => {
  it('répondre, étapes, blocs, fabriquer', () => {
    expect(parseSchemaLink('#/repondre', 28)).toEqual({ phase: 'respond', step: null })
    expect(parseSchemaLink('#/repondre/probabilites', 28)).toEqual({ phase: 'respond', step: 'probs' })
    expect(parseSchemaLink('#/bloc/1', 28)).toEqual({ phase: 'respond', block: 0 })
    expect(parseSchemaLink('#/bloc/28', 28)).toEqual({ phase: 'respond', block: 27 })
    expect(parseSchemaLink('#/fabriquer', 28)).toEqual({ phase: 'make', makeStep: -1 })
    expect(parseSchemaLink('#/fabriquer/tokenizer', 28)).toEqual({ phase: 'make', makeStep: 1 })
    expect(parseSchemaLink('#/fabriquer/fine-tuning', 28)).toEqual({ phase: 'make', makeStep: 3 })
  })
  it('refuse ce qui ne désigne pas une étape', () => {
    for (const h of ['', '#/', '#/bloc/0', '#/bloc/29', '#/bloc/x', '#/fabriquer/nimporte', '#/enquetes', '#/enquete/12', '#/a-propos', '#/repondre/zzz'])
      expect(parseSchemaLink(h, 28), h).toBeNull()
  })
})

describe('note « dans les premiers blocs » (point 4)', () => {
  const tr: Trace = JSON.parse(readFileSync('public/traces/3b-instruct-en-satellite.json', 'utf8'))
  it('vraie aux blocs 1–2, fausse à partir du bloc 3 sur la phrase par défaut', () => {
    expect(lensEchoesInput(tr, 0)).toBe(true)
    expect(lensEchoesInput(tr, 1)).toBe(true)
    for (let l = 2; l < tr.config.n_layers; l++) expect(lensEchoesInput(tr, l), `bloc ${l + 1}`).toBe(false)
  })
})

describe('enquêtes : une branche pour chacune (point 7)', () => {
  it('toutes ont une branche non vide', () => {
    for (const e of enquetes.enquetes) expect(e.branche, `#${e.numero}`).toBeTruthy()
  })
})

describe('partage LinkedIn : Open Graph (point 8)', () => {
  const html = readFileSync('index.html', 'utf8')
  const meta = (p: string) => html.match(new RegExp(`<meta (?:property|name)="${p}" content="([^"]+)"`))?.[1]
  it('titre, description FR, URL, image 1200×630', () => {
    expect(meta('og:title')).toBeTruthy()
    expect(meta('og:description')).toMatch(/fabriqué/)
    expect(meta('og:url')).toBe('https://axelphilipp14-star.github.io/schema-llama/')
    expect(meta('og:image')).toBe('https://axelphilipp14-star.github.io/schema-llama/og.png')
    expect(meta('twitter:card')).toBe('summary_large_image')
  })
  it('public/og.png existe et mesure 1200×630', () => {
    expect(existsSync('public/og.png')).toBe(true)
    const png = readFileSync('public/og.png')
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630])
  })
})
