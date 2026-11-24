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

/**
 * Température appliquée à la sortie d'une trace (sans modèle).
 * La trace garde les 50 plus gros logits et les vraies probabilités du top-10 (calculées sur 128 256 tokens).
 * - T = 1 : exact. La constante de normalisation se déduit du top-1 : log Z = logit₁ − ln p₁.
 * - T ≈ 0 : choix glouton (100 % au top-1), exact.
 * - autre T : approximation renormalisée sur les 50 meilleurs tokens (la queue du vocabulaire est inconnue).
 */
export function traceTemperature(top50: { id: number; t: string; logit: number }[], top1p: number, T: number) {
  let all: { id: number; t: string; logit: number; p: number }[]
  let exact = true
  if (T < 0.01) all = top50.map((x, i) => ({ ...x, p: i === 0 ? 1 : 0 }))
  else if (Math.abs(T - 1) < 1e-9) {
    const logZ = top50[0].logit - Math.log(top1p)
    all = top50.map((x) => ({ ...x, p: Math.exp(x.logit - logZ) }))
  } else {
    const m = top50[0].logit
    const e = top50.map((x) => Math.exp((x.logit - m) / T))
    const z = e.reduce((a, b) => a + b, 0)
    all = top50.map((x, i) => ({ ...x, p: e[i] / z }))
    exact = false
  }
  return { top10: all.slice(0, 10), all, exact }
}

/** Nombre de paramètres d'un Llama, recalculé depuis sa config (table d'embedding partagée si tie_embeddings). */
export function llamaParams(c: { n_layers: number; d_model: number; n_heads: number; n_kv_heads: number; head_dim: number; d_mlp: number; vocab: number; tie_embeddings: boolean }) {
  const emb = c.vocab * c.d_model
  const attn = c.d_model * c.n_heads * c.head_dim * 2 + c.d_model * c.n_kv_heads * c.head_dim * 2 // Q, O + K, V
  const mlp = 3 * c.d_model * c.d_mlp // gate, up, down
  const norms = 2 * c.d_model
  const perLayer = attn + mlp + norms
  const total = emb * (c.tie_embeddings ? 1 : 2) + c.n_layers * perLayer + c.d_model
  return { emb, perLayer, attn, mlp, total }
}
