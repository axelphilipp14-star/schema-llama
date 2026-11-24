import { useLayoutEffect, useRef } from 'react'
import { Color, InstancedMesh, Object3D } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { useStore } from '../store'

/** Grille instanciée générique : une boîte par cellule, couleur par cellule, survol → libellé. */
export function Cells({ pos, colors, size, info, scales, onClick, opacity = 1 }: {
  pos: [number, number, number][]
  colors: Color[]
  scales?: [number, number, number][]
  size: [number, number, number]
  info: (i: number) => { label: string; value: string }
  onClick?: (i: number) => void
  opacity?: number
}) {
  const ref = useRef<InstancedMesh>(null)
  const setHover = useStore((s) => s.setHover)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D()
    pos.forEach((p, i) => {
      o.position.set(...p)
      if (scales) o.scale.set(...scales[i])
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, colors[i])
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [pos, colors, scales])
  return (
    <instancedMesh
      key={pos.length}
      ref={ref}
      args={[undefined, undefined, pos.length]}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); if (e.instanceId != null) setHover(info(e.instanceId)) }}
      onPointerOut={() => setHover(null)}
      onClick={onClick ? (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.instanceId != null) onClick(e.instanceId) } : undefined}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial roughness={0.6} metalness={0.05} transparent={opacity < 1} opacity={opacity} depthWrite={opacity >= 1} />
    </instancedMesh>
  )
}
