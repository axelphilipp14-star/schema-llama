// M3 — « À toi » : ta phrase (tokenizer en direct), la température, le token suivant (trace ou modèle en direct).
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Trace } from '../data/trace'
import { showTok } from '../data/trace'
import { useStore } from '../store'
import { useT } from '../i18n'
import { live, MODELS, useLive, type ModelKey } from '../live/useLive'
import { useOutputProbs } from '../data/useOutputProbs'
import { Probs } from './Panels'

type TraceEntry = { id: string; prompt: string; model: string; n_layers: number }

export function TryPanel({ trace }: { trace: Trace }) {
  const { t, num, pct } = useT()
  const T = useStore((s) => s.temperature)
  const setT = useStore((s) => s.setTemperature)
  const traceId = useStore((s) => s.traceId)
  const setTraceId = useStore((s) => s.setTraceId)
  const L = useLive()
  const [text, setText] = useState(trace.prompt)
  const [traces, setTraces] = useState<TraceEntry[]>([])
  const out = useOutputProbs(trace)
  const isTraced = text === trace.prompt

  useEffect(() => { live.initTokenizer() }, [])
  useEffect(() => { setText(trace.prompt) }, [trace.prompt])
  useEffect(() => { fetch(`${import.meta.env.BASE_URL}traces/index.json`).then((r) => r.json()).then(setTraces).catch(() => setTraces([])) }, [])

  // Tokenizer à chaque frappe ; modèle (s'il est chargé) après une courte pause.
  const tmr = useRef<number>(0)
  useEffect(() => {
    if (L.tokStatus === 'ready') live.tokenize(text)
    window.clearTimeout(tmr.current)
    if (L.status === 'ready' && text.trim()) tmr.current = window.setTimeout(() => live.run(text, useStore.getState().temperature), 450)
  }, [text, L.tokStatus, L.status])
  useEffect(() => { if (L.status === 'ready' && L.resultFor) live.dist(T) }, [T])

  const liveFresh = L.status === 'ready' && L.resultFor === text && L.top10.length > 0
  const liveKey = L.model
  const traceIs1B = trace.config.n_layers === 16
  const sameModel = liveKey && ((liveKey === '1b') === traceIs1B)

  // E6 : même phrase, même modèle → comparaison avec la trace.
  const cmp = useMemo(() => {
    if (!liveFresh || !isTraced || !sameModel || Math.abs(T - 1) > 1e-9) return null
    const a = new Set(trace.output.top10.map((x) => x.id))
    return { top1: L.top10[0]?.id === trace.output.top10[0].id, common: L.top10.filter((x) => a.has(x.id)).length }
  }, [liveFresh, isTraced, sameModel, T, L.top10])

  const toks = L.tokensFor === text ? L.tokens : []
  const loadBtn = (k: ModelKey) => (
    <button className={`btn ${k === '1b' ? 'primary' : ''}`} disabled={L.status === 'loading' || L.status === 'warming'} onClick={() => live.load(k)}>
      {k === '1b' ? t.tryit.load1b(num(MODELS[k].sizeGB, 1)) : t.tryit.load3b(num(MODELS[k].sizeGB, 1))}
    </button>
  )

  return (
    <div className="try">
      <h2 className="step-title">{t.tryit.title}</h2>

      <h3>{t.tryit.sentence}</h3>
      <textarea className="try-input mono" rows={2} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} aria-label={t.tryit.sentence} />
      <div className="chips small-chips">
        {L.tokStatus === 'loading' && <span className="muted small">{t.tryit.tokLoading}</span>}
        {L.tokStatus === 'error' && <span className="warn small">{t.tryit.tokError}</span>}
        {toks.map((x, i) => <span key={i} className="chip"><b className="mono">{showTok(x.t)}</b><i className="mono">{x.id}</i></span>)}
      </div>
      {toks.length > 0 && <p className="small muted">{t.tryit.tokCount(toks.length, text.length)}</p>}

      <h3>{t.tryit.temperature} <span className="mono temp-val">T = {num(T, 2)}</span></h3>
      <input type="range" className="temp" min={0} max={2} step={0.05} value={T} onChange={(e) => setT(+e.target.value)} aria-label={t.tryit.temperature} />
      <div className="temp-scale small muted"><span>0 · {t.tryit.t0}</span><span>1 · {t.tryit.t1}</span><span>2 · {t.tryit.t2}</span></div>

      <h3>{t.tryit.next}</h3>
      {liveFresh ? (
        <>
          <p className="small src-live">{t.tryit.srcLive(MODELS[liveKey!].label, num(L.forwardMs ?? 0, 0))}</p>
          <Probs items={L.top10} highlight={0} />
          <p className="small muted">{t.tryit.entropy(num(L.entropy ?? 0, 2))}</p>
          <div className="row-btns">
            <button className="btn" onClick={() => live.sample(T)}>{t.tryit.sample}</button>
            {L.sampled && <button className="btn" onClick={() => setText(text + L.sampled!.t)}>{t.tryit.append(showTok(L.sampled.t))}</button>}
          </div>
          {L.sampled && <p className="small">{t.tryit.sampled(showTok(L.sampled.t), pct(L.sampled.p, 2), L.sampled.rank >= 0 ? L.sampled.rank + 1 : null)}</p>}
          {cmp && <p className={`small ${cmp.top1 && cmp.common >= 8 ? 'ok' : 'warn'}`}>{t.tryit.compare(cmp.top1, cmp.common)}</p>}
        </>
      ) : isTraced ? (
        <>
          <p className="small src-trace">{out.exact ? t.tryit.srcTraceExact : t.tryit.srcTraceApprox}</p>
          <Probs items={out.top10} highlight={0} />
        </>
      ) : (
        <p className="small muted">{L.status === 'ready' ? t.tryit.computing : t.tryit.needLive}</p>
      )}

      <h3>{t.tryit.liveTitle}</h3>
      {L.status === 'idle' || L.status === 'error' ? (
        <>
          <p className="small muted">{t.tryit.liveIntro}</p>
          <div className="row-btns">{loadBtn('1b')}{loadBtn('3b')}</div>
          <p className="live-times">{t.liveTimes}</p>
          <details className="more"><summary>{t.keyfig.details}</summary><p className="small muted">{t.tryit.firstTime}</p></details>
          {L.error && <p className="small warn">{L.error === 'no-webgpu' ? t.tryit.noWebgpu : `${t.tryit.loadError} ${L.error}`}</p>}
        </>
      ) : L.status !== 'ready' ? (
        <>
          <p className="live-stage">{L.status === 'warming' ? t.liveStage.warm : t.liveStage.download}</p>
          <p className="small">{L.status === 'warming' ? t.tryit.warming : t.tryit.loading(MODELS[L.model!].label)}</p>
          {/* Préparation : pas d'avancement mesurable, la barre pulse au lieu de rester figée. */}
          <div className={`pbar wide ${L.status === 'warming' ? 'pulse' : ''}`}><span style={{ width: `${L.status === 'warming' ? 100 : Math.round(L.progress * 100)}%` }} /></div>
          {L.status === 'loading' && L.totalMB > 0 && <p className="small muted mono">{t.tryit.downloaded(num(L.loadedMB, 0), num(L.totalMB, 0), num(L.progress * 100, 0))}</p>}
          <p className="live-times">{t.liveTimes}</p>
        </>
      ) : (
        <>
          <p className="small ok">{t.tryit.ready(MODELS[L.model!].label, num(L.loadS ?? 0, 1), num(L.warmS ?? 0, 1), L.firstResultS != null ? num(L.firstResultS, 1) : '…')}</p>
          <div className="row-btns">{loadBtn(L.model === '1b' ? '3b' : '1b')}</div>
        </>
      )}
      <p className="small muted">{t.tryit.liveNote}</p>

      {traces.length > 0 && (
        <>
          <h3>{t.tryit.traced}</h3>
          <ul className="trace-list">
            {traces.map((x) => (
              <li key={x.id}>
                <button className={`linkish ${x.id === traceId ? 'on' : ''}`} onClick={() => { setTraceId(x.id); setText(x.prompt) }}>
                  <span className="mono">{t.q(x.prompt)}</span> <span className="muted small">· {x.model.split('/').pop()} · {x.n_layers} {t.tryit.blocks}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
