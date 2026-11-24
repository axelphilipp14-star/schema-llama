// E9 : une enquête modifiée → fiche à jour en une commande ; la traduction devenue périmée est signalée, les autres restent.
// Travaille sur un faux coffre copié dans un dossier temporaire : le vrai coffre n'est jamais touché.
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

function run(env: Record<string, string>, args: string[] = []) {
  try { return { code: 0, out: execFileSync('node', ['scripts/build-content.mjs', ...args], { env: { ...process.env, ...env }, encoding: 'utf8' }) } }
  catch (e: any) { return { code: e.status as number, out: String(e.stdout) } }
}

describe('coffre → contenu (E9)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'schema-llama-'))
  const vault = join(dir, 'vault')
  cpSync('tests/fixtures/vault', vault, { recursive: true })
  const env = { VAULT: vault, PIECES: 'tests/fixtures/pieces.json', TRANSLATIONS: join(dir, 'tr.json'), CONTENT_OUT: dir }
  const read = (f: string) => JSON.parse(readFileSync(join(dir, f), 'utf8'))

  it('extrait le texte tel quel, avec les définitions du Lexique, sans « Mes notes »', () => {
    run(env)
    const f = read('fr.json').pieces.test
    expect(f.question).toBe("Est-ce que la fiche suit l'enquête ?")
    expect(f.analogie).toBe("Un miroir renvoie ce qu'on lui montre.")
    expect(f.mots).toEqual([{ terme: 'Miroir', def: 'Une surface qui renvoie la lumière.' }, { terme: 'Reflet', def: 'Ce que le miroir renvoie.' }])
    expect(readFileSync(join(dir, 'fr.json'), 'utf8')).not.toContain('NOTE PRIVÉE')
    expect(f.enquetes[0]).toMatchObject({ numero: '99', titre: 'Un test', artifact: 'https://claude.ai/artifact/TEST' })
  })

  it('une enquête modifiée → fiche FR à jour ; seule la phrase changée repasse « à traduire »', () => {
    // Traduire tout ce qui est en attente
    const pend = read('a-traduire.json') as Record<string, string>
    writeFileSync(env.TRANSLATIONS, JSON.stringify(Object.fromEntries(Object.entries(pend).map(([h, fr]) => [h, { fr, en: `EN:${fr}` }]))))
    run(env)
    expect(read('en.json').pieces.test.aTraduire).toBe(0)
    expect(run(env, ['--check']).code).toBe(0)

    // Axel modifie son analogie dans le coffre
    const p = join(vault, 'Enquêtes', 'Enquête 99 — Un test.md')
    writeFileSync(p, readFileSync(p, 'utf8').replace("ce qu'on lui montre", 'tout ce qui passe devant'))
    expect(run(env, ['--check']).code).toBe(1) // le contenu publié n'est plus à jour

    run(env) // la commande unique
    expect(read('fr.json').pieces.test.analogie).toBe('Un miroir renvoie tout ce qui passe devant.')
    const en = read('en.json').pieces.test
    expect(en.aTraduire).toBe(1)
    expect(en.analogie).toBeNull() // pas d'anglais périmé
    expect(en.question).toBe("EN:Est-ce que la fiche suit l'enquête ?") // le reste est gardé
  })
})
