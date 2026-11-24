// M2 — Carte de calcul : l'opération de l'étape en cours, avec les vrais nombres de la trace.
// Les valeurs « calculé ici » sont refaites dans le navigateur à partir de la trace (et vérifiées par tests/m2-math.test.ts).
import type { CSSProperties, ReactNode } from 'react'
import type { NormDetail, Trace } from '../data/trace'
import { showTok } from '../data/trace'
import { expShift, mixV, rmsApply, silu } from '../data/math'
import { useStore } from '../store'
import { useT } from '../i18n'
import { BLOCK_STEPS } from '../scene/blockGeom'
import { div } from '../scene/colors'

/** Révélation progressive : chaque ligne apparaît avec un petit délai. */
const rv = (i: number): CSSProperties => ({ animationDelay: `${i * 140}ms` })

function Row({ label, vals, i, tag, cls, d = 4 }: { label: ReactNode; vals: number[]; i: number; tag?: string; cls?: string; d?: number }) {
  const { num } = useT()
  return (
    <div className={`crow ${cls ?? ''}`} style={rv(i)}>
      <span className="clabel">{label}{tag && <em className="tag">{tag}</em>}</span>
      {vals.map((v, j) => <span key={j} className="mono cval" data-v={v}>{num(v, d)}</span>)}
      <span className="mono cval muted">…</span>
    </div>
  )
}

function Heat({ label, rows, tokens, i }: { label: string; rows: number[][]; tokens: string[]; i: number }) {
  const { num } = useT()
  const m = Math.max(...rows.flat().map(Math.abs))
  return (
    <div className="heat" style={rv(i)}>
      <div className="small muted">{label}</div>
      {rows.map((r, k) => (
        <div key={k} className="crow">
          <span className="clabel mono">{tokens[k]}</span>
          {r.map((v, j) => <span key={j} className="hcell" title={num(v, 4)} style={{ background: `#${div(v, m).getHexString()}` }} />)}
        </div>
      ))}
    </div>
  )
}

function NormCard({ d, title }: { d: NormDetail; title?: string }) {
  const { t, num } = useT()
  const xr = d.x8.map((x) => x / d.rms)
  return (
    <>
      {title && <p className="small muted" style={rv(0)}>{title}</p>}
      <Row label={t.blk.rowX} vals={d.x8} i={0} tag={t.blk.fromTrace} />
      <div className="crow" style={rv(1)}><span className="clabel mono">{t.blk.rowRms(num(d.rms, 5))}</span></div>
      <Row label={t.blk.rowXr} vals={xr} i={2} tag={t.blk.calc} cls="is-calc" />
      <Row label={t.blk.rowW} vals={d.w8} i={3} tag={t.blk.fromTrace} />
      <Row label={t.blk.rowY} vals={d.y8} i={4} tag={t.blk.fromTrace} cls="result" />
      <p className="small muted" style={rv(5)}>{t.blk.calc} : x ÷ RMS × w = {rmsApply(d).slice(0, 3).map((v) => num(v, 4)).join(' · ')} …</p>
    </>
  )
}

export function BlockCalc({ trace }: { trace: Trace }) {
  const { t, num, pct } = useT()
  const { layer, head, blockStep } = useStore()
  const step = BLOCK_STEPS[blockStep]
  const L = trace.layers[layer]
  const c = trace.config
  const n = trace.tokens.length
  const toks = trace.tokens.map((x) => showTok(x.t))
  const perG = c.n_heads / c.n_kv_heads
  const g = Math.floor(head / perG)
  const p = L.attn[head][n - 1]
  const scores = L.last.scores[head]

  let body: ReactNode = null
  if (step === 'norm1') body = <NormCard d={L.norm1} />
  else if (step === 'qkv') body = (
    <>
      <Row label={t.blk.q(head + 1)} vals={L.last.q8[head]} i={0} tag={t.blk.fromTrace} />
      <div className="heats">
        <Heat label={t.blk.kTitle(g + 1)} rows={L.last.k8[g]} tokens={toks} i={1} />
        <Heat label={t.blk.vTitle(g + 1)} rows={L.last.v8[g]} tokens={toks} i={2} />
      </div>
      <p className="small muted" style={rv(3)}>{t.blk.dims8(c.head_dim)} · {t.blk.hoverCell}</p>
    </>
  )
  else if (step === 'scores' || step === 'softmax') {
    const e = expShift(scores)
    const pMax = Math.max(...p)
    body = (
      <>
        <table className="ctable">
          <thead><tr><th>{t.blk.colTok}</th><th>{t.blk.colScore}</th>{step === 'softmax' && <><th>{t.blk.colExp}<em className="tag">{t.blk.calc}</em></th><th>{t.blk.colP}</th></>}</tr></thead>
          <tbody>
            {toks.map((tk, k) => (
              <tr key={k} style={rv(k)}>
                <td className="mono">{tk}</td>
                <td className="mono" data-v={scores[k]}>{num(scores[k], 3)}</td>
                {step === 'softmax' && <>
                  <td className="mono muted">{num(e[k], 4)}</td>
                  <td className="mono"><span className="pbar"><span style={{ width: `${(p[k] / pMax) * 100}%` }} /></span><span data-p={p[k]}>{pct(p[k], 2)}</span></td>
                </>}
              </tr>
            ))}
            {step === 'softmax' && <tr className="sum"><td>{t.blk.sum}</td><td /><td className="mono muted">{num(e.reduce((a, b) => a + b, 0), 4)}</td><td className="mono">{pct(p.reduce((a, b) => a + b, 0), 1)}</td></tr>}
          </tbody>
        </table>
        {step === 'scores' && <p className="small muted">{t.blk.scoreNote(c.head_dim)}</p>}
      </>
    )
  }
  else if (step === 'mix') {
    const order = p.map((v, k) => [v, k] as const).sort((a, b) => b[0] - a[0])
    const top = order.slice(0, 3)
    const rest = order.slice(3)
    const ctx = mixV(p, L.last.v8[g])
    body = (
      <>
        {top.map(([pk, k], i) => <Row key={k} label={t.blk.mixRow(pct(pk, 1), toks[k])} vals={L.last.v8[g][k].map((v) => v * pk)} i={i} />)}
        {rest.length > 0 && <div className="crow muted" style={rv(3)}><span className="clabel">{t.blk.others(rest.length, pct(rest.reduce((a, [v]) => a + v, 0), 1))}</span></div>}
        <Row label={t.blk.mixOut} vals={L.last.ctx8[head]} i={4} tag={t.blk.fromTrace} cls="result" />
        <Row label={t.blk.mixCheck} vals={ctx} i={5} tag={t.blk.calc} cls="is-calc" />
      </>
    )
  }
  else if (step === 'heads') {
    const heads = Array.from({ length: perG }, (_, j) => g * perG + j)
    body = (
      <>
        <p className="small muted">{t.blk.headsTable} {g + 1}</p>
        <table className="ctable">
          <tbody>
            {heads.map((hh, i) => {
              const row = L.attn[hh][n - 1]
              let kb = 1
              for (let k = 1; k < n; k++) if (row[k] > row[kb]) kb = k
              return (
                <tr key={hh} style={rv(i)} className={hh === head ? 'sel' : ''}>
                  <td>{t.blk.head} {hh + 1}</td><td className="muted">{t.blk.looksAt}</td><td className="mono">{toks[kb]}</td><td className="mono">{pct(row[kb], 1)}</td>
                  <td className="muted mono">{toks[0]} {pct(row[0], 0)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </>
    )
  }
  else if (step === 'add1' || step === 'add2') {
    const rows: [string, number, string?][] = step === 'add1'
      ? [[t.blk.normIn, L.resid_in_norm[n - 1]], [t.blk.normAttn, L.attn_out_norm[n - 1], '+'], [t.blk.normMid, L.mid_norm[n - 1], '=']]
      : [[t.blk.normMid, L.mid_norm[n - 1]], [t.blk.normMlp, L.mlp.out_norm[n - 1], '+'], [t.blk.normOut, L.resid_out_norm[n - 1], '=']]
    body = (
      <>
        <table className="ctable"><tbody>
          {rows.map(([lbl, v, op], i) => <tr key={i} style={rv(i)} className={op === '=' ? 'sum' : ''}><td className="mono">{op ?? ''}</td><td>{lbl}</td><td className="mono" data-v={v}>{num(v, 2)}</td></tr>)}
        </tbody></table>
        <p className="small muted" style={rv(3)}>{t.blk.normNote}</p>
      </>
    )
  }
  else if (step === 'mlp') {
    const top = L.mlp.top.slice(0, 8)
    body = (
      <>
        <p className="small muted" style={rv(0)}>{t.blk.rms2(num(L.norm2.rms, 5))}</p>
        <table className="ctable">
          <thead><tr><th>{t.blk.neuron}</th><th>{t.blk.gate}</th><th>{t.blk.siluGate}<em className="tag">{t.blk.calc}</em></th><th>{t.blk.up}</th><th>{t.blk.act}</th></tr></thead>
          <tbody>
            {top.map((x, i) => (
              <tr key={x.i} style={rv(i + 1)}>
                <td className="mono muted">{x.i}</td><td className="mono">{num(x.gate, 3)}</td><td className="mono muted">{num(silu(x.gate), 3)}</td>
                <td className="mono">{num(x.up, 3)}</td><td className="mono" data-v={x.act}>{num(x.act, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted">{t.blk.mlpNote(8, num(c.d_mlp, 0))}</p>
      </>
    )
  }

  return (
    <div className="calc" key={`${layer}-${head}-${blockStep}`}>
      <div className="calc-head">
        <b>{t.blk.stepName[step]}</b>
        <span className="muted small">{t.blockTitle(layer + 1, c.n_layers)}{['qkv', 'scores', 'softmax', 'mix', 'heads'].includes(step) && ` · ${t.blk.head} ${head + 1} · ${t.blk.group} ${g + 1}`} · {t.q(toks[n - 1])}</span>
      </div>
      {body}
    </div>
  )
}

/** Barre d'étapes de la vue bloc (← → au clavier). */
export function BlockSteps() {
  const { t } = useT()
  const { blockStep, setBlockStep, backToJourney } = useStore()
  const N = BLOCK_STEPS.length
  const go = (i: number) => setBlockStep(Math.max(0, Math.min(N - 1, i)))
  return (
    <div className="timeline">
      <div className="tl-controls">
        <button className="btn" onClick={backToJourney}>{t.back}</button>
        <button className="btn icon" onClick={() => go(blockStep - 1)} aria-label={t.blk.prevStep}>‹</button>
        <button className="btn icon" onClick={() => go(blockStep + 1)} aria-label={t.blk.nextStep}>›</button>
        <span className="tl-name">{t.blk.stepName[BLOCK_STEPS[blockStep]]}</span>
      </div>
      <div className="tl-track">
        {BLOCK_STEPS.map((s, i) => (
          <button key={s} className={`tl-seg bs ${i === blockStep ? 'cur' : ''} ${i <= blockStep ? 'done' : ''} k-${s}`} onClick={() => go(i)} title={t.blk.stepName[s]} aria-label={t.blk.stepName[s]}>
            <span className="bs-name">{t.blk.stepName[s]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
