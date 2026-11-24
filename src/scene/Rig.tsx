// Animation du trajet (Ticker) et caméra (suivi de l'impulsion / vue d'ensemble / libre).
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, Vector3 } from 'three'
import { anim, useStore } from '../store'
import { pulseX, TABLE_H, type JourneyLayout } from './journeyLayout'
import { fitBox } from './fit'

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
      if (!fitCache.current || fitCache.current.key !== `${size.width}x${size.height}`) {
        const f = fitBox(camera as PerspectiveCamera, size.width / size.height,
          new Vector3(lay.xTok - 1.6, -0.9, lay.laneZ(0) - 0.4), new Vector3(lay.xEnd, TABLE_H + 2.2, lay.laneZ(lay.n - 1) + 0.4),
          new Vector3(-0.55, 0.62, 1))
        fitCache.current = { key: `${size.width}x${size.height}`, ...f }
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
