import { useEffect, useRef, useState } from 'react'

/** Compteur d'images par seconde (exigence E3 : ≥ 50 i/s). Mesure via requestAnimationFrame. */
export function Fps() {
  const [fps, setFps] = useState(0)
  const frames = useRef(0)
  useEffect(() => {
    let raf = 0
    let t0 = performance.now()
    const tick = (t: number) => {
      frames.current++
      if (t - t0 >= 1000) {
        setFps(Math.round((frames.current * 1000) / (t - t0)))
        ;(window as unknown as { __fps: number }).__fps = Math.round((frames.current * 1000) / (t - t0))
        frames.current = 0
        t0 = t
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <div className="fps mono" style={{ color: fps >= 50 ? '#3ddc97' : '#ff8a3d' }}>{fps} i/s</div>
}
