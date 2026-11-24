#!/usr/bin/env node
// Écrit la note « Schéma du modèle — Suivi » dans le coffre Obsidian, à partir des docs du projet.
// Autorisé par Axel le 25/11/2026. Note entièrement générée : ne pas la modifier à la main (elle serait écrasée).
//   npm run obsidian
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const VAULT = process.env.VAULT ?? join(homedir(), 'Desktop', 'AI x spatial')
const NOTE = join(VAULT, 'Schéma du modèle — Suivi.md')
const GH = 'https://github.com/axelphilipp14-star/schema-llama'
const read = (p) => readFileSync(join(ROOT, p), 'utf8')
const body = (md) => md.replace(/^# .*\n+/, '').trim().replace(/^(#{2,5}) /gm, '#$1 ') // titres décalés sous les sections de la note
// Chemins du dépôt → liens GitHub cliquables depuis Obsidian.
const ghLinks = (md) => md
  .replace(/`(docs\/retours-axel\/[^`\s]*)`/g, '`~/schema-llama/$1`') // tes rendus : sur ton Mac, pas sur GitHub
  .replace(/`((?:docs|content|scripts|src|notebooks|public)\/[^`\s]*)`/g, (_, p) => `[\`${p}\`](${GH}/blob/main/${p})`)

const progress = read('docs/PROGRESS.md')
const sections = progress.split(/\n(?=## )/).filter((s) => s.startsWith('## '))
const steps = sections.map((s) => '- ' + s.split('\n')[0].replace(/^## /, '')).join('\n')
const last = sections.at(-1)?.replace(/^## /, '### ') ?? ''

const md = `---
tags: [index]
---
# Schéma du modèle — Suivi

> [!info] Note générée automatiquement
> Écrite par le projet \`~/schema-llama\` (\`npm run obsidian\`) à chaque étape finie. Ne la modifie pas ici : elle serait écrasée.
> Tes rendus vont dans **\`~/schema-llama/docs/retours-axel/\`**. Projet : [[Schéma du modèle]] · code : ${GH}
> Mise à jour : ${new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}

## Tes tâches

${ghLinks(body(read('docs/POUR_AXEL.md')))}

## À trancher

${ghLinks(body(read('docs/A_TRANCHER.md')))}

## Étapes faites

${steps}

## Dernière étape, en détail

${ghLinks(last)}

## Voir le schéma

- En local (serveur lancé) : http://localhost:5173/schema-llama/
- Les enquêtes sur le site : http://localhost:5173/schema-llama/#/enquetes
- Journal complet : ${GH}/blob/main/docs/PROGRESS.md · anomalies : ${GH}/tree/main/docs/anomalies · captures : ${GH}/tree/main/docs/preuves
`
const before = existsSync(NOTE) ? readFileSync(NOTE, 'utf8').replace(/> Mise à jour : .*\n/, '') : ''
if (before === md.replace(/> Mise à jour : .*\n/, '')) { console.log('Note Obsidian déjà à jour.'); process.exit(0) }
writeFileSync(NOTE, md)
console.log(`Écrit : ${NOTE}`)
