// Pages « enquête » : texte des enquêtes d'Axel, généré depuis le coffre par `npm run content` (public/enquetes/*.html).
import { useEffect, useRef, useState } from 'react'
import index from '../../content/enquetes.json'
import { useT } from '../i18n'
import { LangToggle } from './Panels'

type Entry = { id: string; numero: string; titre: string; bloc: string | null; date: string | null }
const LIST = index.enquetes as Entry[]

export function EnquetePage({ id }: { id: string | null }) {
  const { t, lang } = useT()
  const [html, setHtml] = useState<string | null>(null)
  const prose = useRef<HTMLDivElement>(null)
  const entry = LIST.find((e) => e.id === id) ?? null
  useEffect(() => {
    setHtml(null)
    if (!entry) return
    fetch(`${import.meta.env.BASE_URL}enquetes/${entry.id}.html`).then((r) => r.text()).then(setHtml)
    window.scrollTo(0, 0)
  }, [entry?.id])
  // Schémas Mermaid des enquêtes : bibliothèque chargée seulement ici, à la demande.
  useEffect(() => {
    const blocks = prose.current?.querySelectorAll('pre > code.language-mermaid')
    if (!blocks?.length) return
    let cancelled = false
    const mermaidErr = t.pages.mermaidErr
    import('mermaid').then(async ({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'dark', fontFamily: 'Inter, sans-serif',
        themeVariables: { background: '#141821', primaryColor: '#1d2330', primaryTextColor: '#e6e8ee', primaryBorderColor: '#4fb3ff', lineColor: '#8a93a6', fontSize: '14px' } })
      for (const [i, code] of [...blocks].entries()) {
        if (cancelled) return
        const pre = code.parentElement!
        try {
          const { svg } = await mermaid.render(`mmd-${entry?.id}-${i}`, code.textContent ?? '')
          const fig = document.createElement('figure')
          fig.className = 'mermaid-fig'
          fig.innerHTML = svg
          pre.replaceWith(fig)
        } catch (e) {
          // Erreur de syntaxe dans la note du coffre : on montre le code tel quel, avec une mention.
          pre.classList.add('mermaid-error')
          const note = document.createElement('p')
          note.className = 'small warn'
          note.textContent = mermaidErr
          pre.before(note)
          console.warn('[mermaid]', entry?.id, String((e as Error)?.message ?? e).split('\n').slice(0, 3).join(' '))
        }
      }
    })
    return () => { cancelled = true }
  }, [html])
  useEffect(() => { document.title = entry ? `#${entry.numero} — ${entry.titre}` : t.pages.title }, [entry, t])

  return (
    <div className="reader">
      <header className="reader-top">
        <a className="btn" href="#/">{t.pages.back}</a>
        <a className="reader-brand" href="#/enquetes">{t.pages.title}</a>
        <LangToggle />
      </header>
      <div className="reader-body">
        <nav className="reader-nav" aria-label={t.pages.title}>
          {LIST.map((e) => (
            <a key={e.id} href={`#/enquete/${e.id}`} className={e.id === id ? 'on' : ''}>
              <span className="mono">#{e.numero}</span> {e.titre}
            </a>
          ))}
        </nav>
        <main className="reader-main">
          {lang === 'en' && <p className="warn small">{t.pages.frOnly}</p>}
          {!entry ? (
            <>
              <h1>{t.pages.title}</h1>
              <p className="muted">{t.pages.intro}</p>
              <ol className="reader-index">
                {LIST.map((e) => <li key={e.id}><a href={`#/enquete/${e.id}`}><span className="mono">#{e.numero}</span> {e.titre}</a>{e.bloc && <span className="muted small"> · {e.bloc}</span>}</li>)}
              </ol>
            </>
          ) : (
            <article lang="fr">
              <p className="muted small mono">#{entry.numero}{entry.bloc ? ` · ${entry.bloc}` : ''}{entry.date ? ` · ${entry.date}` : ''}</p>
              <h1>{entry.titre}</h1>
              {html == null ? <p className="muted">…</p> : <div className="prose" ref={prose} dangerouslySetInnerHTML={{ __html: html }} />}
              <p className="small muted reader-src">{t.pages.source}</p>
            </article>
          )}
        </main>
      </div>
    </div>
  )
}

/** Petit routeur par ancre : #/enquete/13, #/enquetes, sinon le schéma. */
export function useRoute() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const on = () => setHash(location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const m = hash.match(/^#\/enquete\/([\w-]+)/)
  if (m) return { page: 'enquete' as const, id: m[1] }
  if (hash.startsWith('#/enquetes')) return { page: 'enquete' as const, id: null }
  return { page: 'schema' as const, id: null }
}
