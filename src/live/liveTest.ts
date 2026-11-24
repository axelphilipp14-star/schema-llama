// M0-c : test de faisabilité du direct. Résultats dans la page et dans window.__live (lisible par l'automate).
import { AutoModelForCausalLM, AutoTokenizer, Tensor } from '@huggingface/transformers'

const logEl = document.getElementById('log')!
const out: Record<string, unknown> = {}
;(window as unknown as { __live: unknown }).__live = out
const log = (s: string) => { logEl.textContent += '\n' + s; console.log('[live]', s) }

async function checkGpu() {
  const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<{ info?: Record<string, string>; limits: Record<string, number> } | null> } }).gpu
  if (!gpu) { logEl.textContent = 'WebGPU : ABSENT dans ce navigateur.'; out.webgpu = false; return }
  const ad = await gpu.requestAdapter()
  out.webgpu = !!ad
  out.adapter = ad?.info ?? null
  out.maxBufferSize = ad?.limits.maxBufferSize
  logEl.textContent = `WebGPU : ${ad ? 'OK' : 'pas d’adaptateur'} · ${JSON.stringify(ad?.info ?? {})} · maxBufferSize ${(Number(ad?.limits.maxBufferSize) / 1e9).toFixed(2)} Go · deviceMemory ${(navigator as unknown as { deviceMemory?: number }).deviceMemory ?? '?'} Go`
}

function softmax(x: Float32Array) {
  let m = -Infinity
  for (const v of x) if (v > m) m = v
  let s = 0
  const p = new Float32Array(x.length)
  for (let i = 0; i < x.length; i++) { p[i] = Math.exp(x[i] - m); s += p[i] }
  for (let i = 0; i < x.length; i++) p[i] /= s
  return p
}

async function run(modelId: string) {
  const r: Record<string, unknown> = { modelId, status: 'start' }
  out[modelId] = r
  try {
    log(`\n=== ${modelId}`)
    const t0 = performance.now()
    const tok = await AutoTokenizer.from_pretrained(modelId)
    const model = await AutoModelForCausalLM.from_pretrained(modelId, {
      device: 'webgpu', dtype: 'q4f16',
      progress_callback: (p: { status: string; file?: string; progress?: number }) => {
        if (p.status === 'progress' && p.progress && Math.round(p.progress) % 25 === 0) r.progress = `${p.file} ${Math.round(p.progress)} %`
      },
    })
    r.load_s = +((performance.now() - t0) / 1000).toFixed(1)
    log(`chargé en ${r.load_s} s`)

    // Sorties du graphe ONNX : y a-t-il des scores d'attention ?
    const sessions = (model as unknown as { sessions: Record<string, { outputNames: string[]; inputNames: string[] }> }).sessions
    const names = Object.fromEntries(Object.entries(sessions).map(([k, s]) => [k, s.outputNames]))
    r.output_names = names
    const all = Object.values(names).flat()
    r.attention_outputs = all.filter((n) => /attn|attention/i.test(n) && !/present|past/i.test(n))
    log(`sorties ONNX : ${all.filter((n) => !/present/.test(n)).join(', ')} (+ ${all.filter((n) => /present/.test(n)).length} sorties de cache K/V)`)
    log(`sorties d'attention exposées : ${(r.attention_outputs as string[]).length ? (r.attention_outputs as string[]).join(', ') : 'AUCUNE'}`)

    // Un passage avant : top-10 du token suivant
    const prompt = (document.getElementById('prompt') as HTMLInputElement).value
    const inputs = tok(prompt)
    const t1 = performance.now()
    const o = await (model as unknown as (x: unknown) => Promise<{ logits: Tensor }>)(inputs)
    r.forward_ms = Math.round(performance.now() - t1)
    const [, n, V] = o.logits.dims as number[]
    const last = (o.logits.data as Float32Array).slice((n - 1) * V, n * V)
    const p = softmax(Float32Array.from(last))
    const idx = Array.from(p.keys()).sort((a, b) => p[b] - p[a]).slice(0, 10)
    r.top10 = idx.map((i) => ({ id: i, t: tok.decode([i]), p: +p[i].toFixed(4) }))
    r.n_tokens = n
    log(`passage avant (${n} tokens) : ${r.forward_ms} ms`)
    log('top-10 : ' + (r.top10 as { t: string; p: number }[]).map((x) => `${JSON.stringify(x.t)} ${(x.p * 100).toFixed(1)}%`).join(' · '))

    // Vitesse de génération
    const N = 32
    const t2 = performance.now()
    const g = await model.generate({ ...inputs, max_new_tokens: N, do_sample: false, min_new_tokens: N })
    const dt = (performance.now() - t2) / 1000
    r.gen_tok_s = +(N / dt).toFixed(1)
    const ids = ((g as Tensor).tolist() as bigint[][])[0].slice(n).map(Number)
    r.gen_text = tok.decode(ids, { skip_special_tokens: true })
    log(`génération : ${r.gen_tok_s} tokens/s — « ${r.gen_text} »`)
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
    if (mem) r.js_heap_gb = +(mem.usedJSHeapSize / 1e9).toFixed(2)
    r.status = 'ok'
    log('OK')
    await (model as unknown as { dispose(): Promise<void> }).dispose()
  } catch (e) {
    r.status = 'error'
    r.error = String((e as Error)?.stack ?? e)
    log('ERREUR : ' + r.error)
  }
}

checkGpu()
document.querySelectorAll('button[data-m]').forEach((b) => b.addEventListener('click', () => run((b as HTMLElement).dataset.m!)))
