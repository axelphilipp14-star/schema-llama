// Format produit par scripts/trace_core.py (schema 1). Aucune dimension en dur : tout vient de `config`.

export interface TokP { id: number; t: string; p: number }

export interface NormDetail { x8: number[]; rms: number; w8: number[]; y8: number[] }

export interface TraceLayer {
  resid_in_norm: number[]
  mid_norm: number[]
  norm1: NormDetail
  norm2: NormDetail
  rms_in_last: number
  attn: number[][][] // [heads][n][n]
  attn_out_norm: number[]
  last: { q8: number[][]; k8: number[][][]; scores: number[][]; v8: number[][][]; ctx8: number[][] }
  mlp: { out_norm: number[]; top: { i: number; gate: number; up: number; act: number }[]; act_l2: number }
  resid_out_norm: number[]
  lens: TokP[]
}

export interface Trace {
  schema: 2
  meta: { model_id: string; dtype: string; device: string; date: string; torch: string; transformers: string; note: string }
  config: {
    n_layers: number; d_model: number; n_heads: number; n_kv_heads: number; head_dim: number
    d_mlp: number; vocab: number; max_ctx: number; rope_theta: number | null; rms_eps: number; tie_embeddings: boolean
  }
  prompt: string
  tokens: { id: number; t: string }[]
  embeddings: { norm: number[]; first16: number[][]; pca3: number[][] }
  layers: TraceLayer[]
  output: {
    final_norm_last: number
    top50_logits: { id: number; t: string; logit: number }[]
    top10: TokP[]
    entropy: number
    greedy_id: number
  }
  checks: { attn_row_sum_max_err: number; qk_recompute_max_err: number; greedy_matches_top1: boolean; dims_match_config: boolean }
}

export async function loadTrace(id: string): Promise<Trace> {
  const r = await fetch(`${import.meta.env.BASE_URL}traces/${id}.json`)
  if (!r.ok) throw new Error(`trace ${id} introuvable (${r.status})`)
  return r.json()
}

/** Affichage d'un token : rend visibles les espaces et le BOS. */
export const BOS_LABEL = { current: '⟨début⟩' }
export function showTok(t: string): string {
  if (t === '<|begin_of_text|>') return BOS_LABEL.current
  return t.replace(/ /g, '·').replace(/\n/g, '⏎')
}

/** Vrai si, à la sortie du bloc `l`, le top-1 du logit lens est le dernier token lu (le modèle « répète » ce qu'il vient de lire). */
export function lensEchoesInput(trace: Trace, l: number) {
  return trace.layers[l].lens[0].id === trace.tokens[trace.tokens.length - 1].id
}
