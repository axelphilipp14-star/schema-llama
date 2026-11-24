// M4 — Panneau de la phase « fabriquer » : explication, chiffres avec leur source, fiche tirée des enquêtes.
import type { ReactNode } from 'react'
import facts from '../../content/fabriquer.json'
import { showTok } from '../data/trace'
import { llamaParams } from '../data/math'
import { useStore } from '../store'
import { useT } from '../i18n'
import { MAKE_STEPS, type TraceSummary } from '../scene/MakeScene'
import { Fiche } from './Fiche'
import { Footer, Header } from './Panels'

/** 1,7 × 10²³ (écriture scientifique avec exposant en exposant). */
function sci(x: number, num: (v: number, d?: number) => string) {
  const e = Math.floor(Math.log10(x))
  const sup = String(e).split('').map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]).join('')
  return `${num(x / 10 ** e, 1)} × 10${sup}`
}

type Src = 'meta' | 'calc' | 'trace' | 'enq'
function Fact({ label, value, src }: { label: ReactNode; value: ReactNode; src: Src }) {
  const { t } = useT()
  return (
    <tr>
      <td>{label}</td>
      <td className="mono">{value}</td>
      <td><em className={`tag src-${src}`}>{t.make.src[src]}</em></td>
    </tr>
  )
}

const SENTS = ['en-capital', 'en-satellite', 'fr-satellite', 'fr-souris', 'en-orbit']
const PIECE: Record<string, string> = { data: 'data', tokenizer: 'tokenizer', pretraining: 'pretraining', finetuning: 'finetuning' }

export function MakePanel({ traces }: { traces: TraceSummary[] }) {
  const { t, num, pct, lang } = useT()
  const { makeStep, makeSentence, setMakeSentence } = useStore()
  const k = makeStep < 0 ? null : MAKE_STEPS[makeStep]
  const inst = (id: string) => traces.find((x) => x.id === `3b-instruct-${id}`)
  const base = (id: string) => traces.find((x) => x.id === `3b-base-${id}`)
  const cur = inst(makeSentence)
  const cfg = cur?.config as Parameters<typeof llamaParams>[0] | undefined
  const P = cfg ? llamaParams(cfg).total : null

  let body: ReactNode = <p>{t.make.overview}</p>
  if (k === 'data') body = (
    <>
      <p>{t.make.explain.data}</p>
      <table className="ctable facts"><tbody>
        <Fact label={t.make.f.tokens} value={t.make.trillions(num(facts.donnees.tokens_max / 1e12, 0))} src="meta" />
        <Fact label={t.make.f.cutoff} value={facts.donnees.cutoff[lang]} src="meta" />
        <Fact label={t.make.f.langs} value={facts.langues.split(', ').length} src="meta" />
      </tbody></table>
      <p className="small muted">{t.make.funnelNote}</p>
    </>
  )
  if (k === 'tokenizer') {
    const rows = SENTS.map((id) => inst(id)).filter(Boolean).map((x) => ({ x: x!, words: x!.prompt.trim().split(/\s+/).length, toks: x!.tokens.length - 1 }))
    const avg = (fr: boolean) => { const r = rows.filter((y) => y.x.id.includes('-fr-') === fr); return r.reduce((a, y) => a + y.toks, 0) / r.reduce((a, y) => a + y.words, 0) }
    body = (
      <>
        <p>{t.make.explain.tokenizer}</p>
        <table className="ctable facts"><tbody>
          <Fact label={t.make.f.vocab} value={num(cfg?.vocab ?? 0, 0)} src="trace" />
          <Fact label={t.make.f.fertEn} value={num(avg(false), 2)} src="calc" />
          <Fact label={t.make.f.fertFr} value={num(avg(true), 2)} src="calc" />
        </tbody></table>
        <table className="ctable"><tbody>
          {rows.map(({ x, words, toks }) => <tr key={x.id}><td className="mono small">{t.q(x.prompt)}</td><td className="mono nowrap">{toks} / {words}</td></tr>)}
        </tbody></table>
        <p className="small muted">{t.make.fertNote}</p>
      </>
    )
  }
  if (k === 'pretraining' && P) {
    const ratio = facts.donnees.tokens_max / P
    const b = base('en-capital'), i = inst('en-capital')
    const target = i?.top5[0]
    const pB = target && b?.top5.find((x) => x.id === target.id)?.p
    body = (
      <>
        <p>{t.make.explain.pretraining}</p>
        <table className="ctable facts"><tbody>
          <Fact label={t.make.f.params} value={t.make.billions(num(P / 1e9, 2))} src="calc" />
          <Fact label={t.make.f.tokens} value={t.make.trillions(num(facts.donnees.tokens_max / 1e12, 0))} src="meta" />
          <Fact label={t.make.f.ratio} value={`${num(ratio, 0)} (Chinchilla ≈ 20)`} src="calc" />
          <Fact label={t.make.f.flop} value={`≈ ${sci(6 * P * facts.donnees.tokens_max, num)}`} src="calc" />
          <Fact label={t.make.f.gpuh} value={num(facts.pretraining.gpu_hours_3b, 0)} src="meta" />
          <Fact label={t.make.f.co2} value={`${num(facts.pretraining.co2_tonnes_3b, 0)} t`} src="meta" />
        </tbody></table>
        <p className="small">{facts.pretraining.distillation[lang]}</p>
        <p className="small muted">{t.make.gpuNote(num(facts.pretraining.gpu_hours_total_texte, 0), num(facts.pretraining.gpu_hours_1b, 0), num(facts.pretraining.gpu_hours_3b, 0), num(facts.pretraining.gpu_hours_logits, 0))}</p>
        {target && pB != null && (
          <div className="loss">
            <h3>{t.make.lossTitle}</h3>
            <p className="small">{t.make.lossText(t.q(b!.prompt), showTok(target.t), pct(pB, 1), num(-Math.log(pB), 2))}</p>
          </div>
        )}
      </>
    )
  }
  if (k === 'finetuning') body = (
    <>
      <p>{t.make.explain.finetuning}</p>
      <p className="small">{facts.finetuning.etapes[lang]} <em className="tag src-meta">{t.make.src.meta}</em></p>
      <table className="ctable">
        <thead><tr><th>{t.sentence}</th><th>{t.make.base}</th><th>{t.make.instruct}</th></tr></thead>
        <tbody>
          {SENTS.map((id) => {
            const i = inst(id), b = base(id)
            if (!i || !b) return null
            const tgt = i.top5[0]
            const pb = b.top5.find((x) => x.id === tgt.id)?.p
            return (
              <tr key={id} className={id === makeSentence ? 'sel' : ''} onClick={() => setMakeSentence(id)} style={{ cursor: 'pointer' }}>
                <td className="mono small">{t.q(i.prompt)} → <b>{showTok(tgt.t)}</b></td>
                <td className="mono">{pb == null ? t.make.notInTop5 : pct(pb, 1)}</td>
                <td className="mono">{pct(tgt.p, 1)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="small muted">{t.make.ftNote}</p>
    </>
  )

  return (
    <aside className="panel">
      <Header traceHidden />
      <h2 className="step-title">{k ? `${makeStep + 1}. ${t.make.step[k]}` : t.make.overviewTitle}</h2>
      <div className="step-body">{body}</div>
      {(k === 'tokenizer' || k === 'finetuning') && (
        <label className="row sent-pick"><span>{t.sentence}</span>
          <select value={makeSentence} onChange={(e) => setMakeSentence(e.target.value)}>
            {SENTS.map((id) => <option key={id} value={id}>{inst(id)?.prompt ?? id}</option>)}
          </select><span />
        </label>
      )}
      {k && <Fiche id={PIECE[k]} />}
      {k === 'pretraining' && <Fiche id="scaling" />}
      <p className="small muted foot">{t.make.sourceLine} <a href={facts.source.url} target="_blank" rel="noreferrer">{facts.source.titre}</a> ({facts.source.verifie}).</p>
      <Footer />
    </aside>
  )
}

export function MakeSteps() {
  const { t } = useT()
  const { makeStep, setMakeStep } = useStore()
  return (
    <div className="timeline">
      <div className="tl-controls">
        <button className="btn icon" onClick={() => setMakeStep(Math.max(0, makeStep - 1))} aria-label={t.blk.prevStep}>‹</button>
        <button className="btn icon" onClick={() => setMakeStep(Math.min(MAKE_STEPS.length - 1, makeStep + 1))} aria-label={t.blk.nextStep}>›</button>
        <span className="tl-name">{makeStep < 0 ? t.make.overviewTitle : t.make.step[MAKE_STEPS[makeStep]]}</span>
        <span className="tl-spacer" />
        <button className={`btn ${makeStep < 0 ? 'on' : ''}`} onClick={() => setMakeStep(-1)}>{t.overview}</button>
      </div>
      <div className="tl-track">
        {MAKE_STEPS.map((s, i) => (
          <button key={s} className={`tl-seg bs ${i === makeStep ? 'cur' : ''} ${i <= makeStep ? 'done make' : ''}`} onClick={() => setMakeStep(i)} aria-label={t.make.step[s]}>
            <span className="bs-name">{i + 1}. {t.make.step[s]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
