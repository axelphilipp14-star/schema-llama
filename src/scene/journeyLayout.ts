// Disposition du trajet d'un token (M1) et découpage en étapes. Tout dépend de trace.config (16 ou 28 blocs).
import type { Trace } from '../data/trace'

export type StepKind = 'tokens' | 'embed' | 'block' | 'norm' | 'head' | 'probs'
export interface Step { kind: StepKind; layer?: number; x0: number; x1: number; dur: number }

export const LANE = 0.5
export const TABLE_H = 4.2 // hauteur de la table d'embedding (128 256 lignes)
export const BLOCK_W = 1.0
export const PITCH = 1.45

export function journeyLayout(trace: Trace) {
  const L = trace.config.n_layers
  const n = trace.tokens.length
  const xTok = 0
  const xTable = 2.0
  const xVec0 = 3.0
  const xVec1 = 4.6
  const xBlock0 = 6.2
  const xBlock = (l: number) => xBlock0 + l * PITCH
  const xNorm = xBlock(L - 1) + BLOCK_W / 2 + 1.0
  const xHead = xNorm + 1.6
  const xProbs = xHead + 1.2
  const xEnd = xProbs + 6.6
  const laneZ = (i: number) => (i - (n - 1) / 2) * LANE

  // Durées (s, vitesse 1×) : E8 exige de suivre un token de bout en bout en ≤ 60 s.
  const steps: Step[] = [
    { kind: 'tokens', x0: xTok - 0.6, x1: xTok + 0.6, dur: 2.5 },
    { kind: 'embed', x0: xTok + 0.6, x1: xVec1 + 0.4, dur: 2.5 },
    ...Array.from({ length: L }, (_, l): Step => ({ kind: 'block', layer: l, x0: xBlock(l) - PITCH / 2, x1: xBlock(l) + PITCH / 2, dur: 1.1 })),
    { kind: 'norm', x0: xNorm - 0.55, x1: xNorm + 0.5, dur: 2 },
    { kind: 'head', x0: xNorm + 0.5, x1: xHead + 0.4, dur: 2.5 },
    { kind: 'probs', x0: xHead + 0.4, x1: xProbs + 0.2, dur: 3 },
  ]
  steps[2].x0 = xVec1 + 0.4 // le premier bloc commence où finissent les vecteurs
  const totalDur = steps.reduce((a, s) => a + s.dur, 0)
  return { L, n, xTok, xTable, xVec0, xVec1, xBlock, xNorm, xHead, xProbs, xEnd, laneZ, steps, totalDur }
}

export type JourneyLayout = ReturnType<typeof journeyLayout>

/** Position x de l'impulsion pour une progression donnée (en étapes, continue). */
export function pulseX(lay: JourneyLayout, progress: number) {
  const i = Math.min(lay.steps.length - 1, Math.max(0, Math.floor(progress)))
  const f = Math.min(1, Math.max(0, progress - i))
  const s = lay.steps[i]
  return s.x0 + (s.x1 - s.x0) * f
}

export function stepAt(lay: JourneyLayout, progress: number) {
  return lay.steps[Math.min(lay.steps.length - 1, Math.max(0, Math.floor(progress)))]
}
