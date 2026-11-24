// 1B ↔ 3B : même phrase, deux tailles de Llama 3.2. Tout vient des traces (public/traces/index.json).
import { useEffect, useState } from 'react'
import { showTok } from '../data/trace'
import { llamaParams } from '../data/math'
import { useStore } from '../store'
import { useT } from '../i18n'
import type { TraceSummary } from '../scene/MakeScene'

type S = TraceSummary & { lens: { id: number; t: string; p: number }[]; config: Parameters<typeof llamaParams>[0] }
const SENTS = ['en-satellite', 'en-capital', 'fr-satellite', 'fr-souris', 'en-orbit']
const MODELS = [['3b-instruct', 'Llama 3.2 3B'], ['1b-instruct', 'Llama 3.2 1B']] as const

/** Premier bloc (1…L) où le token final est déjà le premier choix du logit lens, et y reste jusqu'au bout. */
export function settleBlock(x: { lens: { id: number }[]; top5: { id: number }[] }) {
  const fin = x.top5[0].id
  let k = x.lens.length
  while (k > 0 && x.lens[k - 1].id === fin) k--
  return k < x.lens.length ? k + 1 : null
}

export function CompareTab() {
  const { t, num, pct } = useT()
  const setTraceId = useStore((s) => s.setTraceId)
  const setTab = useStore((s) => s.setTab)
  const [idx, setIdx] = useState<S[]>([])
  const [sent, setSent] = useState('en-satellite')
  useEffect(() => { fetch(`${import.meta.env.BASE_URL}traces/index.json`).then((r) => r.json()).then(setIdx).catch(() => {}) }, [])
  const get = (m: string) => idx.find((x) => x.id === `${m}-${sent}`)
  const a = get('3b-instruct'), b = get('1b-instruct')
  if (!a || !b) return <p className="muted small">…</p>
  const rows: [string, (x: S) => string][] = [
    [t.cmp.blocks, (x) => String(x.config.n_layers)],
    [t.cmp.dim, (x) => num(x.config.d_model, 0)],
    [t.cmp.heads, (x) => `${x.config.n_heads} / ${x.config.n_kv_heads}`],
    [t.cmp.mlp, (x) => num(x.config.d_mlp, 0)],
    [t.cmp.params, (x) => t.cmp.bn(num(llamaParams(x.config).total / 1e9, 2))],
    [t.cmp.top1, (x) => `${showTok(x.top5[0].t)} ${pct(x.top5[0].p, 1)}`],
  ]
  return (
    <div className="cmp">
      <h2 className="step-title">{t.cmp.title}</h2>
      <p>{t.cmp.intro}</p>
      <label className="row sent-pick"><span>{t.sentence}</span>
        <select value={sent} onChange={(e) => setSent(e.target.value)}>
          {SENTS.map((id) => <option key={id} value={id}>{idx.find((x) => x.id === `3b-instruct-${id}`)?.prompt ?? id}</option>)}
        </select>
      </label>
      <table className="ctable cmp-table">
        <thead><tr><th /><th>3B</th><th>1B</th></tr></thead>
        <tbody>{rows.map(([lbl, f]) => <tr key={lbl}><td>{lbl}</td><td className="mono" data-cmp="3b">{f(a as S)}</td><td className="mono" data-cmp="1b">{f(b as S)}</td></tr>)}</tbody>
      </table>
      {a.top5[0].id !== b.top5[0].id && <p className="small warn">{t.cmp.disagree}</p>}

      <h3>{t.cmp.lensTitle}</h3>
      <p className="small muted">{t.cmp.lensNote}</p>
      {([a, b] as S[]).map((x, i) => {
        const fin = x.top5[0].id
        const k = settleBlock(x)
        return (
          <div key={x.id} className="strip-row">
            <span className="mono small">{MODELS[i][1].replace('Llama 3.2 ', '')}</span>
            <div className="strip" title={MODELS[i][1]}>
              {x.lens.map((l, j) => (
                <i key={j} className={l.id === fin ? 'hit' : ''} style={l.id === fin ? { opacity: 0.35 + 0.65 * Math.min(1, l.p / 0.8) } : undefined}
                  title={`${t.blockHover(j + 1)} · ${showTok(l.t)} ${pct(l.p, 1)}`} />
              ))}
            </div>
            <span className="small mono">{k ? t.cmp.settle(k, x.lens.length, Math.round((k / x.lens.length) * 100)) : '—'}</span>
          </div>
        )
      })}
      <p className="small">{t.cmp.reading(showTok(a.top5[0].t), settleBlock(a) ?? 0, a.lens.length, settleBlock(b) ?? 0, b.lens.length)}</p>
      <div className="row-btns">
        <button className="btn" onClick={() => { setTraceId(`3b-instruct-${sent}`); setTab('journey') }}>{t.cmp.see('3B')}</button>
        <button className="btn" onClick={() => { setTraceId(`1b-instruct-${sent}`); setTab('journey') }}>{t.cmp.see('1B')}</button>
      </div>
    </div>
  )
}
