import type { Trace } from '../data/trace'
import { showTok } from '../data/trace'
import { useStore } from '../store'
import { useT } from '../i18n'
import { useEffect } from 'react'
import { stepAt, type JourneyLayout } from '../scene/journeyLayout'
import { BLOCK_STEPS } from '../scene/blockGeom'
import { meanAttnLast } from '../scene/Journey'
import { stepName } from './Timeline'
import { BLOCK_PIECE, Fiche, JOURNEY_PIECE } from './Fiche'

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

function Header({ trace }: { trace: Trace }) {
  const { t } = useT()
  const c = trace.config
  return (
    <>
      <div className="panel-head">
        <h1>{t.title}</h1>
        <LangToggle />
      </div>
      {c.n_layers !== 28 && <p className="warn">{t.devTrace(c.n_layers)}</p>}
      <p className="small muted">{t.hint}</p>
      <p className="muted">{t.sentence} : <span className="mono">{t.q(trace.prompt)}</span> · {t.tokensCount(trace.tokens.length)}</p>
    </>
  )
}

function Footer({ trace }: { trace: Trace }) {
  const { t, num } = useT()
  const c = trace.config
  return (
    <p className="small muted foot">
      {t.dims(num(c.d_model, 0), c.n_heads, c.n_kv_heads, num(c.d_mlp, 0), num(c.vocab, 0))} {t.source(trace.meta.dtype, trace.meta.date.slice(0, 10))}
      <br /><span className="built">{t.builtWith}</span>
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

/** Panneau du trajet : explication de l'étape en cours, avec les vrais nombres de la trace. */
export function JourneyPanel({ trace, lay }: { trace: Trace; lay: JourneyLayout }) {
  const { t, num, pct } = useT()
  const progress = useStore((s) => s.progress)
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
        <p>{t.step.tokens(n, num(c.vocab, 0))}</p>
        <div className="chips">{trace.tokens.map((x, i) => <span key={i} className="chip"><b className="mono">{toks[i]}</b><i className="mono">{x.id}</i></span>)}</div>
      </>
    )
  } else if (s.kind === 'embed') {
    body = (
      <>
        <p>{t.step.embed(num(c.vocab, 0), num(c.d_model, 0))}</p>
        <p className="small muted">{t.step.embedVec(lastTok, c.d_model)}</p>
        <p className="mono vals">{trace.embeddings.first16[n - 1].slice(0, 8).map((v) => num(v, 4)).join('  ')} …</p>
      </>
    )
  } else if (s.kind === 'block') {
    const l = s.layer!
    const w = meanAttnLast(trace, l)
    let kBest = 1
    for (let k = 1; k < n - 1; k++) if (w[k] > w[kBest]) kBest = k
    body = (
      <>
        <p>{t.step.block(l + 1)}</p>
        {n > 2 && <p className="small">{t.step.blockLooks(lastTok, toks[kBest], pct(w[kBest]), pct(w[0], 0))}</p>}
        <p className="small muted">{t.step.blockLens}</p>
        <Probs items={trace.layers[l].lens.slice(0, 3)} />
      </>
    )
  } else if (s.kind === 'norm') {
    body = (
      <>
        <p>{t.step.norm}</p>
        <p className="mono vals">{t.step.normVals(num(trace.layers[c.n_layers - 1].resid_out_norm[n - 1], 1), num(trace.output.final_norm_last, 1))}</p>
      </>
    )
  } else if (s.kind === 'head') {
    body = (
      <>
        <p>{t.step.head(num(c.vocab, 0), c.tie_embeddings)}</p>
        <p className="small muted">{t.step.headTop}</p>
        <p className="mono vals">{trace.output.top50_logits.slice(0, 5).map((x) => `${showTok(x.t)} ${num(x.logit, 2)}`).join(' · ')}</p>
      </>
    )
  } else {
    body = (
      <>
        <p>{t.step.probs}</p>
        <p>{t.step.chosen} : <b className="mono chosen">{showTok(trace.output.top10[0].t)}</b></p>
        <h2>{t.top10}</h2>
        <Probs items={trace.output.top10} highlight={0} />
      </>
    )
  }

  const cur = Math.floor(progress)
  return (
    <aside className="panel">
      <Header trace={trace} />
      <h2 className="step-title">{stepName(t, s, lay.L)}</h2>
      <div className="step-body">{body}</div>
      <Fiche id={JOURNEY_PIECE[s.kind]} />

      <h2>{t.lensTitle}</h2>
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
      <Footer trace={trace} />
    </aside>
  )
}

/** Panneau de la vue « dans un bloc » (M2) : explication de l'étape, choix du bloc et de la tête. */
export function BlockPanel({ trace }: { trace: Trace }) {
  const { t, num } = useT()
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
      <h2 className="step-title">{t.blk.stepName[step]}</h2>
      <div className="step-body"><p>{text}</p></div>
      <Fiche id={BLOCK_PIECE[step]} />
      <h2>{t.blockLensTitle}</h2>
      <Probs items={trace.layers[layer].lens.slice(0, 5)} />
      <Footer trace={trace} />
    </aside>
  )
}
