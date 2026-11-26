// Animation du trajet (Ticker) et caméra (suivi de l'impulsion / vue d'ensemble / libre).
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, Vector3 } from 'three'
import { anim, useStore } from '../store'
import { pulseX, TABLE_H, type JourneyLayout } from './journeyLayout'
import { fitBox } from './fit'
import { BLOCK_STEPS, stepFrame, type BlockGeom } from './blockGeom'

export function Ticker({ lay }: { lay: JourneyLayout }) {
  const last = useRef(0)
  useFrame((_, dt) => {
    const s = useStore.getState()
    if (!s.playing) return
    const i = Math.min(lay.steps.length - 1, Math.floor(anim.progress))
    anim.progress += (Math.min(dt, 0.1) * s.speed) / lay.steps[i].dur
    const end = lay.steps.length - 0.001
    if (anim.progress >= end) { anim.progress = end; s.setProgress(end); s.setPlaying(false); return }
    const now = performance.now()
    if (now - last.current > 100 || Math.floor(anim.progress) !== Math.floor(s.progress)) {
      last.current = now
      s.setProgress(anim.progress)
    }
  })
  return null
}

/** Zone de la scène (coordonnées −1…1) laissée libre par les bandeaux HTML : mini-carte, légende, accueil en haut, frise en bas. */
export function freeRegion(w: number, h: number) {
  const stage = typeof document !== 'undefined' ? document.querySelector('.stage')?.getBoundingClientRect() : null
  let top = 0, bottom = h
  if (stage) {
    // Chaque bandeau compte en haut ou en bas selon sa position (l'accueil est juste au-dessus de la frise).
    for (const o of document.querySelectorAll('.stage .minimap, .stage .wlegend, .stage .welcome, .stage .timeline')) {
      const b = o.getBoundingClientRect()
      if (!b.height) continue
      const t0 = b.top - stage.top, b0 = b.bottom - stage.top
      if ((t0 + b0) / 2 < h / 2) top = Math.max(top, b0 + 8)
      else bottom = Math.min(bottom, t0 - 4)
    }
  }
  if (bottom - top < h * 0.4) { top = 0; bottom = h } // fenêtre minuscule : on garde tout l'écran
  // À droite, place pour les libellés des probabilités (« ·was 46,6 % »), qui dépassent la boîte 3D.
  return { x0: -1 + 24 / w, x1: 1 - 150 / w, y0: 1 - (2 * bottom) / h, y1: 1 - (2 * top) / h }
}

const FOLLOW_OFFSET = new Vector3(-7.5, 9.5, 8.5)

export function Rig({ lay }: { lay: JourneyLayout }) {
  const { camera, size, controls } = useThree()
  const desT = useRef(new Vector3())
  const desP = useRef(new Vector3())
  const fitCache = useRef<{ key: string; position: Vector3; target: Vector3 } | null>(null)
  const c = controls as unknown as { target: Vector3; update: () => void; addEventListener: (e: string, f: () => void) => void; removeEventListener: (e: string, f: () => void) => void } | null

  // Toute interaction de l'utilisateur rend la caméra libre.
  useEffect(() => {
    if (!c) return
    const onStart = () => useStore.getState().setCam('free')
    c.addEventListener('start', onStart)
    return () => c.removeEventListener('start', onStart)
  }, [c])

  useFrame((_, dt) => {
    if (!c) return
    const mode = useStore.getState().cam
    if (mode === 'free') return
    if (mode === 'follow') {
      const x = pulseX(lay, anim.progress)
      desT.current.set(x + 2.6, 1.2, 0)
      desP.current.copy(desT.current).add(FOLLOW_OFFSET)
    } else {
      // Vue d'ensemble : tout le trajet dans le cadre, en diagonale (la ligne fuit vers la droite).
      const region = freeRegion(size.width, size.height)
      const key = `${size.width}x${size.height}|${region.x0.toFixed(3)},${region.x1.toFixed(3)},${region.y0.toFixed(3)},${region.y1.toFixed(3)}`
      if (!fitCache.current || fitCache.current.key !== key) {
        const f = fitBox(camera as PerspectiveCamera, size.width / size.height,
          new Vector3(lay.xTok - 1.6, -0.9, lay.laneZ(0) - 0.4), new Vector3(lay.xEnd, TABLE_H + 2.2, lay.laneZ(lay.n - 1) + 0.4),
          new Vector3(-0.55, 0.62, 1), 0.96, region)
        fitCache.current = { key, ...f }
      }
      desT.current.copy(fitCache.current.target)
      desP.current.copy(fitCache.current.position)
    }
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 2.8)
    camera.position.lerp(desP.current, k)
    c.target.lerp(desT.current, k)
    c.update()
    if (mode === 'overview' && camera.position.distanceTo(desP.current) < 0.02) useStore.getState().setCam('free')
  })
  return null
}

/** Caméra de la vue « dans un bloc » : vole vers le cadrage de l'étape en cours (et de la tête choisie). */
export function BlockRig({ geo }: { geo: BlockGeom }) {
  const { camera, size, controls } = useThree()
  const c = controls as unknown as { target: Vector3; update: () => void; addEventListener: (e: string, f: () => void) => void; removeEventListener: (e: string, f: () => void) => void } | null
  const step = useStore((s) => s.blockStep)
  const head = useStore((s) => s.head)
  const des = useRef<{ position: Vector3; target: Vector3 } | null>(null)
  const active = useRef(true)

  useEffect(() => {
    const f = stepFrame(geo, BLOCK_STEPS[step], head)
    des.current = fitBox(camera as PerspectiveCamera, size.width / size.height, new Vector3(...f.min), new Vector3(...f.max), new Vector3(...f.dir), 0.9, { x0: -0.96, x1: 0.96, y0: -0.12, y1: 0.94 })
    active.current = true
  }, [step, head, size.width, size.height])

  useEffect(() => {
    if (!c) return
    const onStart = () => { active.current = false }
    c.addEventListener('start', onStart)
    return () => c.removeEventListener('start', onStart)
  }, [c])

  useFrame((_, dt) => {
    if (!c || !des.current || !active.current) return
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 3.2)
    camera.position.lerp(des.current.position, k)
    c.target.lerp(des.current.target, k)
    c.update()
    if (camera.position.distanceTo(des.current.position) < 0.005) active.current = false
  })
  return null
}
