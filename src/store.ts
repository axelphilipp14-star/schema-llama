import { create } from 'zustand'

export interface Hover { label: string; value: string }
export type Lang = 'fr' | 'en'
export type View = 'journey' | 'block'
export type CamMode = 'follow' | 'overview' | 'free'

interface State {
  lang: Lang
  setLang: (l: Lang) => void
  view: View
  openBlock: (layer: number) => void
  backToJourney: () => void
  layer: number
  setLayer: (l: number) => void
  hover: Hover | null
  setHover: (h: Hover | null) => void
  // Trajet (M1) : progression continue en « étapes » (0 → nombre d'étapes).
  progress: number
  setProgress: (p: number) => void
  playing: boolean
  setPlaying: (b: boolean) => void
  speed: number
  setSpeed: (s: number) => void
  cam: CamMode
  setCam: (c: CamMode) => void
  /** Saute à une progression (met aussi à jour l'animation). */
  seek: (p: number) => void
  // Vue « dans un bloc » (M2)
  blockStep: number
  setBlockStep: (s: number) => void
  head: number
  setHead: (h: number) => void
}

/** Progression animée, mise à jour à chaque image sans re-rendu React (le store n'est rafraîchi qu'à ~10 Hz). */
export const anim = { progress: 0 }
;(globalThis as unknown as { __anim: typeof anim }).__anim = anim

const initialLang: Lang = (() => {
  try { const q = new URLSearchParams(location.search).get('lang'); if (q === 'en' || q === 'fr') return q; return (localStorage.getItem('lang') as Lang) || 'fr' } catch { return 'fr' }
})()

export const useStore = create<State>((set) => ({
  lang: initialLang,
  setLang: (lang) => { try { localStorage.setItem('lang', lang) } catch { /* stockage indisponible */ } set({ lang }) },
  view: 'journey',
  openBlock: (layer) => set({ view: 'block', layer, playing: false, hover: null, blockStep: 0 }),
  backToJourney: () => set((s) => { anim.progress = 2 + s.layer + 0.5; return { view: 'journey', hover: null, cam: 'follow', progress: anim.progress } }),
  layer: 0,
  setLayer: (layer) => set({ layer }),
  hover: null,
  setHover: (hover) => set({ hover }),
  progress: 0,
  setProgress: (progress) => set({ progress }),
  playing: false,
  setPlaying: (playing) => set({ playing }),
  speed: 1,
  setSpeed: (speed) => set({ speed }),
  cam: 'overview',
  setCam: (cam) => set({ cam }),
  seek: (progress) => { anim.progress = progress; set({ progress }) },
  blockStep: 0,
  setBlockStep: (blockStep) => set({ blockStep }),
  head: 0,
  setHead: (head) => set({ head }),
}))

// Accès pour les tests de bout en bout (Playwright).
;(globalThis as unknown as { __store: typeof useStore }).__store = useStore
