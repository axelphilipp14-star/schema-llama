import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Block } from './scene/Block'
import { Journey } from './scene/Journey'
import { journeyLayout } from './scene/journeyLayout'
import { BlockRig, Rig, Ticker } from './scene/Rig'
import { blockGeom } from './scene/blockGeom'
import { BlockCalc, BlockSteps } from './ui/BlockCalc'
import { C } from './scene/colors'
import { loadTrace, type Trace } from './data/trace'
import { useStore } from './store'
import { Fps } from './ui/Fps'
import { LabelOverlay, LabelProjector } from './scene/labels'
import { Timeline } from './ui/Timeline'
import { BlockPanel, JourneyPanel } from './ui/Panels'

const TRACE_ID = new URLSearchParams(location.search).get('trace') ?? 'dev-1b-satellite'

export default function App() {
  const [trace, setTrace] = useState<Trace | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const view = useStore((s) => s.view)
  const lang = useStore((s) => s.lang)
  useEffect(() => { loadTrace(TRACE_ID).then(setTrace).catch((e) => setErr(String(e))) }, [])
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  const lay = useMemo(() => (trace ? journeyLayout(trace) : null), [trace])
  const geo = useMemo(() => (trace ? blockGeom(trace) : null), [trace])

  if (err) return <div className="center">{err}</div>
  if (!trace || !lay || !geo) return <div className="center">…</div>
  return (
    <div className="app">
      <div className="stage">
        <Canvas camera={{ position: [20, 14, 40], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <color attach="background" args={[C.bg]} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 10, 8]} intensity={1.2} />
          <OrbitControls enableDamping makeDefault />
          {view === 'journey' ? (
            <group key="journey">
              <Journey trace={trace} lay={lay} />
              <Ticker lay={lay} />
              <Rig lay={lay} />
            </group>
          ) : (
            <group key="block">
              <Block trace={trace} />
              <BlockRig geo={geo} />
            </group>
          )}
          <LabelProjector />
        </Canvas>
        <LabelOverlay />
        <HoverBox />
        <Fps />
        {view === 'journey' ? <Timeline lay={lay} /> : <><BlockCalc trace={trace} /><BlockSteps /></>}
      </div>
      {view === 'journey' ? <JourneyPanel trace={trace} lay={lay} /> : <BlockPanel trace={trace} />}
    </div>
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
