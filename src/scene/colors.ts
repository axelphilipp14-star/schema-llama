import { Color } from 'three'

// Voir DESIGN.md — une couleur = une famille d'opération.
export const C = {
  bg: '#0b0d12',
  surface: '#141821',
  grid: '#2a3040',
  text: '#e6e8ee',
  muted: '#8a93a6',
  emb: '#4fb3ff',
  attn: '#ff8a3d',
  mlp: '#b07cff',
  norm: '#7d8597',
  resid: '#e6e8ee',
  out: '#3ddc97',
  make: '#f2c14e',
  neg: '#4f8dff',
  pos: '#ff5a4f',
}

const lo = new Color('#161b26')
const tmp = new Color()

/** Échelle séquentielle (0 → 1) vers une couleur de famille. Racine carrée pour voir les petites valeurs (signalé dans la légende). */
export function seq(v: number, hex: string, out = new Color()): Color {
  const t = Math.sqrt(Math.max(0, Math.min(1, v)))
  return out.copy(lo).lerp(tmp.set(hex), t)
}

/** Échelle divergente centrée sur 0 : négatif bleu, positif rouge. */
export function div(v: number, maxAbs: number, out = new Color()): Color {
  const t = Math.max(-1, Math.min(1, v / (maxAbs || 1)))
  return out.copy(lo).lerp(tmp.set(t < 0 ? C.neg : C.pos), Math.sqrt(Math.abs(t)))
}
