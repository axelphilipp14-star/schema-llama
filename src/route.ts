// Liens directs vers une étape du schéma (démo du 29/11). Lecture seule : le hash n'est pas réécrit pendant la navigation.
//   #/repondre                      vue d'ensemble du trajet
//   #/repondre/<étape>              tokens · embeddings · norm · tete · probabilites
//   #/bloc/<n>                      intérieur du bloc n (1 = premier)
//   #/fabriquer                     vue d'ensemble de la fabrication
//   #/fabriquer/<étape>             donnees · tokenizer · pre-entrainement · fine-tuning
import type { StepKind } from './scene/journeyLayout'

export type SchemaLink =
  | { phase: 'respond'; step: Exclude<StepKind, 'block'> | null }
  | { phase: 'respond'; block: number }
  | { phase: 'make'; makeStep: number }

const RESPOND_STEPS: Record<string, Exclude<StepKind, 'block'>> = { tokens: 'tokens', embeddings: 'embed', norm: 'norm', tete: 'head', probabilites: 'probs' }
export const MAKE_SLUGS = ['donnees', 'tokenizer', 'pre-entrainement', 'fine-tuning'] as const

/** Hash → état voulu ; null si le hash ne désigne pas une étape du schéma. */
export function parseSchemaLink(hash: string, nLayers: number): SchemaLink | null {
  const parts = decodeURIComponent(hash).replace(/^#\/?/, '').split('/').filter(Boolean).map((p) => p.toLowerCase())
  if (parts[0] === 'repondre') {
    if (!parts[1]) return { phase: 'respond', step: null }
    const s = RESPOND_STEPS[parts[1]]
    return s ? { phase: 'respond', step: s } : null
  }
  if (parts[0] === 'bloc') {
    const n = Number(parts[1])
    return Number.isInteger(n) && n >= 1 && n <= nLayers ? { phase: 'respond', block: n - 1 } : null
  }
  if (parts[0] === 'fabriquer') {
    if (!parts[1]) return { phase: 'make', makeStep: -1 }
    const i = (MAKE_SLUGS as readonly string[]).indexOf(parts[1])
    return i >= 0 ? { phase: 'make', makeStep: i } : null
  }
  return null
}
