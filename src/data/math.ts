// Les petits calculs refaits à l'écran (et vérifiés par tests/m2-math.test.ts contre la trace).
import type { NormDetail } from './trace'

export const silu = (g: number) => g / (1 + Math.exp(-g))

/** Softmax d'une ligne de scores (déjà divisés par √d). */
export function softmaxRow(s: number[]) {
  const m = Math.max(...s)
  const e = s.map((x) => Math.exp(x - m))
  const z = e.reduce((a, b) => a + b, 0)
  return e.map((x) => x / z)
}

/** e^(s − max), étape intermédiaire affichée. */
export const expShift = (s: number[]) => { const m = Math.max(...s); return s.map((x) => Math.exp(x - m)) }

/** Σ_k p_k · v_k sur les dimensions disponibles. */
export function mixV(p: number[], v: number[][]) {
  const out = new Array(v[0].length).fill(0)
  p.forEach((pk, k) => v[k].forEach((x, j) => { out[j] += pk * x }))
  return out
}

export const rmsApply = (d: NormDetail) => d.x8.map((x, j) => (x / d.rms) * d.w8[j])
