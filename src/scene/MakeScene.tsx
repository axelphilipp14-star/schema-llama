// M4 — Fabriquer : données → tokenizer → pré-entraînement → fine-tuning.
// Chiffres officiels (content/fabriquer.json, sourcés) et valeurs tirées des traces (public/traces/index.json).
import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { Color, PerspectiveCamera, Vector3 } from 'three'
import { useEffect, useRef } from 'react'
import facts from '../../content/fabriquer.json'
import { showTok } from '../data/trace'
import { useStore } from '../store'
import { useT } from '../i18n'
import { C } from './colors'
import { Cells } from './Cells'
import { Label } from './labels'
import { fitBox } from './fit'

export type TraceSummary = {
  id: string; prompt: string; model: string; n_layers: number
  tokens: { id: number; t: string }[]; top5: { id: number; t: string; p: number }[]
  config: { vocab: number; n_layers: number; d_model: number }
}
export const MAKE_STEPS = ['data', 'tokenizer', 'pretraining', 'finetuning'] as const
export const SX = { data: 0, tokenizer: 7, pretraining: 14.5, finetuning: 22 }
const VGRID = 36 // vocabulaire en 36 × 36 cubes
const GPU_PER_CUBE = 1000

/** Cadrage de chaque station (et de la vue d'ensemble, index −1). */
export function makeFrame(i: number): { min: [number, number, number]; max: [number, number, number]; dir: [number, number, number] } {
  if (i < 0) return { min: [-2.5, -0.8, -1.6], max: [25.5, 5.2, 1.6], dir: [-0.15, 0.45, 1] }
  const x = SX[MAKE_STEPS[i]]
  return { min: [x - 3.2, -0.6, -2.6], max: [x + 3.2, 5.6, 2.6], dir: [-0.25, 0.45, 1] }
}

export function MakeRig() {
  const { camera, size, controls } = useThree()
  const step = useStore((s) => s.makeStep)
  const des = useRef<{ position: Vector3; target: Vector3 } | null>(null)
  const active = useRef(true)
  const c = controls as unknown as { target: Vector3; update: () => void; addEventListener: (e: string, f: () => void) => void; removeEventListener: (e: string, f: () => void) => void } | null
  useEffect(() => {
    const f = makeFrame(step)
    des.current = fitBox(camera as PerspectiveCamera, size.width / size.height, new Vector3(...f.min), new Vector3(...f.max), new Vector3(...f.dir), 0.9, { x0: -0.95, x1: 0.95, y0: -0.75, y1: 0.95 })
    active.current = true
  }, [step, size.width, size.height])
  useEffect(() => {
    if (!c) return
    const on = () => { active.current = false }
    c.addEventListener('start', on)
    return () => c.removeEventListener('start', on)
  }, [c])
  useFrame((_, dt) => {
    if (!c || !des.current || !active.current) return
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 3)
    camera.position.lerp(des.current.position, k)
    c.target.lerp(des.current.target, k)
    c.update()
    if (camera.position.distanceTo(des.current.position) < 0.005) active.current = false
  })
  return null
}

export function MakeScene({ traces, sentence }: { traces: TraceSummary[]; sentence: string }) {
  const { t, num, pct } = useT()
  const step = useStore((s) => s.makeStep)
  const setStep = useStore((s) => s.setMakeStep)
  const setHover = useStore((s) => s.setHover)
  const inst = traces.find((x) => x.id === `3b-instruct-${sentence}`)
  const base = traces.find((x) => x.id === `3b-base-${sentence}`)
  const cfg = inst?.config ?? { vocab: 128256, n_layers: 28, d_model: 3072 }
  const on = (i: number) => step === i || step < 0
  const op = (i: number) => (on(i) ? 1 : 0.35)

  // 1. Données : entonnoir en 4 étages (schéma, pas à l'échelle — l'enquête 15 décrit les étages, pas leurs volumes pour Llama).
  const funnel = [3.2, 2.5, 1.8, 1.1]

  // 2. Vocabulaire : 128 256 tokens rangés par numéro dans une grille de 36 × 36 cubes ; les tokens de la phrase s'allument.
  const vocab = useMemo(() => {
    const per = Math.ceil(cfg.vocab / (VGRID * VGRID))
    const hit = new Map<number, string>()
    inst?.tokens.forEach((tk) => hit.set(Math.floor(tk.id / per), showTok(tk.t)))
    const pos: [number, number, number][] = []
    const scales: [number, number, number][] = []
    const colors: Color[] = []
    const meta: string[] = []
    const s = 0.12
    for (let i = 0; i < VGRID * VGRID; i++) {
      const r = Math.floor(i / VGRID), c = i % VGRID
      pos.push([SX.tokenizer - (VGRID * s) / 2 + c * s, 0.4 + (VGRID - 1 - r) * s, 0])
      colors.push(new Color(hit.has(i) ? C.emb : '#4a5570'))
      scales.push(hit.has(i) ? [1.9, 1.9, 1.9] : [1, 1, 1])
      meta.push(hit.has(i) ? `« ${hit.get(i)} » · ${t.make.cube(i * per, (i + 1) * per - 1)}` : t.make.cube(i * per, (i + 1) * per - 1))
    }
    return { pos, scales, colors, meta, per }
  }, [inst, t])

  // 3. Pré-entraînement : 1 cube = 1 000 heures de GPU H100 (460 000 pour le 3B, fiche Meta).
  const gpus = useMemo(() => {
    const n = Math.round(facts.pretraining.gpu_hours_3b / GPU_PER_CUBE)
    const cols = 23
    const pos: [number, number, number][] = []
    for (let i = 0; i < n; i++) {
      const c = i % cols, r = Math.floor(i / cols) % 10, d = Math.floor(i / (cols * 10))
      pos.push([SX.pretraining - 1.6 + c * 0.14, 0.15 + r * 0.14, 0.9 - d * 0.14])
    }
    return { pos, colors: pos.map(() => new Color(C.make)), n }
  }, [])

  // 4. Fine-tuning : probabilité du top-1 de l'Instruct, dans le modèle de base et dans l'Instruct (vraies traces).
  const ft = useMemo(() => {
    if (!inst || !base) return null
    const target = inst.top5[0]
    const pBase = base.top5.find((x) => x.id === target.id)?.p ?? null
    return { target, pInst: target.p, pBase }
  }, [inst, base])

  const H = 4 // hauteur d'une barre à 100 %

  return (
    <group>
      {/* Le tapis : la fabrication va de gauche à droite */}
      <Line points={[[-3.5, 0, 0], [SX.finetuning + 3, 0, 0]]} color={C.make} lineWidth={1.5} transparent opacity={0.4} />
      {MAKE_STEPS.map((k, i) => (
        <group key={k} onClick={(e) => { e.stopPropagation(); setStep(i) }}>
          <Label p={[SX[k], -0.75, 2]} color={on(i) ? C.make : C.muted} priority={8}>{`${i + 1}. ${t.make.step[k]}`}</Label>
        </group>
      ))}

      {/* 1. Données */}
      {funnel.map((w, i) => (
        <mesh key={i} position={[SX.data, 0.5 + i * 1.05, 0]} onPointerOver={() => setHover({ label: t.make.funnelStage[i], value: t.make.notToScale })} onPointerOut={() => setHover(null)}>
          <boxGeometry args={[w, 0.16, w * 0.8]} />
          <meshStandardMaterial color={C.make} transparent opacity={(0.25 + i * 0.15) * op(0)} />
        </mesh>
      ))}
      {funnel.map((w, i) => <Label key={i} p={[SX.data + w / 2 + 0.2, 0.5 + i * 1.05, 0]} color={C.muted} small align="left" priority={on(0) ? 4 : 0}>{t.make.funnelStage[i]}</Label>)}
      <Label p={[SX.data, 4.9, 0]} color={on(0) ? C.text : C.muted} priority={6}>{t.make.dataTokens(num(facts.donnees.tokens_max / 1e12, 0))}</Label>

      {/* 2. Tokenizer */}
      <Cells pos={vocab.pos} scales={vocab.scales} colors={vocab.colors} size={[0.1, 0.1, 0.1]} opacity={op(1)} info={(i) => ({ label: vocab.meta[i], value: t.make.vocabSize(num(cfg.vocab, 0)) })} />
      <Label p={[SX.tokenizer, 0.4 + VGRID * 0.12 + 0.3, 0]} color={on(1) ? C.text : C.muted} priority={6}>{t.make.vocabTitle(num(cfg.vocab, 0), vocab.per)}</Label>

      {/* 3. Pré-entraînement */}
      <Cells pos={gpus.pos} colors={gpus.colors} size={[0.11, 0.11, 0.11]} opacity={op(2)} info={() => ({ label: t.make.gpuCube(num(GPU_PER_CUBE, 0)), value: t.make.gpuTotal(num(facts.pretraining.gpu_hours_3b, 0)) })} />
      {Array.from({ length: cfg.n_layers }, (_, l) => (
        <mesh key={l} position={[SX.pretraining + 2.3, 0.2 + l * 0.15, 0]}>
          <boxGeometry args={[0.9, 0.1, 0.9]} />
          <meshStandardMaterial color={l % 2 ? C.attn : C.mlp} transparent opacity={0.55 * op(2)} />
        </mesh>
      ))}
      <Label p={[SX.pretraining + 2.3, 0.2 + cfg.n_layers * 0.15 + 0.3, 0]} color={C.muted} small>{t.make.layers(cfg.n_layers)}</Label>
      <Label p={[SX.pretraining - 0.1, 1.9, 0.9]} color={on(2) ? C.text : C.muted} priority={6}>{t.make.gpuTitle(num(gpus.n, 0))}</Label>

      {/* 4. Fine-tuning */}
      {ft && (
        <>
          {([[t.make.base, ft.pBase, '#7d6a3a'], [t.make.instruct, ft.pInst, C.make]] as const).map(([lbl, p, col], i) => (
            <group key={i}>
              <mesh position={[SX.finetuning - 0.8 + i * 1.6, ((p ?? 0) * H) / 2, 0]} onPointerOver={() => setHover({ label: `${lbl} · « ${showTok(ft.target.t)} »`, value: p == null ? t.make.notInTop5 : pct(p, 1) })} onPointerOut={() => setHover(null)}>
                <boxGeometry args={[1, Math.max(0.02, (p ?? 0) * H), 1]} />
                <meshStandardMaterial color={col} transparent opacity={op(3)} />
              </mesh>
              <Label p={[SX.finetuning - 0.8 + i * 1.6, (p ?? 0) * H + 0.35, 0]} color={on(3) ? C.text : C.muted} priority={7}>{p == null ? '—' : pct(p, 1)}</Label>
              <Label p={[SX.finetuning - 0.8 + i * 1.6, -0.3, 0.7]} color={C.muted} small priority={5}>{lbl}</Label>
            </group>
          ))}
          <Label p={[SX.finetuning, H + 0.9, 0]} color={on(3) ? C.text : C.muted} priority={6}>{t.make.ftTitle(showTok(ft.target.t))}</Label>
        </>
      )}
    </group>
  )
}
