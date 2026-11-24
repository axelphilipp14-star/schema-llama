// Mini-carte 2D synchronisée avec la 3D : le schéma de la vue en cours, l'étape active allumée, cliquable.
import { useStore } from '../store'
import { useT } from '../i18n'
import { stepAt, type JourneyLayout } from '../scene/journeyLayout'
import { BLOCK_STEPS } from '../scene/blockGeom'
import { MAKE_STEPS } from '../scene/MakeScene'

type Node = { key: string; label: string; on: boolean; go: () => void; color: string; ticks?: { n: number; cur: number; go: (i: number) => void } }

function Row({ nodes, title }: { nodes: Node[]; title: string }) {
  return (
    <nav className="minimap" aria-label={title}>
      {nodes.map((n, i) => (
        <span key={n.key} className="mm-item">
          {i > 0 && <span className="mm-arrow">→</span>}
          <button className={`mm-node ${n.on ? 'on' : ''}`} style={{ ['--c' as string]: n.color }} onClick={n.go}>
            {n.label}
            {n.ticks && (
              <span className="mm-ticks" onClick={(e) => e.stopPropagation()}>
                {Array.from({ length: n.ticks.n }, (_, k) => (
                  <i key={k} className={k === n.ticks!.cur ? 'cur' : k < n.ticks!.cur ? 'done' : ''} onClick={() => n.ticks!.go(k)} />
                ))}
              </span>
            )}
          </button>
        </span>
      ))}
    </nav>
  )
}

export function MiniMap({ lay }: { lay: JourneyLayout }) {
  const { t } = useT()
  const s = useStore()
  const title = t.minimap.title
  if (s.phase === 'make') {
    return <Row title={title} nodes={MAKE_STEPS.map((k, i) => ({ key: k, label: t.make.step[k], on: s.makeStep === i, go: () => s.setMakeStep(i), color: 'var(--make)' }))} />
  }
  if (s.view === 'block') {
    const b = BLOCK_STEPS[s.blockStep]
    const attn = ['qkv', 'scores', 'softmax', 'mix', 'heads'].includes(b)
    return <Row title={title} nodes={[
      { key: 'in', label: t.minimap.blockIn(s.layer + 1), on: false, go: () => s.backToJourney(), color: 'var(--emb)' },
      { key: 'n1', label: t.blk.normLbl, on: b === 'norm1', go: () => s.setBlockStep(0), color: 'var(--norm)' },
      { key: 'at', label: t.minimap.attention, on: attn, go: () => s.setBlockStep(1), color: 'var(--attn)' },
      { key: 'a1', label: '＋', on: b === 'add1', go: () => s.setBlockStep(6), color: 'var(--attn)' },
      { key: 'n2', label: t.blk.normLbl, on: false, go: () => s.setBlockStep(7), color: 'var(--norm)' },
      { key: 'ml', label: 'MLP', on: b === 'mlp', go: () => s.setBlockStep(7), color: 'var(--mlp)' },
      { key: 'a2', label: '＋', on: b === 'add2', go: () => s.setBlockStep(8), color: 'var(--mlp)' },
    ]} />
  }
  const st = stepAt(lay, s.progress)
  const seek = (i: number) => { s.seek(i); s.setPlaying(false); s.setCam('follow') }
  return <Row title={title} nodes={[
    { key: 'tok', label: t.minimap.tokens, on: st.kind === 'tokens', go: () => seek(0), color: 'var(--emb)' },
    { key: 'emb', label: t.minimap.embed, on: st.kind === 'embed', go: () => seek(1), color: 'var(--emb)' },
    { key: 'blk', label: t.minimap.blocks(lay.L), on: st.kind === 'block', go: () => seek(2), color: 'var(--attn)',
      ticks: { n: lay.L, cur: st.kind === 'block' ? st.layer! : st.kind === 'tokens' || st.kind === 'embed' ? -1 : lay.L, go: (k) => seek(2 + k) } },
    { key: 'norm', label: t.finalNorm, on: st.kind === 'norm', go: () => seek(2 + lay.L), color: 'var(--norm)' },
    { key: 'head', label: t.minimap.head, on: st.kind === 'head', go: () => seek(3 + lay.L), color: 'var(--out)' },
    { key: 'p', label: t.minimap.probs, on: st.kind === 'probs', go: () => seek(4 + lay.L), color: 'var(--out)' },
  ]} />
}

/** Légende : poids (fil de fer) / activations (plein). */
export function WeightLegend() {
  const { t } = useT()
  return (
    <div className="wlegend" aria-hidden>
      <span><i className="sw-act" />{t.minimap.act}</span>
      <span><i className="sw-w" />{t.minimap.weights}</span>
    </div>
  )
}
