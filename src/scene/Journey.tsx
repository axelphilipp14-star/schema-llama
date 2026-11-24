// M1 — Le trajet d'un token : tokens → table d'embedding → vecteurs → L blocs → RMSNorm → tête de sortie → probabilités.
// Toutes les valeurs viennent de la trace ; les positions viennent de journeyLayout (aucune dimension en dur).
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line, QuadraticBezierLine } from '@react-three/drei'
import { Color, Group, Mesh, MeshStandardMaterial } from 'three'
import type { Trace } from '../data/trace'
import { showTok } from '../data/trace'
import { anim, useStore } from '../store'
import { useT } from '../i18n'
import { C, div } from './colors'
import { Cells } from './Cells'
import { Label } from './labels'
import { BLOCK_W, LANE, TABLE_H, pulseX, stepAt, type JourneyLayout } from './journeyLayout'

/** Poids d'attention moyen (sur les têtes) du dernier token vers chaque token, pour un bloc. */
export function meanAttnLast(trace: Trace, layer: number) {
  const A = trace.layers[layer].attn
  const n = trace.tokens.length
  const w = new Array(n).fill(0)
  for (const h of A) for (let k = 0; k < n; k++) w[k] += h[n - 1][k] / A.length
  return w
}

export function Journey({ trace, lay }: { trace: Trace; lay: JourneyLayout }) {
  const { t, num, pct } = useT()
  const progress = useStore((s) => s.progress)
  const openBlock = useStore((s) => s.openBlock)
  const setHover = useStore((s) => s.setHover)
  const cfg = trace.config
  const { n, L, laneZ } = lay
  const toks = trace.tokens.map((x) => showTok(x.t))
  const step = stepAt(lay, progress)
  const activeLayer = step.kind === 'block' ? step.layer! : -1
  const V = cfg.vocab
  const zSpan = LANE * n + 0.3
  const rowY = (id: number) => 0.15 + (id / V) * (TABLE_H - 0.3)

  // Lignes de la table d'embedding choisies par les tokens (vraie position : id / vocabulaire).
  const rows = useMemo(() => ({
    pos: trace.tokens.map((tk, i) => [lay.xTable + 0.02, rowY(tk.id), laneZ(i)] as [number, number, number]),
    colors: trace.tokens.map(() => new Color(C.emb)),
  }), [trace])

  // 16 premières valeurs réelles du vecteur d'embedding de chaque token.
  const vec = useMemo(() => {
    const m = Math.max(...trace.embeddings.first16.flat().map(Math.abs))
    const pos: [number, number, number][] = []
    const colors: Color[] = []
    const meta: { i: number; j: number; v: number }[] = []
    const w = (lay.xVec1 - lay.xVec0) / 16
    trace.embeddings.first16.forEach((row, i) => row.forEach((v, j) => {
      pos.push([lay.xVec0 + (j + 0.5) * w, 0, laneZ(i)])
      colors.push(div(v, m))
      meta.push({ i, j, v })
    }))
    return { pos, colors, meta, w }
  }, [trace])

  // Logit lens : top-1 du dernier token à la sortie de chaque bloc.
  const lens = useMemo(() => ({
    pos: trace.layers.map((l, k) => [lay.xBlock(k), 0.75 + (l.lens[0].p * 1.6) / 2, laneZ(n - 1)] as [number, number, number]),
    scales: trace.layers.map((l) => [1, Math.max(0.02, l.lens[0].p * 1.6), 1] as [number, number, number]),
    colors: trace.layers.map((l) => new Color(l.lens[0].id === trace.output.greedy_id ? C.out : C.muted)),
  }), [trace])

  const top10 = trace.output.top10
  const barY = (i: number) => TABLE_H - 0.1 - i * 0.46
  const probs = useMemo(() => ({
    pos: top10.map((x, i) => [lay.xProbs + ((x.p / top10[0].p) * 3.4) / 2, barY(i), laneZ(n - 1)] as [number, number, number]),
    scales: top10.map((x) => [Math.max(0.02, (x.p / top10[0].p) * 3.4), 1, 1] as [number, number, number]),
    colors: top10.map((_, i) => new Color(i === 0 ? C.out : '#2f6f57')),
  }), [trace])

  const attnW = activeLayer >= 0 ? meanAttnLast(trace, activeLayer) : null
  // ⟨début⟩ (k = 0) sert de « puits » : on le dessine à part, et on met les autres arcs à l'échelle entre eux.
  const attnMax = attnW && n > 2 ? Math.max(...attnW.slice(1, n - 1)) : 1
  const xLaneEnd = lay.xNorm

  return (
    <group>
      {/* Flux résiduel : un couloir par token ; seul le dernier continue vers la sortie */}
      {trace.tokens.map((_, i) => (
        <Line key={i} points={[[lay.xVec1, 0, laneZ(i)], [i === n - 1 ? lay.xHead : xLaneEnd, 0, laneZ(i)]]}
          color={i === n - 1 ? C.emb : C.resid} lineWidth={i === n - 1 ? 1.6 : 1} transparent opacity={i === n - 1 ? 0.75 : 0.28} />
      ))}
      {toks.map((tk, i) => (
        <Label key={i} p={[lay.xTok + 0.6, 0, laneZ(i)]} color={i === n - 1 ? C.text : C.emb} small align="right" priority={i === n - 1 ? 5 : 1}>{tk}</Label>
      ))}

      {/* Table d'embedding */}
      <mesh position={[lay.xTable, TABLE_H / 2, 0]}>
        <boxGeometry args={[0.3, TABLE_H, zSpan]} />
        <meshStandardMaterial color={C.emb} transparent opacity={0.12} />
      </mesh>
      <Cells pos={rows.pos} colors={rows.colors} size={[0.36, 0.06, LANE * 0.8]}
        info={(i) => ({ label: t.rowHover(toks[i], trace.tokens[i].id), value: t.rowHoverVal(num(trace.embeddings.norm[i], 3)) })} />
      {trace.tokens.map((tk, i) => (
        <Line key={i} points={[[lay.xTable + 0.18, rowY(tk.id), laneZ(i)], [lay.xVec0 - 0.1, 0, laneZ(i)]]} color={C.emb} lineWidth={1} transparent opacity={0.45} />
      ))}
      <Label p={[lay.xTable - 0.2, TABLE_H + 0.35, 0]} color={C.emb} small align="left">{t.embTable(num(V, 0), num(cfg.d_model, 0))}</Label>
      <Cells pos={vec.pos} colors={vec.colors} size={[vec.w * 0.9, 0.16, LANE * 0.6]}
        info={(i) => { const m = vec.meta[i]; return { label: t.dimHover(toks[m.i], m.j + 1, cfg.d_model), value: num(m.v, 4) } }} />

      {/* Les blocs */}
      {trace.layers.map((_, k) => (
        <BlockBox key={k} x={lay.xBlock(k)} zSpan={zSpan} k={k} active={k === activeLayer} passed={activeLayer > k || progress >= lay.steps.length - 4}
          onHover={(on) => setHover(on ? { label: t.blockHover(k + 1), value: t.blockHoverVal } : null)} onClick={() => openBlock(k)} />
      ))}
      {trace.layers.map((_, k) => (
        (L <= 16 || k % 3 === 0 || k === L - 1 || k === activeLayer) &&
        <Label key={k} p={[lay.xBlock(k), -0.85, laneZ(n - 1) + 0.35]} color={k === activeLayer ? C.text : C.muted} small>{k + 1}</Label>
      ))}
      <Cells pos={lens.pos} scales={lens.scales} colors={lens.colors} size={[0.22, 1, 0.22]}
        info={(i) => ({ label: t.lensHover(i + 1), value: `${showTok(trace.layers[i].lens[0].t)} · ${pct(trace.layers[i].lens[0].p)}` })} />
      {activeLayer >= 0 && (
        <Label p={[lay.xBlock(activeLayer), 0.95 + trace.layers[activeLayer].lens[0].p * 1.6, laneZ(n - 1)]} color={C.out} priority={10}>
          {showTok(trace.layers[activeLayer].lens[0].t)} · {pct(trace.layers[activeLayer].lens[0].p)}
        </Label>
      )}

      {/* Attention du dernier token dans le bloc actif (moyenne des têtes, vraie trace) */}
      {attnW && attnW.slice(0, n - 1).map((w, k) => {
        const sink = k === 0
        const r = sink ? 1 : w / attnMax
        return (
          <QuadraticBezierLine key={`${activeLayer}-${k}`}
            start={[lay.xBlock(activeLayer) - BLOCK_W / 4, 0.05, laneZ(n - 1)]}
            end={[lay.xBlock(activeLayer) - BLOCK_W / 4, 0.05, laneZ(k)]}
            mid={[lay.xBlock(activeLayer) - BLOCK_W / 4, 1.0 + 0.3 * (n - 1 - k), (laneZ(n - 1) + laneZ(k)) / 2]}
            color={sink ? C.muted : C.attn} lineWidth={sink ? 1.2 : 1 + 4 * r} dashed={sink} dashSize={0.12} gapSize={0.1}
            transparent opacity={sink ? 0.6 : 0.12 + 0.88 * r} />
        )
      })}

      {activeLayer >= 0 && toks.map((tk, i) => (
        <Label key={`al-${i}`} p={[lay.xBlock(activeLayer) - BLOCK_W / 2 - 0.08, 0.05, laneZ(i)]} color={i === n - 1 ? C.text : C.muted} small align="right">{tk}</Label>
      ))}

      {/* RMSNorm finale */}
      <mesh position={[lay.xNorm, 0.4, 0]}>
        <boxGeometry args={[0.16, 0.9, zSpan]} />
        <meshStandardMaterial color={C.norm} transparent opacity={0.5} />
      </mesh>
      <Label p={[lay.xNorm, 1.15, 0]} color={C.norm} small>{t.finalNorm}</Label>

      {/* Tête de sortie (même table que l'entrée) */}
      <mesh position={[lay.xHead, TABLE_H / 2, laneZ(n - 1)]}>
        <boxGeometry args={[0.3, TABLE_H, LANE * 1.2]} />
        <meshStandardMaterial color={C.out} transparent opacity={0.14} />
      </mesh>
      {[0.1, 0.3, 0.5, 0.7, 0.9].map((f) => (
        <Line key={f} points={[[lay.xNorm + 0.3, 0, laneZ(n - 1)], [lay.xHead - 0.16, f * TABLE_H, laneZ(n - 1)]]} color={C.out} lineWidth={1} transparent opacity={0.18} />
      ))}
      <mesh position={[lay.xHead + 0.02, rowY(trace.output.greedy_id), laneZ(n - 1)]}>
        <boxGeometry args={[0.36, 0.07, LANE * 1.1]} />
        <meshStandardMaterial color={C.out} emissive={C.out} emissiveIntensity={0.6} />
      </mesh>
      <Line points={[[lay.xHead + 0.2, rowY(trace.output.greedy_id), laneZ(n - 1)], [lay.xProbs, barY(0), laneZ(n - 1)]]} color={C.out} lineWidth={1.5} transparent opacity={0.7} />
      <Label p={[lay.xHead, -0.55, laneZ(n - 1)]} color={C.out} small>{t.outTable}</Label>
      {cfg.tie_embeddings && (
        <>
          <QuadraticBezierLine start={[lay.xTable, TABLE_H + 0.05, 0]} end={[lay.xHead, TABLE_H + 0.05, laneZ(n - 1)]}
            mid={[(lay.xTable + lay.xHead) / 2, TABLE_H + 3.2, 0]} color={C.emb} lineWidth={1} dashed dashSize={0.3} gapSize={0.2} transparent opacity={0.5} />
          <Label p={[(lay.xTable + lay.xHead) / 2, TABLE_H + 1.75, 0]} color={C.muted} small>{t.sameTable}</Label>
        </>
      )}

      {/* Probabilités (top-10) */}
      <Cells pos={probs.pos} scales={probs.scales} colors={probs.colors} size={[1, 0.28, 0.28]}
        info={(i) => ({ label: showTok(top10[i].t), value: pct(top10[i].p, 2) })} />
      {top10.map((x, i) => (
        <Label key={i} p={[lay.xProbs + (x.p / top10[0].p) * 3.4 + 0.15, barY(i), laneZ(n - 1)]} color={i === 0 ? C.out : C.muted} small align="left" priority={i === 0 ? 8 : 2}>
          {showTok(x.t)} {pct(x.p)}
        </Label>
      ))}

      <Pulse lay={lay} />
    </group>
  )
}

function BlockBox({ x, zSpan, active, passed, onHover, onClick }: {
  x: number; zSpan: number; k: number; active: boolean; passed: boolean; onHover: (on: boolean) => void; onClick: () => void
}) {
  const glow = active ? 0.55 : passed ? 0.22 : 0.05
  const op = active ? 0.38 : passed ? 0.3 : 0.18
  return (
    <group position={[x, 0, 0]}
      onPointerOver={(e) => { e.stopPropagation(); onHover(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { onHover(false); document.body.style.cursor = '' }}
      onClick={(e) => { e.stopPropagation(); onClick() }}>
      <mesh position={[-BLOCK_W / 4, 0, 0]}>
        <boxGeometry args={[BLOCK_W / 2 - 0.04, 1.1, zSpan]} />
        <meshStandardMaterial color={C.attn} emissive={C.attn} emissiveIntensity={glow} transparent opacity={op} depthWrite={false} />
      </mesh>
      <mesh position={[BLOCK_W / 4, 0, 0]}>
        <boxGeometry args={[BLOCK_W / 2 - 0.04, 1.1, zSpan]} />
        <meshStandardMaterial color={C.mlp} emissive={C.mlp} emissiveIntensity={glow} transparent opacity={op} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** L'impulsion : une sphère par token qui avance avec la progression ; seule celle du dernier token va jusqu'à la sortie. */
function Pulse({ lay }: { lay: JourneyLayout }) {
  const g = useRef<Group>(null)
  useFrame(() => {
    const grp = g.current
    if (!grp) return
    const x = pulseX(lay, anim.progress)
    const s = stepAt(lay, anim.progress)
    grp.children.forEach((child, i) => {
      const m = child as Mesh
      const last = i === lay.n - 1
      const beforeTokens = s.kind === 'tokens'
      let px = x, py = 0
      if (!last && x > lay.xNorm - 0.2) { m.visible = false; return }
      if (last && s.kind === 'probs') {
        const f = Math.min(1, Math.max(0, anim.progress - Math.floor(anim.progress)))
        px = lay.xHead + 0.2 + (lay.xProbs - lay.xHead - 0.2) * f
        py = (TABLE_H - 0.2) * f
      }
      m.visible = !beforeTokens || x > lay.xTok - 0.5
      m.position.set(px, py, lay.laneZ(i))
      ;(m.material as MeshStandardMaterial).emissiveIntensity = last ? 2.2 : 1.2
    })
  })
  return (
    <group ref={g}>
      {Array.from({ length: lay.n }, (_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[i === lay.n - 1 ? 0.11 : 0.07, 16, 16]} />
          <meshStandardMaterial color={C.text} emissive={i === lay.n - 1 ? C.emb : C.text} emissiveIntensity={1.5} />
        </mesh>
      ))}
    </group>
  )
}
