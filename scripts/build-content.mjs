#!/usr/bin/env node
// M5 — Lit le coffre Obsidian (lecture seule) et génère content/fr.json et content/en.json.
//
//   npm run content                      coffre par défaut (~/Desktop/AI x spatial)
//   VAULT=/chemin npm run content        autre coffre (tests ; aussi PIECES, TRANSLATIONS, CONTENT_OUT)
//   npm run content -- --check           n'écrit rien, code de sortie 1 si une fiche a changé ou une traduction manque
//
// Le français est recopié tel quel depuis les enquêtes (repères dans content/pieces.json).
// L'anglais vient de content/translations.json, indexé par l'empreinte de chaque phrase française :
// une phrase modifiée dans le coffre perd sa traduction (signalée « à traduire ») au lieu de garder un anglais périmé.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { Marked } from 'marked'

const ROOT = resolve(import.meta.dirname, '..')
const VAULT = process.env.VAULT ?? join(homedir(), 'Desktop', 'AI x spatial')
const OUT = process.env.CONTENT_OUT ?? join(ROOT, 'content')
const CHECK = process.argv.includes('--check')
const VAULT_NAME = VAULT.split('/').filter(Boolean).pop()

const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12)

// ---------- Lecture des notes ----------
function parseNote(path) {
  const raw = readFileSync(path, 'utf8')
  const fm = {}
  let body = raw
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/)
  if (m) {
    body = raw.slice(m[0].length)
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^(\w+):\s*(.*)$/)
      if (kv) fm[kv[1]] = kv[2].replace(/^"(.*)"$/, '$1')
    }
  }
  return { fm, body, lines: body.split('\n') }
}

function loadEnquetes() {
  const dir = join(VAULT, 'Enquêtes')
  const map = {}
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.md') || / — Exercices\.md$/.test(f) || !/^Enquête \d/.test(f)) continue
    const note = parseNote(join(dir, f))
    const num = String(note.fm.numero ?? '').trim()
    if (!num) continue
    const key = num.replace(/^0+(\d)/, '$1')
    const h1 = note.lines.find((l) => l.startsWith('# ')) ?? f
    map[key] = { ...note, file: f, numero: num, titre: h1.replace(/^# /, '').replace(/^Enquête [\w ]+? — /, '') }
  }
  return map
}

const normNum = (n) => String(n).replace(/^0+(\d)/, '$1')

// ---------- Nettoyage du Markdown Obsidian → texte avec **gras** ----------
function clean(s) {
  return s
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1')
    .replace(/\\([[\]|])/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1$2')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

/** Paragraphes d'une section : blocs séparés par une ligne vide ; tableaux et encadrés [!…] retirés. */
function sectionParas(note, h) {
  const i = note.lines.findIndex((l) => /^#{1,6} /.test(l) && l.includes(h))
  if (i < 0) return null
  const out = []
  let cur = []
  for (let k = i + 1; k < note.lines.length; k++) {
    const l = note.lines[k]
    if (/^#{1,6} /.test(l)) break
    if (!l.trim()) { if (cur.length) out.push(cur), (cur = []); continue }
    cur.push(l)
  }
  if (cur.length) out.push(cur)
  return out
    .filter((p) => !p[0].startsWith('|') && !/^>\s*\[!/.test(p[0]))
    .map((p) => p.join('\n'))
}

/** Coupe à `max` caractères, à la fin d'une phrase si possible. */
/** Retouches de présentation, sans changer le sens : étiquette « → La réponse. » retirée, majuscule initiale. */
function tidy(s) {
  s = s.replace(/^\*\*→ La réponse\.\*\*\s*/, '').replace(/^→\s*/, '')
  return s.replace(/^((?:• |\*\*)?)(\p{Ll})/u, (_, a, b) => a + b.toUpperCase())
}

function cut(s, max = 650) {
  if (s.length <= max) return s
  const head = s.slice(0, max)
  const end = Math.max(head.lastIndexOf('. '), head.lastIndexOf('.\n'), head.lastIndexOf(' ? '), head.lastIndexOf('! '))
  return (end > max * 0.4 ? head.slice(0, end + 1) : head.replace(/\s+\S*$/, '')) + ' …'
}

function extract(enq, a, problems, where) {
  const note = enq[normNum(a.e)]
  if (!note) { problems.push(`${where} : enquête #${a.e} introuvable`); return null }
  const paras = sectionParas(note, a.h)
  if (!paras) { problems.push(`${where} : section « ${a.h} » introuvable dans #${a.e}`); return null }
  let start, first = null
  if (a.start) {
    start = paras.findIndex((p) => p.startsWith(a.start) || p.split('\n').some((l) => l.trim().startsWith(a.start)))
    if (start < 0) { problems.push(`${where} : « ${a.start} » introuvable dans #${a.e} › ${a.h}`); return null }
    const p = paras[start]
    if (!p.startsWith(a.start)) first = p.split('\n').find((l) => l.trim().startsWith(a.start)).trim()
    else first = p
    // Le repère n'est retiré que s'il s'agit d'une étiquette (gras, « Piège : », « 5. ») ; sinon il fait partie de la phrase.
    const isLabel = a.start.startsWith('**') || /:\s*$/.test(a.start) || /^\d+\.\s/.test(a.start)
    if (isLabel) first = first.slice(a.start.length)
    // Le repère s'arrête au milieu d'un gras (« 5. **Les probabilités ») : on saute jusqu'à la fin du gras.
    if (isLabel && (a.start.match(/\*\*/g) ?? []).length % 2 === 1) { const c = first.indexOf('**'); if (c >= 0) first = first.slice(c + 2) }
    first = first.trim()
    if (!first) { start++; first = null }
  } else {
    start = a.para === 'last' ? paras.length - 1 : (a.para ?? 0)
  }
  const take = a.take ?? 1
  const chunk = []
  if (first) chunk.push(first)
  for (let k = first ? start + 1 : start; chunk.length < take && k < paras.length; k++) chunk.push(paras[k])
  if (!chunk.length) { problems.push(`${where} : paragraphe vide dans #${a.e} › ${a.h}`); return null }
  return cut(tidy(clean(chunk.join('\n\n'))), a.max)
}

// ---------- Mots-clés et définitions du Lexique ----------
function lexDef(term) {
  const p = join(VAULT, 'Lexique', `${term}.md`)
  if (!existsSync(p)) return null
  const n = parseNote(p)
  const i = n.lines.findIndex((l) => /^\s*# /.test(l))
  for (let k = i + 1; k < n.lines.length; k++) {
    const l = n.lines[k].trim()
    if (!l) continue
    if (l.startsWith('#') || l.startsWith('**Vu dans')) break
    return cut(clean(l), 320)
  }
  return null
}

function mots(enq, spec, problems, where) {
  if (!spec) return []
  let terms = []
  const bulletDefs = {}
  if (spec.e) {
    const note = enq[normNum(spec.e)]
    const paras = note && sectionParas(note, spec.h)
    if (!paras) problems.push(`${where} : mots — section « ${spec.h} » introuvable dans #${spec.e}`)
    else {
      const text = paras.filter((p) => !p.startsWith('Déjà vus')).join('\n')
      for (const m of text.matchAll(/^\s*[-*]\s+\*\*\[\[([^\]|]+)(?:\|[^\]]+)?\]\]\*\*\s*:\s*(.+)$/gm)) { terms.push(m[1]); bulletDefs[m[1]] = m[2] }
      for (const m of text.matchAll(/^\s*[-*]\s+\*\*([^*[\]]+)\*\*\s*:\s*(.+)$/gm)) { terms.push(m[1].trim()); bulletDefs[m[1].trim()] = m[2] }
      if (!terms.length) for (const m of text.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) terms.push(m[1])
    }
  }
  if (spec.only) terms = terms.filter((x) => spec.only.includes(x))
  terms = [...new Set([...terms, ...(spec.extra ?? [])])].slice(0, 6)
  return terms.map((term) => {
    const def = lexDef(term) ?? (bulletDefs[term] ? cut(clean(bulletDefs[term]), 320) : null)
    if (!def) problems.push(`${where} : pas de définition pour « ${term} » (ni Lexique/, ni l'enquête)`)
    return { terme: term, def }
  })
}

// ---------- Construction ----------
const spec = JSON.parse(readFileSync(process.env.PIECES ?? join(ROOT, 'content', 'pieces.json'), 'utf8'))
const enq = loadEnquetes()
const problems = []
const fr = { _genere: 'scripts/build-content.mjs — ne pas modifier à la main', source: VAULT_NAME, pieces: {} }

for (const p of spec.pieces) {
  const where = `pièce ${p.id}`
  const f = { titre: p.title.fr, phase: p.phase, enquetes: [] }
  for (const n of p.enquetes) {
    const e = enq[normNum(n)]
    if (!e) { problems.push(`${where} : enquête #${n} introuvable`); continue }
    f.enquetes.push({ numero: e.numero, titre: e.titre, artifact: e.fm.artifact || null,
      obsidian: `obsidian://open?vault=${encodeURIComponent(VAULT_NAME)}&file=${encodeURIComponent('Enquêtes/' + e.file.replace(/\.md$/, ''))}` })
  }
  for (const k of ['question', 'clair', 'analogie', 'piege']) if (p[k]) { const v = extract(enq, p[k], problems, `${where}.${k}`); if (v) f[k] = v }
  f.mots = mots(enq, p.mots, problems, where)
  if (p.pending) f.enAttente = p.pending.fr
  f.empreinte = hash(JSON.stringify(f))
  fr.pieces[p.id] = f
}

// Anglais : chaque chaîne française passe par content/translations.json.
const trPath = process.env.TRANSLATIONS ?? join(ROOT, 'content', 'translations.json')
const tr = existsSync(trPath) ? JSON.parse(readFileSync(trPath, 'utf8')) : {}
const missing = {}
const T = (s) => {
  if (s == null) return s
  const h = hash(s)
  if (tr[h]) return tr[h].en
  missing[h] = s
  return null
}
const en = { _genere: fr._genere, source: VAULT_NAME, pieces: {} }
for (const p of spec.pieces) {
  const f = fr.pieces[p.id]
  const e = { titre: p.title.en, phase: f.phase, enquetes: f.enquetes.map((x) => ({ ...x, titre: T(x.titre) })), mots: f.mots.map((m) => ({ terme: T(m.terme), def: T(m.def) })) }
  for (const k of ['question', 'clair', 'analogie', 'piege']) if (f[k]) e[k] = T(f[k])
  if (p.pending) e.enAttente = p.pending.en
  const fields = [...['question', 'clair', 'analogie', 'piege'].map((k) => e[k]), ...e.mots.flatMap((m) => [m.terme, m.def]), ...e.enquetes.map((x) => x.titre)]
  e.aTraduire = fields.filter((v) => v === null).length
  en.pieces[p.id] = e
}


// ---------- Pages « enquête » (une par enquête, décision d'Axel du 24/11/2026) ----------
const pagesCfg = JSON.parse(readFileSync(process.env.PAGES ?? join(ROOT, 'content', 'pages.json'), 'utf8'))
const EXCL = pagesCfg.exclure.map((r) => new RegExp(r))
const slug = (num) => normNum(num).replace(/\s+/g, '-')
const lexCache = {}
const lexOf = (t) => (t in lexCache ? lexCache[t] : (lexCache[t] = lexDef(t)))
const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** Retire les sections exclues (un titre exclu retire aussi ses sous-sections). */
function stripSections(lines) {
  const out = []
  let skipLevel = 0
  for (const l of lines) {
    const m = l.match(/^(#{1,6}) (.*)$/)
    if (m) {
      const level = m[1].length
      if (skipLevel && level <= skipLevel) skipLevel = 0
      if (!skipLevel && EXCL.some((r) => r.test(m[2].trim()))) { skipLevel = level; continue }
    }
    if (!skipLevel) out.push(l)
  }
  return out
}

/** Obsidian → Markdown standard : liens internes, termes du Lexique, encadrés, intégrations retirées. */
function obsidianToMd(md, enqByTitle) {
  return md
    .replace(/%%[\s\S]*?%%/g, '')
    .replace(/!\[\[[^\]]*\]\]/g, '')
    .replace(/\[\[#[^\]|]*\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[#([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
      const t = target.trim(), text = (label ?? t).replace(/\\$/, '')
      const e = enqByTitle[t]
      if (e) return `[${text}](#/enquete/${slug(e.numero)})`
      if (lexOf(t)) return `[${text}](#lex:${encodeURIComponent(t)})`
      return text
    })
    .replace(/\\\|/g, '|')
    .replace(/^(\s*>\s*)\[!(\w+)\][+-]?\s*(.*)$/gm, (_, q, type, title) => `${q}**${title || type}**`)
}

const marked = new Marked({ gfm: true })
marked.use({
  renderer: {
    html({ text }) { return escAttr(text) }, // aucun HTML brut des notes n'est interprété
    link({ href, tokens }) {
      const inner = this.parser.parseInline(tokens)
      if (href.startsWith('#lex:')) {
        const term = decodeURIComponent(href.slice(5))
        return `<span class="lex" tabindex="0" title="${escAttr(term + ' — ' + (lexOf(term) ?? ''))}">${inner}</span>`
      }
      const ext = /^https?:/.test(href)
      return `<a href="${escAttr(href)}"${ext ? ' target="_blank" rel="noreferrer"' : ''}>${inner}</a>`
    },
  },
})

const enqByTitle = {}
for (const e of Object.values(enq)) enqByTitle[e.file.replace(/\.md$/, '')] = e
const pages = { _genere: fr._genere, enquetes: [] }
const pageFiles = {}
for (const e of Object.values(enq).sort((a, b) => parseFloat(normNum(a.numero)) - parseFloat(normNum(b.numero)) || a.numero.localeCompare(b.numero))) {
  const lines = stripSections(e.lines).filter((l) => !/^# /.test(l))
  const md = obsidianToMd(lines.join('\n'), enqByTitle)
  const html = marked.parse(md)
  const id = slug(e.numero)
  pageFiles[id] = html
  pages.enquetes.push({ id, numero: e.numero, titre: e.titre, branche: e.fm.branche ?? null, bloc: e.fm.bloc ?? null, date: e.fm.date ?? null, empreinte: hash(html) })
}

// ---------- Sortie ----------
const frStr = JSON.stringify(fr, null, 1) + '\n'
const enStr = JSON.stringify(en, null, 1) + '\n'
const pendStr = JSON.stringify(missing, null, 1) + '\n'
const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '')
const pagesStr = JSON.stringify(pages, null, 1) + '\n'
const PAGES_OUT = process.env.PAGES_OUT ?? join(ROOT, 'public', 'enquetes')
const pagesChanged = read(join(OUT, 'enquetes.json')) !== pagesStr || Object.entries(pageFiles).some(([id, h]) => read(join(PAGES_OUT, `${id}.html`)) !== h)
const changed = read(join(OUT, 'fr.json')) !== frStr || read(join(OUT, 'en.json')) !== enStr || pagesChanged

const nMissing = Object.keys(missing).length
console.log(`Coffre : ${VAULT}`)
console.log(`${Object.keys(fr.pieces).length} fiches · ${pages.enquetes.length} pages d'enquête · ${Object.keys(enq).length} enquêtes lues · ${nMissing} phrase(s) à traduire · ${problems.length} problème(s)`)
for (const p of problems) console.log('  ⚠ ' + p)
if (nMissing) console.log(`  → phrases à traduire : content/a-traduire.json (${nMissing})`)

if (CHECK) {
  console.log(changed ? 'Le contenu publié n’est pas à jour : lancer `npm run content`.' : 'Contenu à jour.')
  process.exit(changed || nMissing || problems.length ? 1 : 0)
}
writeFileSync(join(OUT, 'fr.json'), frStr)
writeFileSync(join(OUT, 'en.json'), enStr)
writeFileSync(join(OUT, 'a-traduire.json'), pendStr)
writeFileSync(join(OUT, 'enquetes.json'), pagesStr)
mkdirSync(PAGES_OUT, { recursive: true })
for (const f of readdirSync(PAGES_OUT)) if (f.endsWith('.html') && !(f.replace(/\.html$/, '') in pageFiles)) rmSync(join(PAGES_OUT, f))
for (const [id, h] of Object.entries(pageFiles)) writeFileSync(join(PAGES_OUT, `${id}.html`), h)
console.log(changed ? 'content/fr.json et content/en.json mis à jour.' : 'Aucun changement.')
