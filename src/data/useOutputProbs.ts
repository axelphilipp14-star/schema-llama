// Sortie de la trace à la température choisie. À T = 1, les probabilités stockées dans la trace (exactes, au chiffre près).
import { useMemo } from 'react'
import type { Trace } from './trace'
import { traceTemperature } from './math'
import { useStore } from '../store'

export function useOutputProbs(trace: Trace) {
  const T = useStore((s) => s.temperature)
  return useMemo(() => {
    if (Math.abs(T - 1) < 1e-9) return { top10: trace.output.top10, exact: true }
    const r = traceTemperature(trace.output.top50_logits, trace.output.top10[0].p, T)
    return { top10: r.top10, exact: r.exact }
  }, [trace, T])
}
