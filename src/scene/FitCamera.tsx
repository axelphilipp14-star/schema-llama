import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { PerspectiveCamera, Vector3 } from 'three'

/** Cadre une boîte [w × h] centrée sur `target`, vue légèrement de haut, quelle que soit la taille de la fenêtre. */
export function FitCamera({ target, w, h, dir = [0, 0.42, 1] }: { target: [number, number, number]; w: number; h: number; dir?: [number, number, number] }) {
  const { camera, size, controls } = useThree()
  useEffect(() => {
    const cam = camera as PerspectiveCamera
    const vfov = (cam.fov * Math.PI) / 180
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * (size.width / size.height))
    const d = Math.max(w / 2 / Math.tan(hfov / 2), h / 2 / Math.tan(vfov / 2)) * 1.08
    const t = new Vector3(...target)
    cam.position.copy(t).add(new Vector3(...dir).normalize().multiplyScalar(d))
    cam.lookAt(t)
    const c = controls as unknown as { target?: Vector3; update?: () => void } | null
    if (c?.target) { c.target.copy(t); c.update?.() }
  }, [size.width, size.height, controls])
  return null
}
