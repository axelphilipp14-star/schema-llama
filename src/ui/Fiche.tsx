// M5 — Fiche courte d'une pièce, tirée des enquêtes du coffre (content/fr.json, content/en.json, générés par `npm run content`).
import type { ReactNode } from 'react'
import fr from '../../content/fr.json'
import en from '../../content/en.json'
import { useStore } from '../store'
import { useT } from '../i18n'

type Mot = { terme: string | null; def: string | null }
type Enq = { numero: string; titre: string | null; artifact: string | null; obsidian: string }
export type FicheData = {
  titre: string; phase: string; enquetes: Enq[]; mots: Mot[]
  question?: string | null; clair?: string | null; analogie?: string | null; piege?: string | null
  enAttente?: string; aTraduire?: number
}
/** Le lien Obsidian ne sert que sur le Mac d'Axel (serveur local). */
const LOCAL = typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
const CONTENT = { fr: fr.pieces, en: en.pieces } as unknown as Record<'fr' | 'en', Record<string, FicheData>>

/** **gras** et puces « • » → éléments React (aucun HTML injecté). */
function Rich({ text }: { text: string }) {
  const inline = (s: string): ReactNode[] => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part)
  const lines = text.split('\n')
  const out: ReactNode[] = []
  let list: ReactNode[] = []
  const flush = () => { if (list.length) { out.push(<ul key={`u${out.length}`}>{list}</ul>); list = [] } }
  lines.forEach((l, i) => {
    if (l.startsWith('• ')) list.push(<li key={i}>{inline(l.slice(2))}</li>)
    else { flush(); out.push(<p key={i}>{inline(l)}</p>) }
  })
  flush()
  return <>{out}</>
}

export function Fiche({ id }: { id: string }) {
  const { t, lang } = useT()
  const f = CONTENT[lang][id]
  const base = CONTENT.fr[id]
  if (!f || !base) return null
  // Champ anglais pas encore traduit → texte français, signalé.
  const pick = (k: 'question' | 'clair' | 'analogie' | 'piege') => f[k] ?? base[k] ?? null
  const blocks: [string, string | null][] = [[t.fiche.clair, pick('clair')], [t.fiche.analogie, pick('analogie')], [t.fiche.piege, pick('piege')]]
  const q = pick('question')
  return (
    <details className="fiche">
      <summary>{t.fiche.title} · {f.titre}</summary>
      {lang === 'en' && (f.aTraduire ?? 0) > 0 && <p className="warn small">{t.fiche.pending}</p>}
      {f.enAttente && <p className="muted small">{f.enAttente}</p>}
      {q && <div className="fq"><Rich text={q} /></div>}
      {blocks.filter(([, v]) => v).map(([label, v]) => (
        <section key={label}><h3>{label}</h3><Rich text={v!} /></section>
      ))}
      {f.mots.length > 0 && (
        <section>
          <h3>{t.fiche.mots}</h3>
          <dl>{f.mots.map((m, i) => <div key={i}><dt>{m.terme ?? base.mots[i].terme}</dt><dd>{m.def ?? base.mots[i].def ?? '—'}</dd></div>)}</dl>
        </section>
      )}
      {f.enquetes.length > 0 && (
        <section className="enq">
          <h3>{t.fiche.lire}</h3>
          {f.enquetes.map((e, i) => (
            <div key={e.numero}>
              <a href={`#/enquete/${e.numero.replace(/^0+(\d)/, '$1').replace(/\s+/g, '-')}`}><span className="mono">#{e.numero}</span> {e.titre ?? base.enquetes[i].titre}</a>
              {LOCAL && <>{' · '}<a href={e.obsidian} className="muted">{t.fiche.obsidian}</a></>}
            </div>
          ))}
        </section>
      )}
      <p className="small muted">{t.fiche.source}</p>
    </details>
  )
}

/** Quelle fiche montrer pour chaque étape du trajet et du bloc. */
export const JOURNEY_PIECE: Record<string, string> = { tokens: 'tokens', embed: 'embeddings', block: 'attention', norm: 'rmsnorm', head: 'output', probs: 'output' }
export const BLOCK_PIECE: Record<string, string> = { norm1: 'rmsnorm', qkv: 'attention', scores: 'attention', softmax: 'attention', mix: 'attention', heads: 'attention', add1: 'residual', mlp: 'mlp', add2: 'residual' }

export function useFicheLang() { return useStore((s) => s.lang) }
