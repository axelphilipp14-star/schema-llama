import { useMemo } from 'react'
import { Cells } from './Cells'
import { Line } from '@react-three/drei'
import { Label } from './labels'
import { Color } from 'three'
import type { Trace } from '../data/trace'
import { showTok } from '../data/trace'
import { C, div, seq } from './colors'
import { useStore } from '../store'

// Disposition (unités de scène). Le flux va de gauche à droite (axe x), un couloir par token (axe z).
export const X = { in: 0, norm1: 1.6, attnL: 2.8, attnR: 9.6, add1: 10.6, norm2: 11.8, mlpL: 13.2, mlpR: 17.4, add2: 18.6, out: 20 }
const LANE = 0.62

const fmt = (v: number, d = 3) => v.toLocaleString('fr-FR', { maximumFractionDigits: d })

export function Block({ trace }: { trace: Trace }) {
  const layer = useStore((s) => s.layer)
  const L = trace.layers[layer]
  const cfg = trace.config
  const n = trace.tokens.length
  const laneZ = (i: number) => (i - (n - 1) / 2) * LANE
  const toks = trace.tokens.map((t) => showTok(t.t))

  // Échelle log des normes du flux résiduel (le token de début a des normes très grandes : « attention sink »).
  const maxNorm = Math.max(...trace.layers.flatMap((l) => l.resid_out_norm), ...trace.layers.flatMap((l) => l.resid_in_norm))
  const h = (v: number) => 0.12 + 0.9 * (Math.log1p(v) / Math.log1p(maxNorm))

  // Barres du flux résiduel : norme à l'entrée et à la sortie du bloc (vraies valeurs de la trace).
  const bars = useMemo(() => {
    const pos: [number, number, number][] = []
    const scales: [number, number, number][] = []
    const colors: Color[] = []
    const meta: { label: string; value: string }[] = []
    for (const [x, norms, name] of [[X.in, L.resid_in_norm, 'entrée du bloc'], [X.out, L.resid_out_norm, 'sortie du bloc']] as const) {
      norms.forEach((v, i) => {
        const hh = h(v)
        pos.push([x, hh / 2, laneZ(i)])
        scales.push([1, hh, 1])
        colors.push(new Color(x === X.in ? C.emb : C.resid))
        meta.push({ label: `${name} · token « ${toks[i]} »`, value: `‖x‖ = ${fmt(v, 2)}` })
      })
    }
    return { pos, scales, colors, meta }
  }, [L, n])

  // Attention : 24 têtes rangées en 8 colonnes (une par paire K/V partagée, GQA) × 3 lignes.
  const attn = useMemo(() => {
    const H = cfg.n_heads
    const G = cfg.n_kv_heads
    const perG = H / G
    const width = X.attnR - X.attnL
    const gap = 0.14
    const g = (width - gap * (G - 1)) / G
    const cell = g / n
    const pos: [number, number, number][] = []
    const colors: Color[] = []
    const meta: { h: number; q: number; k: number; p: number }[] = []
    for (let hd = 0; hd < H; hd++) {
      const col = Math.floor(hd / perG)
      const row = hd % perG
      const x0 = X.attnL + col * (g + gap)
      const y0 = 1.3 + (perG - 1 - row) * (g + gap)
      for (let q = 0; q < n; q++) {
        for (let k = 0; k < n; k++) {
          const p = L.attn[hd][q][k]
          pos.push([x0 + (k + 0.5) * cell, y0 + (n - 1 - q + 0.5) * cell, 0])
          colors.push(k > q ? new Color(C.surface) : seq(p, C.attn))
          meta.push({ h: hd, q, k, p })
        }
      }
    }
    return { pos, colors, meta, cell, g, gap, perG, G, top: 1.3 + perG * (g + gap) }
  }, [L, cfg, n])

  // MLP : 3 072 → 8 192 → 3 072. Colonne du milieu = les 8 192 neurones, 16 plus actifs (dernier token) en vrai.
  const mlp = useMemo(() => {
    const H8 = 3.4
    const H3 = H8 * (cfg.d_model / cfg.d_mlp)
    const y0 = 1.3
    const maxAct = Math.max(...L.mlp.top.map((t) => Math.abs(t.act)))
    const pos: [number, number, number][] = []
    const colors: Color[] = []
    L.mlp.top.forEach((t) => {
      pos.push([(X.mlpL + X.mlpR) / 2, y0 + (t.i / cfg.d_mlp) * H8, 0.06])
      colors.push(div(t.act, maxAct))
    })
    return { H8, H3, y0, pos, colors, maxAct }
  }, [L, cfg])

  const xm = (X.mlpL + X.mlpR) / 2
  const xEnd = X.out + 1

  return (
    <group>
      {/* Flux résiduel : un tube par token */}
      {trace.tokens.map((_, i) => (
        <Line key={i} points={[[X.in - 1, 0, laneZ(i)], [xEnd, 0, laneZ(i)]]} color={C.resid} lineWidth={1} transparent opacity={0.35} />
      ))}
      {toks.map((t, i) => (
        <Label key={i} p={[X.in - 1.6, 0, laneZ(i)]} color={C.emb} small>{t}</Label>
      ))}

      <Cells pos={bars.pos} scales={bars.scales} colors={bars.colors} size={[0.22, 1, 0.22]} info={(i) => bars.meta[i]} />

      {/* RMSNorm */}
      {[X.norm1, X.norm2].map((x, k) => (
        <group key={k}>
          <mesh position={[x, 0.55, 0]}>
            <boxGeometry args={[0.18, 1.1, LANE * n + 0.2]} />
            <meshStandardMaterial color={C.norm} transparent opacity={0.55} />
          </mesh>
          <Label p={[x, 1.55, 0]} color={C.norm} small>{k === 0 ? '① ' : '④ '}RMSNorm</Label>
        </group>
      ))}

      {/* Attention */}
      <Cells pos={attn.pos} colors={attn.colors} size={[attn.cell * 0.9, attn.cell * 0.9, 0.04]}
        info={(i) => {
          const m = attn.meta[i]
          return { label: `tête ${m.h + 1} (K/V partagé n° ${Math.floor(m.h / attn.perG) + 1}) · « ${toks[m.q]} » regarde « ${toks[m.k]} »`, value: m.k > m.q ? 'masqué (futur)' : `${fmt(m.p * 100, 2)} %` }
        }} />
      {Array.from({ length: attn.G }, (_, gI) => (
        <Label key={gI} p={[X.attnL + gI * (attn.g + attn.gap) + attn.g / 2, 1.1, 0]} color={C.muted} small>{gI + 1}</Label>
      ))}
      <Label p={[(X.attnL + X.attnR) / 2, attn.top + 0.35, 0]} color={C.attn}>
        ② Attention · {cfg.n_heads} têtes en {cfg.n_kv_heads} groupes (K/V partagés)
      </Label>
      <Line points={[[X.norm1, 0.2, 0], [X.attnL - 0.1, 1.3, 0]]} color={C.attn} lineWidth={1} transparent opacity={0.6} />
      <Line points={[[X.attnR + 0.1, 1.3, 0], [X.add1, 0.2, 0]]} color={C.attn} lineWidth={1} transparent opacity={0.6} />
      <Label p={[X.add1, 0.45, 0]} color={C.attn}>③ ＋</Label>

      {/* MLP */}
      <Line points={[[X.mlpL, mlp.y0 + (mlp.H8 - mlp.H3) / 2, 0], [xm - 0.15, mlp.y0, 0]]} color={C.mlp} lineWidth={1} />
      <Line points={[[X.mlpL, mlp.y0 + (mlp.H8 + mlp.H3) / 2, 0], [xm - 0.15, mlp.y0 + mlp.H8, 0]]} color={C.mlp} lineWidth={1} />
      <Line points={[[X.mlpR, mlp.y0 + (mlp.H8 - mlp.H3) / 2, 0], [xm + 0.15, mlp.y0, 0]]} color={C.mlp} lineWidth={1} />
      <Line points={[[X.mlpR, mlp.y0 + (mlp.H8 + mlp.H3) / 2, 0], [xm + 0.15, mlp.y0 + mlp.H8, 0]]} color={C.mlp} lineWidth={1} />
      {[X.mlpL, X.mlpR].map((x, k) => (
        <mesh key={k} position={[x, mlp.y0 + mlp.H8 / 2, 0]}>
          <boxGeometry args={[0.12, mlp.H3, 0.12]} />
          <meshStandardMaterial color={C.mlp} transparent opacity={0.5} />
        </mesh>
      ))}
      <mesh position={[xm, mlp.y0 + mlp.H8 / 2, 0]}>
        <boxGeometry args={[0.3, mlp.H8, 0.08]} />
        <meshStandardMaterial color={C.surface} />
      </mesh>
      <Cells pos={mlp.pos} colors={mlp.colors} size={[0.9, 0.035, 0.05]}
        info={(i) => {
          const t = L.mlp.top[i]
          return { label: `neurone ${t.i} sur ${cfg.d_mlp} · dernier token « ${toks[n - 1]} »`, value: `silu(gate ${fmt(t.gate)}) × up ${fmt(t.up)} = ${fmt(t.act)}` }
        }} />
      <Label p={[X.mlpL + 0.2, mlp.y0 + (mlp.H8 - mlp.H3) / 2 - 0.3, 0]} color={C.muted} small>{cfg.d_model.toLocaleString('fr-FR')}</Label>
      <Label p={[xm, mlp.y0 - 0.25, 0]} color={C.muted} small>{cfg.d_mlp.toLocaleString('fr-FR')}</Label>
      <Label p={[X.mlpR - 0.2, mlp.y0 + (mlp.H8 - mlp.H3) / 2 - 0.3, 0]} color={C.muted} small>{cfg.d_model.toLocaleString('fr-FR')}</Label>
      <Label p={[xm, mlp.y0 + mlp.H8 + 0.35, 0]} color={C.mlp}>⑤ MLP (SwiGLU) · 16 neurones les plus actifs</Label>
      <Line points={[[X.norm2, 0.2, 0], [X.mlpL, mlp.y0, 0]]} color={C.mlp} lineWidth={1} transparent opacity={0.6} />
      <Line points={[[X.mlpR, mlp.y0, 0], [X.add2, 0.2, 0]]} color={C.mlp} lineWidth={1} transparent opacity={0.6} />
      <Label p={[X.add2, 0.45, 0]} color={C.mlp}>⑥ ＋</Label>

      <Label p={[X.in, -0.55, laneZ(n - 1) + 0.4]} color={C.muted} small>entrée ‖x‖</Label>
      <Label p={[X.out, -0.55, laneZ(n - 1) + 0.4]} color={C.muted} small>sortie ‖x‖</Label>
    </group>
  )
}
