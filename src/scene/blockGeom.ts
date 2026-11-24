// Géométrie de la vue « dans un bloc » : partagée par la scène (Block.tsx) et la caméra (BlockRig).
import type { Trace } from '../data/trace'

export const X = { in: 0, norm1: 1.6, attnL: 2.8, attnR: 9.6, add1: 10.6, norm2: 11.8, mlpL: 13.2, mlpR: 17.4, add2: 18.6, out: 20 }
export const LANE = 0.62
export const ATTN_Y0 = 1.3
export const MLP_H8 = 3.4

export function blockGeom(trace: Trace) {
  const c = trace.config
  const n = trace.tokens.length
  const H = c.n_heads, G = c.n_kv_heads, perG = H / G
  const gap = 0.14
  const g = (X.attnR - X.attnL - gap * (G - 1)) / G
  const cell = g / n
  const head = (h: number) => {
    const col = Math.floor(h / perG), row = h % perG
    const x0 = X.attnL + col * (g + gap)
    const y0 = ATTN_Y0 + (perG - 1 - row) * (g + gap)
    return { x0, y0, x1: x0 + g, y1: y0 + g, col, row }
  }
  const laneZ = (i: number) => (i - (n - 1) / 2) * LANE
  const attnTop = ATTN_Y0 + perG * (g + gap)
  const mlpH3 = MLP_H8 * (c.d_model / c.d_mlp)
  return { n, H, G, perG, gap, g, cell, head, laneZ, attnTop, mlpH3, zMin: laneZ(0) - 0.3, zMax: laneZ(n - 1) + 0.3 }
}
export type BlockGeom = ReturnType<typeof blockGeom>

export const BLOCK_STEPS = ['norm1', 'qkv', 'scores', 'softmax', 'mix', 'heads', 'add1', 'mlp', 'add2'] as const
export type BlockStep = (typeof BLOCK_STEPS)[number]

/** Boîte à cadrer (min, max) et direction de vue pour chaque étape. */
export function stepFrame(geo: BlockGeom, step: BlockStep, h: number): { min: [number, number, number]; max: [number, number, number]; dir: [number, number, number] } {
  const hd = geo.head(h)
  switch (step) {
    case 'norm1': return { min: [X.in - 1.8, -0.7, geo.zMin], max: [X.norm1 + 1.4, 1.8, geo.zMax], dir: [-0.35, 0.7, 1] }
    case 'qkv': case 'scores': case 'softmax': case 'mix':
      return { min: [hd.x0 - 0.35, hd.y0 - 0.35, -0.1], max: [hd.x1 + 0.35, hd.y1 + 0.35, 0.1], dir: [0, 0.12, 1] }
    case 'heads': return { min: [X.attnL - 0.3, ATTN_Y0 - 0.5, -0.1], max: [X.attnR + 0.3, geo.attnTop + 0.6, 0.1], dir: [0, 0.2, 1] }
    case 'add1': return { min: [X.add1 - 1.6, -0.7, geo.zMin], max: [X.add1 + 1.3, 1.9, geo.zMax], dir: [-0.3, 0.75, 1] }
    case 'mlp': return { min: [X.norm2 - 0.5, ATTN_Y0 - 0.6, -0.3], max: [X.mlpR + 0.4, ATTN_Y0 + MLP_H8 + 0.6, 0.3], dir: [0, 0.15, 1] }
    case 'add2': return { min: [X.add2 - 1.0, -0.7, geo.zMin], max: [X.out + 1.2, 1.8, geo.zMax], dir: [0.3, 0.75, 1] }
  }
}
