import type { Trace } from '../data/trace'
import { lensEchoesInput, showTok } from '../data/trace'
import { useStore } from '../store'
import { useT } from '../i18n'
import { useEffect } from 'react'
import { stepAt, type JourneyLayout } from '../scene/journeyLayout'
import { BLOCK_STEPS } from '../scene/blockGeom'
import { meanAttnLast } from '../scene/Journey'
import { stepName } from './Timeline'
import { BLOCK_PIECE, Fiche, JOURNEY_PIECE } from './Fiche'
import { TryPanel } from './TryPanel'
import { CompareTab } from './CompareTab'
import { useOutputProbs } from '../data/useOutputProbs'

export function LangToggle() {
  const { lang, setLang } = useStore()
  return (
    <div className="lang" role="group" aria-label="Langue / Language">
      {(['fr', 'en'] as const).map((l) => (
        <button key={l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
      ))}
    </div>
  )
}

/** Fabriquer | Répondre : les deux phases du schéma. */
export function PhaseToggle() {
  const { t } = useT()
  const { phase, setPhase } = useStore()
  return (
    <div className="phase" role="tablist" aria-label={t.phase.label}>
      {(['make', 'respond'] as const).map((k, i) => (
        <button key={k} role="tab" aria-selected={phase === k} className={phase === k ? 'on' : ''} onClick={() => setPhase(k)}>
          <span className="mono">{i + 1}</span> {t.phase[k]}
        </button>
      ))}
    </div>
  )
}

export function Header({ trace, traceHidden }: { trace?: Trace; traceHidden?: boolean }) {
  const { t } = useT()
  return (
    <>
      <div className="panel-head">
        <h1>{t.title}</h1>
        <LangToggle />
      </div>
      <PhaseToggle />
      {trace && !traceHidden && trace.config.n_layers !== 28 && <p className="warn">{t.devTrace(trace.config.n_layers)}</p>}
      <p className="small muted">{t.hint}</p>
      {trace && !traceHidden && <p className="muted">{t.sentence} : <span className="mono">{t.q(trace.prompt)}</span> · {t.tokensCount(trace.tokens.length)}</p>}
    </>
  )
}

export function Footer({ trace }: { trace?: Trace }) {
  const { t, num } = useT()
  const c = trace?.config
  return (
    <p className="small muted foot">
      {c && trace && <>{t.dims(num(c.d_model, 0), c.n_heads, c.n_kv_heads, num(c.d_mlp, 0), num(c.vocab, 0))} {t.source(trace.meta.dtype, trace.meta.date.slice(0, 10))}<br /></>}
      <a href="#/enquetes">{t.pages.all}</a> · <a href="#/a-propos">{t.about.link}</a> · <span className="built">{t.builtWith}</span>
    </p>
  )
}

export function Probs({ items, highlight }: { items: { t: string; p: number }[]; highlight?: number }) {
  const { pct } = useT()
  const max = items[0]?.p || 1
  return (
    <ol className="probs">
      {items.map((it, i) => (
        <li key={i} className={i === highlight ? 'hl' : ''}>
          <span className="mono tok">{showTok(it.t)}</span>
          <span className="bar"><span style={{ width: `${(it.p / max) * 100}%` }} /></span>
          <span className="mono num" data-p={it.p}>{pct(it.p)}</span>
        </li>
      ))}
    </ol>
  )
}

/** Le chiffre clé d'une étape : en premier, en gros, avec une ligne pour dire ce qu'il mesure. */
export function KeyFig({ value, label, tone }: { value: React.ReactNode; label: string; tone?: 'out' | 'emb' | 'make' }) {
  return (
    <div className={`keyfig ${tone ?? ''}`}>
      <div className="kf-val mono">{value}</div>
      <div className="kf-lbl">{label}</div>
    </div>
  )
}

/** Sous la prédiction d'un bloc : le logit lens des premiers blocs répète le dernier mot lu (vérifié sur la trace, pas en dur). */
export function EarlyNote({ trace, layer }: { trace: Trace; layer: number }) {
  const { t } = useT()
  if (!lensEchoesInput(trace, layer)) return null
  return <p className="early-note">{t.earlyNote}</p>
}

function Tabs() {
  const { t } = useT()
  const { tab, setTab } = useStore()
  return (
    <div className="tabs" role="tablist">
      {(['journey', 'try', 'compare'] as const).map((k) => (
        <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{k === 'journey' ? t.tabs.journey : k === 'try' ? t.tabs.tryit : t.tabs.compare}</button>
      ))}
    </div>
  )
}

/** Panneau du trajet : explication de l'étape en cours, avec les vrais nombres de la trace. */
export function JourneyPanel({ trace, lay }: { trace: Trace; lay: JourneyLayout }) {
  const { t, num, pct } = useT()
  const progress = useStore((s) => s.progress)
  const tab = useStore((s) => s.tab)
  const out = useOutputProbs(trace)
  const seek = useStore((s) => s.seek)
  const setCam = useStore((s) => s.setCam)
  const c = trace.config
  const n = trace.tokens.length
  const toks = trace.tokens.map((x) => showTok(x.t))
  const s = stepAt(lay, progress)
  const lastTok = toks[n - 1]

  let body: React.ReactNode = null
  if (s.kind === 'tokens') {
    body = (
      <>
        <KeyFig value={n} label={t.keyfig.tokens(num(c.vocab, 0))} tone="emb" />
        <p>{t.step.tokens(n, num(c.vocab, 0))}</p>
        <div className="chips">{trace.tokens.map((x, i) => <span key={i} className="chip"><b className="mono">{toks[i]}</b><i className="mono">{x.id}</i></span>)}</div>
      </>
    )
  } else if (s.kind === 'embed') {
    body = (
      <>
        <KeyFig value={num(c.d_model, 0)} label={t.keyfig.embed} tone="emb" />
        <p>{t.step.embed(num(c.vocab, 0), num(c.d_model, 0))}</p>
        <details className="more"><summary>{t.keyfig.details}</summary>
          <p className="small muted">{t.step.embedVec(lastTok, c.d_model)}</p>
          <p className="mono vals">{trace.embeddings.first16[n - 1].slice(0, 8).map((v) => num(v, 4)).join('  ')} …</p>
        </details>
      </>
    )
  } else if (s.kind === 'block') {
    const l = s.layer!
    const w = meanAttnLast(trace, l)
    let kBest = 1
    for (let k = 1; k < n - 1; k++) if (w[k] > w[kBest]) kBest = k
    body = (
      <>
        <KeyFig value={<>{showTok(trace.layers[l].lens[0].t)} <span className="kf-sub">{pct(trace.layers[l].lens[0].p)}</span></>} label={t.keyfig.block} tone="out" />
        <EarlyNote trace={trace} layer={l} />
        <p>{t.step.block(l + 1)}</p>
        <details className="more"><summary>{t.keyfig.details}</summary>
          {n > 2 && <p className="small">{t.step.blockLooks(lastTok, toks[kBest], pct(w[kBest]), pct(w[0], 0))}</p>}
          <p className="small muted">{t.step.blockLens}</p>
          <Probs items={trace.layers[l].lens.slice(0, 3)} />
        </details>
      </>
    )
  } else if (s.kind === 'norm') {
    body = (
      <>
        <KeyFig value={`${num(trace.layers[c.n_layers - 1].resid_out_norm[n - 1], 1)} → ${num(trace.output.final_norm_last, 1)}`} label={t.keyfig.norm} />
        <p>{t.step.norm}</p>
      </>
    )
  } else if (s.kind === 'head') {
    body = (
      <>
        <KeyFig value={<>{showTok(trace.output.top50_logits[0].t)} <span className="kf-sub">{num(trace.output.top50_logits[0].logit, 2)}</span></>} label={t.keyfig.head} tone="out" />
        <p>{t.step.head(num(c.vocab, 0), c.tie_embeddings)}</p>
        <details className="more"><summary>{t.keyfig.details}</summary>
          <p className="small muted">{t.step.headTop}</p>
          <p className="mono vals">{trace.output.top50_logits.slice(0, 5).map((x) => `${showTok(x.t)} ${num(x.logit, 2)}`).join(' · ')}</p>
        </details>
      </>
    )
  } else {
    body = (
      <>
        <KeyFig value={<>{showTok(out.top10[0].t)} <span className="kf-sub">{pct(out.top10[0].p)}</span></>} label={t.keyfig.probs} tone="out" />
        <p>{t.step.probs}</p>
        <h2>{t.top10}</h2>
        <Probs items={out.top10} highlight={0} />
        {!out.exact && <p className="small muted">{t.tryit.srcTraceApprox}</p>}
      </>
    )
  }

  const cur = Math.floor(progress)
  if (tab === 'compare') return (
    <aside className="panel">
      <Header trace={trace} />
      <Tabs />
      <CompareTab />
      <Footer trace={trace} />
    </aside>
  )
  if (tab === 'try') return (
    <aside className="panel">
      <Header trace={trace} />
      <Tabs />
      <TryPanel trace={trace} />
      <Footer trace={trace} />
    </aside>
  )
  return (
    <aside className="panel">
      <Header trace={trace} />
      <Tabs />
      <h2 className="step-title">{stepName(t, s, lay.L)}</h2>
      <div className="step-body">{body}</div>
      <Fiche id={JOURNEY_PIECE[s.kind]} />

      <details className="more lens-box"><summary>{t.lensTitle}</summary>
      <p className="small muted">{t.lensNote}</p>
      <ol className="lens">
        {trace.layers.map((L, k) => {
          const idx = 2 + k
          const ok = L.lens[0].id === trace.output.greedy_id
          return (
            <li key={k} className={`${idx === cur ? 'cur' : ''} ${idx > cur ? 'future' : ''}`} onClick={() => { seek(idx); setCam('follow') }}>
              <span className="mono k">{k + 1}</span>
              <span className={`mono tok ${ok ? 'ok' : ''}`}>{showTok(L.lens[0].t)}</span>
              <span className="mono num">{pct(L.lens[0].p)}</span>
            </li>
          )
        })}
      </ol>
      </details>
      <Footer trace={trace} />
    </aside>
  )
}

/** Panneau de la vue « dans un bloc » (M2) : explication de l'étape, choix du bloc et de la tête. */
export function BlockPanel({ trace }: { trace: Trace }) {
  const { t, num, pct } = useT()
  const { layer, setLayer, head, setHead, blockStep, setBlockStep } = useStore()
  const c = trace.config
  const step = BLOCK_STEPS[blockStep]
  const perG = c.n_heads / c.n_kv_heads
  const g = Math.floor(head / perG)
  const groupHeads = Array.from({ length: perG }, (_, j) => g * perG + j + 1).join(', ')
  const ex = t.blk.explain
  const text = step === 'qkv' ? ex.qkv(head + 1, g + 1, groupHeads, perG)
    : step === 'heads' ? ex.heads(c.n_heads, c.n_kv_heads)
    : step === 'mlp' ? ex.mlp(num(c.d_model, 0), num(c.d_mlp, 0))
    : ex[step]

  // Clavier : ← → pour les étapes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.code === 'ArrowRight') setBlockStep(Math.min(BLOCK_STEPS.length - 1, blockStep + 1))
      if (e.code === 'ArrowLeft') setBlockStep(Math.max(0, blockStep - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <aside className="panel">
      <Header trace={trace} />
      <label className="row">
        <span>{t.layerLabel}</span>
        <input type="range" min={0} max={c.n_layers - 1} value={layer} onChange={(e) => setLayer(+e.target.value)} />
        <span className="mono">{layer + 1} / {c.n_layers}</span>
      </label>
      <label className="row">
        <span>{t.blk.head}</span>
        <input type="range" min={0} max={c.n_heads - 1} value={head} onChange={(e) => setHead(+e.target.value)} />
        <span className="mono">{head + 1} / {c.n_heads}</span>
      </label>
      <KeyFig value={<>{showTok(trace.layers[layer].lens[0].t)} <span className="kf-sub">{pct(trace.layers[layer].lens[0].p)}</span></>} label={t.keyfig.block} tone="out" />
      <EarlyNote trace={trace} layer={layer} />
      <h2 className="step-title">{t.blk.stepName[step]}</h2>
      <div className="step-body"><p>{text}</p></div>
      <details className="more"><summary>{t.blockLensTitle}</summary>
        <Probs items={trace.layers[layer].lens.slice(0, 5)} />
      </details>
      <Fiche id={BLOCK_PIECE[step]} />
      <Footer trace={trace} />
    </aside>
  )
}
