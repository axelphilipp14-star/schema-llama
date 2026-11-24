// M3 — Llama 3.2 en direct dans le navigateur (Transformers.js + WebGPU), dans un Web Worker pour ne pas figer la 3D.
// Messages reçus : tok-init, tokenize, load, run, dist, sample. Messages envoyés : voir LiveMsg dans useLive.ts.
import { AutoModelForCausalLM, AutoTokenizer, type PreTrainedTokenizer, type Tensor } from '@huggingface/transformers'

const TOKENIZER_ID = 'onnx-community/Llama-3.2-1B-Instruct-ONNX' // même tokenizer pour le 1B et le 3B

let tok: PreTrainedTokenizer | null = null
let tokLoading: Promise<PreTrainedTokenizer> | null = null
let model: ((x: unknown) => Promise<{ logits: Tensor }>) & { dispose?: () => Promise<void> } | null = null
let last: Float32Array | null = null // logits du dernier token, tout le vocabulaire
let busy = false
let pending: { text: string; T: number } | null = null

const post = (m: unknown) => (self as unknown as Worker).postMessage(m)

async function getTok() {
  if (tok) return tok
  tokLoading ??= AutoTokenizer.from_pretrained(TOKENIZER_ID).then((t) => (tok = t))
  return tokLoading
}

function tokens(text: string) {
  const t = tok!
  const ids = (t(text).input_ids as Tensor).tolist() as unknown as bigint[][]
  return ids[0].map((x) => { const id = Number(x); return { id, t: t.decode([id]) } })
}

/** Distribution du token suivant à la température T (T < 0,01 : choix glouton). Top-10 + entropie (bits). */
function dist(T: number) {
  const l = last!
  const V = l.length
  let m = -Infinity, arg = 0
  for (let i = 0; i < V; i++) if (l[i] > m) { m = l[i]; arg = i }
  const p = new Float32Array(V)
  if (T < 0.01) p[arg] = 1
  else {
    let z = 0
    for (let i = 0; i < V; i++) { p[i] = Math.exp((l[i] - m) / T); z += p[i] }
    for (let i = 0; i < V; i++) p[i] /= z
  }
  // top-10 sans trier 128 256 valeurs
  const top: number[] = []
  for (let i = 0; i < V; i++) {
    if (top.length < 10) { top.push(i); top.sort((a, b) => p[b] - p[a]) }
    else if (p[i] > p[top[9]]) { top[9] = i; top.sort((a, b) => p[b] - p[a]) }
  }
  let H = 0
  for (let i = 0; i < V; i++) if (p[i] > 0) H -= p[i] * Math.log2(p[i])
  return { p, top10: top.map((i) => ({ id: i, t: tok!.decode([i]), p: p[i], logit: l[i] })), entropy: H }
}

async function forward(text: string, T: number) {
  const t = await getTok()
  const inputs = t(text)
  const t0 = performance.now()
  const o = await model!(inputs)
  const [, n, V] = o.logits.dims as number[]
  last = Float32Array.from((o.logits.data as Float32Array).subarray((n - 1) * V, n * V))
  const d = dist(T)
  post({ type: 'result', text, tokens: tokens(text), forward_ms: Math.round(performance.now() - t0), top10: d.top10, entropy: d.entropy })
}

async function pump() {
  if (busy || !pending || !model) return
  busy = true
  const job = pending
  pending = null
  try { await forward(job.text, job.T) } catch (e) { post({ type: 'error', where: 'run', message: String((e as Error)?.message ?? e) }) }
  busy = false
  pump()
}

self.onmessage = async (ev: MessageEvent) => {
  const m = ev.data
  try {
    if (m.type === 'tok-init') { const t0 = performance.now(); await getTok(); post({ type: 'tok-ready', ms: Math.round(performance.now() - t0) }) }
    else if (m.type === 'tokenize') { await getTok(); post({ type: 'tokens', text: m.text, tokens: tokens(m.text) }) }
    else if (m.type === 'load') {
      const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
      if (!gpu || !(await gpu.requestAdapter())) { post({ type: 'error', where: 'load', message: 'no-webgpu' }); return }
      if (model?.dispose) await model.dispose()
      model = null
      const t0 = performance.now()
      await getTok()
      const files: Record<string, { loaded: number; total: number }> = {}
      model = await AutoModelForCausalLM.from_pretrained(m.modelId, {
        device: 'webgpu', dtype: 'q4f16',
        progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
          if (p.status === 'progress' && p.file && p.total) {
            files[p.file] = { loaded: p.loaded ?? 0, total: p.total }
            const all = Object.values(files)
            post({ type: 'progress', loaded: all.reduce((a, f) => a + f.loaded, 0), total: all.reduce((a, f) => a + f.total, 0) })
          }
        },
      }) as unknown as typeof model
      const load_s = (performance.now() - t0) / 1000
      // Passe de chauffe : compile les shaders WebGPU maintenant plutôt qu'au premier calcul de l'utilisateur (AN-002).
      const t1 = performance.now()
      await model!(tok!('Hello'))
      post({ type: 'ready', modelId: m.modelId, load_s: +load_s.toFixed(1), warm_s: +((performance.now() - t1) / 1000).toFixed(1) })
      pump()
    }
    else if (m.type === 'run') { pending = { text: m.text, T: m.T }; pump() }
    else if (m.type === 'dist') { if (last) { const d = dist(m.T); post({ type: 'dist', top10: d.top10, entropy: d.entropy, T: m.T }) } }
    else if (m.type === 'sample') {
      if (!last) return
      const d = dist(m.T)
      let r = Math.random(), id = d.top10[0].id
      for (let i = 0; i < d.p.length; i++) { r -= d.p[i]; if (r <= 0) { id = i; break } }
      post({ type: 'sampled', id, t: tok!.decode([id]), p: d.p[id], rank: d.top10.findIndex((x) => x.id === id) })
    }
  } catch (e) {
    post({ type: 'error', where: m.type, message: String((e as Error)?.message ?? e) })
  }
}
