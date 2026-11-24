import { create } from 'zustand'

export interface Hover { label: string; value: string }

interface State {
  layer: number
  setLayer: (l: number) => void
  hover: Hover | null
  setHover: (h: Hover | null) => void
}

export const useStore = create<State>((set) => ({
  layer: 0,
  setLayer: (layer) => set({ layer }),
  hover: null,
  setHover: (hover) => set({ hover }),
}))
