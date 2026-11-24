import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Block, X } from './scene/Block'
import { C } from './scene/colors'
import { loadTrace, showTok, type Trace } from './data/trace'
import { useStore } from './store'
import { Fps } from './ui/Fps'
import { FitCamera } from './scene/FitCamera'
import { LabelOverlay, LabelProjector } from './scene/labels'

const TRACE_ID = new URLSearchParams(location.search).get('trace') ?? 'dev-1b-satellite'

export default function App() {
  const [trace, setTrace] = useState<Trace | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { loadTrace(TRACE_ID).then(setTrace).catch((e) => setErr(String(e))) }, [])

  if (err) return <div className="center">{err}</div>
  if (!trace) return <div className="center">Chargement de la trace…</div>
  return (
    <div className="app">
      <div className="stage">
      <Canvas camera={{ position: [9.5, 6.5, 19], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={[C.bg]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 10, 8]} intensity={1.2} />
        <Block trace={trace} />
        <LabelProjector />
        <OrbitControls enableDamping makeDefault />
        <FitCamera target={[(X.in + X.out) / 2 - 0.5, 2.1, 0.6]} w={X.out - X.in + 3.5} h={7} dir={[-0.3, 0.75, 1]} />
      </Canvas>
      <LabelOverlay />
      <HoverBox />
      <Fps />
      </div>
      <Panel trace={trace} />
    </div>
  )
}

function Panel({ trace }: { trace: Trace }) {
  const { layer, setLayer } = useStore()
  const L = trace.layers[layer]
  const c = trace.config
  const is3B = c.n_layers === 28
  return (
    <aside className="panel">
      <h1>Un bloc de {trace.meta.model_id.split('/').pop()}</h1>
      {!is3B && <p className="warn">Trace de développement ({c.n_layers} couches). La trace du 3B (28 couches) arrive du notebook Kaggle.</p>}
      <p className="small muted">Glisse pour tourner, molette pour zoomer, survole une case pour lire sa valeur exacte.</p>
      <p className="muted">Phrase : <span className="mono">« {trace.prompt} »</span> · {trace.tokens.length} tokens</p>

      <label className="row">
        <span>Bloc</span>
        <input type="range" min={0} max={c.n_layers - 1} value={layer} onChange={(e) => setLayer(+e.target.value)} />
        <span className="mono">{layer + 1} / {c.n_layers}</span>
      </label>

      <h2>Lu à la sortie de ce bloc <span className="muted">(logit lens)</span></h2>
      <Probs items={L.lens} />

      <h2>Sortie finale du modèle <span className="muted">(top-10)</span></h2>
      <Probs items={trace.output.top10} />

      <p className="small muted">
        Dimensions lues dans la trace : {c.d_model.toLocaleString('fr-FR')} · {c.n_heads} têtes · {c.n_kv_heads} K/V · MLP {c.d_mlp.toLocaleString('fr-FR')} · vocabulaire {c.vocab.toLocaleString('fr-FR')}.
        Couleurs de l'attention en échelle racine ; hauteurs du flux en échelle log.
        Source : trace {trace.meta.dtype}, {trace.meta.date.slice(0, 10)}.
      </p>
    </aside>
  )
}

function Probs({ items }: { items: { t: string; p: number }[] }) {
  const max = items[0]?.p || 1
  return (
    <ol className="probs">
      {items.map((it, i) => (
        <li key={i}>
          <span className="mono tok">{showTok(it.t)}</span>
          <span className="bar"><span style={{ width: `${(it.p / max) * 100}%` }} /></span>
          <span className="mono num" data-p={it.p}>{(it.p * 100).toFixed(1)} %</span>
        </li>
      ))}
    </ol>
  )
}

function HoverBox() {
  const hover = useStore((s) => s.hover)
  if (!hover) return null
  return (
    <div className="hover">
      <div>{hover.label}</div>
      <div className="mono big">{hover.value}</div>
    </div>
  )
}
