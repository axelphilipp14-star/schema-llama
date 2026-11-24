// Libellés 3D → DOM : une seule couche React (hors Canvas), positions projetées à chaque image.
// Remplace <Html> de drei, qui crée une racine React par libellé (erreurs « synchronously unmount » avec React 19).
import { useEffect, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { create } from 'zustand'
import { C } from './colors'

interface Def { p: [number, number, number]; children: ReactNode; color: string; small: boolean }

const useLabels = create<{ defs: Record<number, Def>; set: (id: number, d: Def) => void; del: (id: number) => void }>((set) => ({
  defs: {},
  set: (id, d) => set((s) => ({ defs: { ...s.defs, [id]: d } })),
  del: (id) => set((s) => { const defs = { ...s.defs }; delete defs[id]; return { defs } }),
}))

const els = new Map<number, HTMLDivElement>()
let nextId = 1

/** À utiliser dans la scène : ne rend rien en 3D, enregistre un libellé. */
export function Label({ p, children, color = C.text, small = false }: { p: [number, number, number]; children: ReactNode; color?: string; small?: boolean }) {
  const id = useRef(0)
  if (!id.current) id.current = nextId++
  const set = useLabels((s) => s.set)
  const del = useLabels((s) => s.del)
  const key = `${p.join(',')}|${color}|${small}|${typeof children === 'string' ? children : JSON.stringify(children)}`
  useEffect(() => { set(id.current, { p, children, color, small }) }, [key])
  useEffect(() => () => del(id.current), [])
  return null
}

/** Dans le Canvas : projette chaque libellé à l'écran. */
export function LabelProjector() {
  const v = new Vector3()
  useFrame(({ camera, size }) => {
    const defs = useLabels.getState().defs
    for (const [id, el] of els) {
      const d = defs[id]
      if (!d) continue
      v.set(...d.p).project(camera)
      const hidden = v.z > 1 || v.z < -1
      el.style.opacity = hidden ? '0' : '1'
      el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px) translate(-50%, -50%)`
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
