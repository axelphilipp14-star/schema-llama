// Libellés 3D → DOM : une seule couche React (hors Canvas), positions projetées à chaque image.
// Remplace <Html> de drei, qui crée une racine React par libellé (erreurs « synchronously unmount » avec React 19).
import { isValidElement, useEffect, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { create } from 'zustand'
import { C } from './colors'

type Align = 'center' | 'left' | 'right'
interface Def { p: [number, number, number]; children: ReactNode; color: string; small: boolean; align: Align; priority: number; group?: string }

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
/** priority : en cas de chevauchement à l'écran, le libellé le plus prioritaire reste visible.
 *  group : les libellés d'un même groupe sont tous visibles ou tous masqués (pas de token isolé qui flotte). */
export function Label({ p, children, color = C.text, small = false, align = 'center', priority = 0, group }: { p: [number, number, number]; children: ReactNode; color?: string; small?: boolean; align?: Align; priority?: number; group?: string }) {
  const id = useRef(0)
  if (!id.current) id.current = nextId++
  const set = useLabels((s) => s.set)
  const del = useLabels((s) => s.del)
  const key = `${p.join(',')}|${color}|${small}|${align}|${priority}|${group}|${textOf(children)}`
  useEffect(() => { set(id.current, { p, children, color, small, align, priority, group }) }, [key])
  useEffect(() => () => del(id.current), [])
  return null
}

/** Dans le Canvas : projette chaque libellé à l'écran. */
export function LabelProjector() {
  const v = new Vector3()
  useFrame(({ camera, size }) => {
    const defs = useLabels.getState().defs
    // Projection, puis masquage des chevauchements par ordre de priorité (les plus proches d'abord à priorité égale).
    type It = { el: HTMLDivElement; x: number; y: number; w: number; h: number; pr: number; z: number; ax: number; g?: string; out: boolean }
    const items: It[] = []
    for (const [id, el] of els) {
      const d = defs[id]
      if (!d) continue
      v.set(...d.p).project(camera)
      if (v.z > 1 || v.z < -1) { el.style.opacity = '0'; continue }
      const x = ((v.x + 1) / 2) * size.width, y = ((1 - v.y) / 2) * size.height
      const ax = d.align === 'left' ? 0 : d.align === 'right' ? -1 : -0.5
      el.style.transform = `translate(${x}px, ${y}px) translate(${ax * 100}%, -50%)`
      const w = el.offsetWidth, h = el.offsetHeight, x0 = x + ax * w
      // Libellé coupé par le bord de la scène : masqué plutôt que tronqué.
      const out = x0 < 0 || x0 + w > size.width || y - h / 2 < 0 || y + h / 2 > size.height
      items.push({ el, x, y, w, h, pr: d.priority, z: v.z, ax, g: d.group, out })
    }
    // Groupes : traités d'un bloc, avec la priorité de leur meilleur membre.
    const units: It[][] = []
    const byGroup = new Map<string, It[]>()
    for (const it of items) {
      if (!it.g) { units.push([it]); continue }
      let u = byGroup.get(it.g)
      if (!u) { u = []; byGroup.set(it.g, u); units.push(u) }
      u.push(it)
    }
    const key = (u: It[]) => ({ pr: Math.max(...u.map((i) => i.pr)), z: Math.min(...u.map((i) => i.z)) })
    units.sort((a, b) => { const ka = key(a), kb = key(b); return kb.pr - ka.pr || ka.z - kb.z })
    // Les bandeaux HTML posés sur la scène (mini-carte, légende, frise, accueil) comptent comme déjà occupés.
    const placed: [number, number, number, number][] = []
    const stage = document.querySelector('.stage')?.getBoundingClientRect()
    if (stage) for (const o of document.querySelectorAll('.stage .minimap, .stage .wlegend, .stage .timeline, .stage .welcome')) {
      const b = o.getBoundingClientRect()
      if (b.width && b.height) placed.push([b.left - stage.left, b.top - stage.top, b.right - stage.left, b.bottom - stage.top])
    }
    const rect = (it: It): [number, number, number, number] => { const x0 = it.x + it.ax * it.w, y0 = it.y - it.h / 2; return [x0, y0, x0 + it.w, y0 + it.h] }
    const hits = (r: [number, number, number, number], others: [number, number, number, number][]) =>
      others.some(([a0, b0, a1, b1]) => r[0] < a1 - 1 && r[2] > a0 + 1 && r[1] < b1 - 1 && r[3] > b0 + 1)
    for (const u of units) {
      const rs = u.map(rect)
      // Dans un groupe, les membres ne doivent pas non plus se chevaucher entre eux.
      const bad = u.some((it, i) => it.out || hits(rs[i], placed) || hits(rs[i], rs.slice(0, i)))
      for (const it of u) it.el.style.opacity = bad ? '0' : '1'
      if (!bad) placed.push(...rs)
    }
    ;(globalThis as unknown as { __labels: unknown }).__labels = units.flat().map((it) => ({ text: it.el.textContent, r: rect(it), on: it.el.style.opacity === '1', g: it.g ?? null }))
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
