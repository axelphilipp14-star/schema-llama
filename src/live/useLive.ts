// État du direct (M3) : un seul Worker, partagé. Les mesures (E5) sont gardées pour la page et pour les preuves.
import { create } from 'zustand'

export const MODELS = {
  '1b': { id: 'onnx-community/Llama-3.2-1B-Instruct-ONNX', label: 'Llama 3.2 1B', sizeGB: 1.1 },
  '3b': { id: 'onnx-community/Llama-3.2-3B-Instruct-ONNX', label: 'Llama 3.2 3B', sizeGB: 2.4 },
} as const
export type ModelKey = keyof typeof MODELS

export interface Tok { id: number; t: string }
export interface Prob { id: number; t: string; p: number; logit: number }

interface LiveState {
  tokStatus: 'idle' | 'loading' | 'ready' | 'error'
  tokens: Tok[]
  tokensFor: string
  status: 'idle' | 'loading' | 'warming' | 'ready' | 'error'
  model: ModelKey | null
  progress: number
  loadS: number | null
  warmS: number | null
  firstResultS: number | null
  error: string | null
  running: boolean
  resultFor: string
  top10: Prob[]
  entropy: number | null
  forwardMs: number | null
  sampled: { id: number; t: string; p: number; rank: number } | null
}

export const useLive = create<LiveState>(() => ({
  tokStatus: 'idle', tokens: [], tokensFor: '',
  status: 'idle', model: null, progress: 0, loadS: null, warmS: null, firstResultS: null, error: null,
  running: false, resultFor: '', top10: [], entropy: null, forwardMs: null, sampled: null,
}))
;(globalThis as unknown as { __live: typeof useLive }).__live = useLive

let worker: Worker | null = null
let loadClick = 0
function w() {
  if (worker) return worker
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (e: MessageEvent) => {
    const m = e.data
    const set = useLive.setState
    if (m.type === 'tok-ready') set({ tokStatus: 'ready' })
    else if (m.type === 'tokens') set({ tokens: m.tokens, tokensFor: m.text })
    else if (m.type === 'progress') set({ progress: m.total ? m.loaded / m.total : 0, status: m.loaded >= m.total ? 'warming' : 'loading' })
    else if (m.type === 'ready') set({ status: 'ready', loadS: m.load_s, warmS: m.warm_s, progress: 1 })
    else if (m.type === 'result') {
      const s = useLive.getState()
      set({ running: false, resultFor: m.text, tokens: m.tokens, tokensFor: m.text, top10: m.top10, entropy: m.entropy, forwardMs: m.forward_ms, sampled: null,
        firstResultS: s.firstResultS ?? +((performance.now() - loadClick) / 1000).toFixed(1) })
    }
    else if (m.type === 'dist') set({ top10: m.top10, entropy: m.entropy })
    else if (m.type === 'sampled') set({ sampled: { id: m.id, t: m.t, p: m.p, rank: m.rank } })
    else if (m.type === 'error') {
      if (m.where === 'tok-init' || m.where === 'tokenize') set({ tokStatus: 'error', error: m.message })
      else set({ status: m.where === 'load' ? 'error' : useLive.getState().status, running: false, error: m.message })
    }
  }
  return worker
}

export const live = {
  initTokenizer() { if (useLive.getState().tokStatus === 'idle') { useLive.setState({ tokStatus: 'loading' }); w().postMessage({ type: 'tok-init' }) } },
  tokenize(text: string) { w().postMessage({ type: 'tokenize', text }) },
  load(key: ModelKey) {
    loadClick = performance.now()
    useLive.setState({ status: 'loading', model: key, progress: 0, error: null, loadS: null, warmS: null, firstResultS: null, top10: [], resultFor: '' })
    w().postMessage({ type: 'load', modelId: MODELS[key].id })
  },
  run(text: string, T: number) { useLive.setState({ running: true }); w().postMessage({ type: 'run', text, T }) },
  dist(T: number) { w().postMessage({ type: 'dist', T }) },
  sample(T: number) { w().postMessage({ type: 'sample', T }) },
}
