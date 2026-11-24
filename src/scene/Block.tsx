// M2 — Dans un bloc : RMSNorm → attention (toutes les têtes, GQA) → + → RMSNorm → MLP → +.
// La partie de l'étape en cours est mise en avant, le reste est atténué. Clic sur une grille = choisir la tête.
import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import { Color } from 'three'
import { Cells } from './Cells'
import { WeightSlab } from './WeightSlab'
import { Label } from './labels'
import type { Trace } from '../data/trace'
import { showTok } from '../data/trace'
import { C, div, seq } from './colors'
import { useStore } from '../store'
import { useT } from '../i18n'
import { ATTN_Y0, BLOCK_STEPS, LANE, MLP_H8, X, blockGeom, type BlockStep } from './blockGeom'

export { X }

const FOCUS: Record<BlockStep, Set<string>> = {
  norm1: new Set(['in', 'norm1']),
  qkv: new Set(['attn']), scores: new Set(['attn']), softmax: new Set(['attn']), mix: new Set(['attn']), heads: new Set(['attn']),
  add1: new Set(['attn', 'add1', 'mid']),
  mlp: new Set(['norm2', 'mlp', 'mid']),
  add2: new Set(['mlp', 'add2', 'out']),
}

export function Block({ trace }: { trace: Trace }) {
  const { t, num, pct } = useT()
  const layer = useStore((s) => s.layer)
  const head = useStore((s) => s.head)
  const setHead = useStore((s) => s.setHead)
  const step = BLOCK_STEPS[useStore((s) => s.blockStep)]
  const L = trace.layers[layer]
  const cfg = trace.config
  const geo = useMemo(() => blockGeom(trace), [trace])
  const { n, laneZ } = geo
  const toks = trace.tokens.map((x) => showTok(x.t))
  const on = (k: string) => FOCUS[step].has(k)
  const op = (k: string) => (on(k) ? 1 : 0.22)
  const headFocus = ['qkv', 'scores', 'softmax', 'mix'].includes(step)

  // Normes du flux résiduel (échelle log : le token ⟨début⟩ a des normes très grandes).
  const maxNorm = Math.max(...trace.layers.flatMap((l) => [...l.resid_out_norm, ...l.resid_in_norm]))
  const h = (v: number) => 0.12 + 0.9 * (Math.log1p(v) / Math.log1p(maxNorm))

  const bars = useMemo(() => {
    const mk = (x: number, norms: number[], name: string, color: string) => ({
      pos: norms.map((v, i) => [x, h(v) / 2, laneZ(i)] as [number, number, number]),
      scales: norms.map((v) => [1, h(v), 1] as [number, number, number]),
      colors: norms.map(() => new Color(color)),
      meta: norms.map((v, i) => ({ label: t.blk.hoverBar(name, toks[i]), value: `‖x‖ = ${num(v, 2)}` })),
    })
    return { in: mk(X.in, L.resid_in_norm, t.blk.barIn, C.emb), mid: mk(X.add1 + 0.45, L.mid_norm, t.blk.normMid, C.attn), out: mk(X.out, L.resid_out_norm, t.blk.barOut, C.resid) }
  }, [L, t])

  // Attention : toutes les têtes. En mode « une tête », les autres sont atténuées et la ligne du dernier token est soulignée.
  const attn = useMemo(() => {
    const pos: [number, number, number][] = []
    const colors: Color[] = []
    const meta: { h: number; q: number; k: number; p: number }[] = []
    for (let hd = 0; hd < geo.H; hd++) {
      const b = geo.head(hd)
      const dimHead = headFocus && hd !== head
      for (let q = 0; q < n; q++) for (let k = 0; k < n; k++) {
        const p = L.attn[hd][q][k]
        pos.push([b.x0 + (k + 0.5) * geo.cell, b.y0 + (n - 1 - q + 0.5) * geo.cell, 0])
        const c = k > q ? new Color(C.surface) : seq(p, C.attn)
        colors.push(dimHead ? c.lerp(new Color(C.bg), 0.75) : c)
        meta.push({ h: hd, q, k, p })
      }
    }
    return { pos, colors, meta }
  }, [L, geo, head, headFocus])

  const mlp = useMemo(() => {
    const maxAct = Math.max(...L.mlp.top.map((x) => Math.abs(x.act)))
    return {
      pos: L.mlp.top.map((x) => [(X.mlpL + X.mlpR) / 2, ATTN_Y0 + (x.i / cfg.d_mlp) * MLP_H8, 0.06] as [number, number, number]),
      colors: L.mlp.top.map((x) => div(x.act, maxAct)),
    }
  }, [L, cfg])

  const xm = (X.mlpL + X.mlpR) / 2
  const xEnd = X.out + 1
  const H3 = geo.mlpH3
  const sel = geo.head(head)
  const grp = Math.floor(head / geo.perG)
  const gFirst = geo.head(grp * geo.perG), gLast = geo.head(grp * geo.perG + geo.perG - 1)
  const rect = (x0: number, y0: number, x1: number, y1: number, z = 0.04): [number, number, number][] => [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [x0, y0, z]]
  const lastRowY = sel.y0 + 0.5 * geo.cell

  return (
    <group>
      {trace.tokens.map((_, i) => (
        <Line key={i} points={[[X.in - 1, 0, laneZ(i)], [xEnd, 0, laneZ(i)]]} color={C.resid} lineWidth={1} transparent opacity={0.3} />
      ))}
      {toks.map((tk, i) => (
        <Label key={i} p={[X.in - 0.5, 0, laneZ(i)]} color={i === n - 1 ? C.text : C.emb} small align="right" priority={i === n - 1 ? 5 : 1}>{tk}</Label>
      ))}

      <Cells pos={bars.in.pos} scales={bars.in.scales} colors={bars.in.colors} size={[0.22, 1, 0.22]} info={(i) => bars.in.meta[i]} opacity={op('in')} />
      <Cells pos={bars.mid.pos} scales={bars.mid.scales} colors={bars.mid.colors} size={[0.22, 1, 0.22]} info={(i) => bars.mid.meta[i]} opacity={op('mid')} />
      <Cells pos={bars.out.pos} scales={bars.out.scales} colors={bars.out.colors} size={[0.22, 1, 0.22]} info={(i) => bars.out.meta[i]} opacity={op('out')} />

      {([['norm1', X.norm1, '①'], ['norm2', X.norm2, '⑧']] as const).map(([k, x, mark]) => (
        <group key={k}>
          <WeightSlab position={[x, 0.55, 0]} size={[0.18, 1.1, LANE * n + 0.2]} color={C.norm} dim={!on(k)} />
          <Label p={[x, 1.55, 0]} color={on(k) ? C.text : C.muted} small priority={on(k) ? 6 : 1}>{mark} {t.blk.normLbl}</Label>
        </group>
      ))}

      {/* Attention */}
      <Cells pos={attn.pos} colors={attn.colors} size={[geo.cell * 0.9, geo.cell * 0.9, 0.04]} opacity={on('attn') ? 1 : 0.3}
        onClick={(i) => setHead(attn.meta[i].h)}
        info={(i) => {
          const m = attn.meta[i]
          return { label: t.blk.hoverAttn(m.h + 1, Math.floor(m.h / geo.perG) + 1, toks[m.q], toks[m.k]), value: m.k > m.q ? t.blk.masked : pct(m.p, 2) }
        }} />
      {on('attn') && (
        <>
          {/* Groupe K/V de la tête choisie (GQA, pointillés), la tête (cadre blanc), la ligne du dernier token (vert) */}
          <Line points={rect(gLast.x0 - 0.05, gLast.y0 - 0.05, gFirst.x1 + 0.05, gFirst.y1 + 0.05)} color={C.muted} lineWidth={1} dashed dashSize={0.06} gapSize={0.05} />
          <Line points={rect(sel.x0 - 0.02, sel.y0 - 0.02, sel.x1 + 0.02, sel.y1 + 0.02)} color={C.text} lineWidth={2} />
          {headFocus && <Line points={rect(sel.x0, lastRowY - geo.cell / 2, sel.x1, lastRowY + geo.cell / 2, 0.06)} color={C.out} lineWidth={2} />}
        </>
      )}
      {Array.from({ length: geo.G }, (_, g) => (
        <Label key={g} p={[X.attnL + g * (geo.g + geo.gap) + geo.g / 2, ATTN_Y0 - 0.2, 0]} color={g === grp && on('attn') ? C.text : C.muted} small>{g + 1}</Label>
      ))}
      {headFocus && toks.map((tk, q) => (
        <Label key={`qy-${q}`} p={[sel.x0 - 0.04, sel.y0 + (n - 1 - q + 0.5) * geo.cell, 0.05]} color={q === n - 1 ? C.out : C.muted} small align="right" priority={4}>{tk}</Label>
      ))}
      <Label p={[(X.attnL + X.attnR) / 2, geo.attnTop + 0.3, 0]} color={on('attn') ? C.attn : C.muted} priority={3}>{t.blk.attnTitle(geo.H, geo.G)}</Label>
      <Line points={[[X.norm1, 0.2, 0], [X.attnL - 0.1, ATTN_Y0, 0]]} color={C.attn} lineWidth={1} transparent opacity={0.6 * op('attn')} />
      <Line points={[[X.attnR + 0.1, ATTN_Y0, 0], [X.add1, 0.2, 0]]} color={C.attn} lineWidth={1} transparent opacity={0.6 * op('add1')} />
      <Label p={[X.add1, 0.45, 0]} color={on('add1') ? C.attn : C.muted} priority={6}>⑦ ＋</Label>

      {/* MLP */}
      {([[X.mlpL, xm - 0.15], [X.mlpR, xm + 0.15]] as const).map(([xa, xb], k) => (
        <group key={k}>
          <Line points={[[xa, ATTN_Y0 + (MLP_H8 - H3) / 2, 0], [xb, ATTN_Y0, 0]]} color={C.mlp} lineWidth={1} transparent opacity={op('mlp')} />
          <Line points={[[xa, ATTN_Y0 + (MLP_H8 + H3) / 2, 0], [xb, ATTN_Y0 + MLP_H8, 0]]} color={C.mlp} lineWidth={1} transparent opacity={op('mlp')} />
          <WeightSlab position={[xa, ATTN_Y0 + MLP_H8 / 2, 0]} size={[0.12, H3, 0.12]} color={C.mlp} dim={!on('mlp')} />
        </group>
      ))}
      <mesh position={[xm, ATTN_Y0 + MLP_H8 / 2, 0]}>
        <boxGeometry args={[0.3, MLP_H8, 0.08]} />
        <meshStandardMaterial color={C.surface} transparent opacity={op('mlp')} />
      </mesh>
      <Cells pos={mlp.pos} colors={mlp.colors} size={[0.9, 0.035, 0.05]} opacity={op('mlp')}
        info={(i) => {
          const x = L.mlp.top[i]
          return { label: t.blk.hoverNeuron(x.i, cfg.d_mlp, toks[n - 1]), value: `silu(${num(x.gate, 3)}) × ${num(x.up, 3)} = ${num(x.act, 3)}` }
        }} />
      <Label p={[X.mlpL + 0.2, ATTN_Y0 + (MLP_H8 - H3) / 2 - 0.3, 0]} color={C.muted} small>{num(cfg.d_model, 0)}</Label>
      <Label p={[xm, ATTN_Y0 - 0.25, 0]} color={C.muted} small>{num(cfg.d_mlp, 0)}</Label>
      <Label p={[X.mlpR - 0.2, ATTN_Y0 + (MLP_H8 - H3) / 2 - 0.3, 0]} color={C.muted} small>{num(cfg.d_model, 0)}</Label>
      <Label p={[xm, ATTN_Y0 + MLP_H8 + 0.35, 0]} color={on('mlp') ? C.mlp : C.muted} priority={3}>{t.blk.mlpTitle}</Label>
      <Line points={[[X.norm2, 0.2, 0], [X.mlpL, ATTN_Y0, 0]]} color={C.mlp} lineWidth={1} transparent opacity={0.6 * op('mlp')} />
      <Line points={[[X.mlpR, ATTN_Y0, 0], [X.add2, 0.2, 0]]} color={C.mlp} lineWidth={1} transparent opacity={0.6 * op('add2')} />
      <Label p={[X.add2, 0.45, 0]} color={on('add2') ? C.mlp : C.muted} priority={6}>⑨ ＋</Label>

      <Label p={[X.in, -0.55, laneZ(n - 1) + 0.4]} color={C.muted} small>{t.blk.inNorm}</Label>
      <Label p={[X.out, -0.55, laneZ(n - 1) + 0.4]} color={C.muted} small>{t.blk.outNorm}</Label>
    </group>
  )
}
