// Libellés 3D → DOM : une seule couche React (hors Canvas), positions projetées à chaque image.
// Remplace <Html> de drei, qui crée une racine React par libellé (erreurs « synchronously unmount » avec React 19).
import { isValidElement, useEffect, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { create } from 'zustand'
import { C } from './colors'

type Align = 'center' | 'left' | 'right'
interface Def { p: [number, number, number]; children: ReactNode; color: string; small: boolean; align: Align; priority: number }

const useLabels = create<{ defs: Record<number, Def>; set: (id: number, d: Def) => void; del: (id: number) => void }>((set) => ({
  defs: {},
  set: (id, d) => set((s) => ({ defs: { ...s.defs, [id]: d } })),
  del: (id) => set((s) => { const defs = { ...s.defs }; delete defs[id]; return { defs } }),
}))

const els = new Map<number, HTMLDivElement>()

/** Texte d'un nœud React (pour savoir si un libellé a changé) — sans JSON.stringify, qui boucle sur le JSX. */
function textOf(n: ReactNode): string {
  if (n == null || typeof n === 'boolean') return ''
  if (typeof n === 'string' || typeof n === 'number') return String(n)
  if (Array.isArray(n)) return n.map(textOf).join('')
  if (isValidElement(n)) return '<' + textOf((n.props as { children?: ReactNode }).children) + '>'
  return ''
}
let nextId = 1

/** À utiliser dans la scène : ne rend rien en 3D, enregistre un libellé. */
/** priority : en cas de chevauchement à l'écran, le libellé le plus prioritaire reste visible. */
export function Label({ p, children, color = C.text, small = false, align = 'center', priority = 0 }: { p: [number, number, number]; children: ReactNode; color?: string; small?: boolean; align?: Align; priority?: number }) {
  const id = useRef(0)
  if (!id.current) id.current = nextId++
  const set = useLabels((s) => s.set)
  const del = useLabels((s) => s.del)
  const key = `${p.join(',')}|${color}|${small}|${align}|${priority}|${textOf(children)}`
  useEffect(() => { set(id.current, { p, children, color, small, align, priority }) }, [key])
  useEffect(() => () => del(id.current), [])
  return null
}

/** Dans le Canvas : projette chaque libellé à l'écran. */
export function LabelProjector() {
  const v = new Vector3()
  useFrame(({ camera, size }) => {
    const defs = useLabels.getState().defs
    // Projection, puis masquage des chevauchements par ordre de priorité (les plus proches d'abord à priorité égale).
    const items: { el: HTMLDivElement; x: number; y: number; w: number; h: number; pr: number; z: number; ax: number }[] = []
    for (const [id, el] of els) {
      const d = defs[id]
      if (!d) continue
      v.set(...d.p).project(camera)
      if (v.z > 1 || v.z < -1) { el.style.opacity = '0'; continue }
      const x = ((v.x + 1) / 2) * size.width, y = ((1 - v.y) / 2) * size.height
      const ax = d.align === 'left' ? 0 : d.align === 'right' ? -1 : -0.5
      el.style.transform = `translate(${x}px, ${y}px) translate(${ax * 100}%, -50%)`
      items.push({ el, x, y, w: el.offsetWidth, h: el.offsetHeight, pr: d.priority, z: v.z, ax })
    }
    items.sort((a, b) => b.pr - a.pr || a.z - b.z)
    const placed: [number, number, number, number][] = []
    for (const it of items) {
      const x0 = it.x + it.ax * it.w, y0 = it.y - it.h / 2, x1 = x0 + it.w, y1 = y0 + it.h
      const hit = placed.some(([a0, b0, a1, b1]) => x0 < a1 - 1 && x1 > a0 + 1 && y0 < b1 - 1 && y1 > b0 + 1)
      it.el.style.opacity = hit ? '0' : '1'
      if (!hit) placed.push([x0, y0, x1, y1])
    }
  })
  return null
}

/** Hors Canvas, dans le même conteneur positionné. */
export function LabelOverlay() {
  const defs = useLabels((s) => s.defs)
  return (
    <div className="labels">
      {Object.entries(defs).map(([id, d]) => (
        <div
          key={id}
          ref={(el) => { if (el) els.set(+id, el); else els.delete(+id) }}
          className={d.small ? 'lbl lbl-s' : 'lbl'}
          style={{ color: d.color }}
        >
          {d.children}
        </div>
      ))}
    </div>
  )
}
