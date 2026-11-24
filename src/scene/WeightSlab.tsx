// Règle DESIGN.md : les POIDS (appris une fois, identiques pour toute phrase) sont dessinés en fil de fer translucide ;
// les ACTIVATIONS (calculées pour la phrase) sont des volumes pleins.
import { useMemo } from 'react'
import { BoxGeometry, EdgesGeometry } from 'three'
import type { ThreeEvent } from '@react-three/fiber'

export function WeightSlab({ position, size, color, dim = false, onPointerOver, onPointerOut }: {
  position: [number, number, number]; size: [number, number, number]; color: string; dim?: boolean
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void; onPointerOut?: () => void
}) {
  const edges = useMemo(() => new EdgesGeometry(new BoxGeometry(...size)), [size[0], size[1], size[2]])
  return (
    <group position={position} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <mesh>
        <boxGeometry args={size} />
        <meshBasicMaterial color={color} transparent opacity={dim ? 0.03 : 0.07} depthWrite={false} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={color} transparent opacity={dim ? 0.25 : 0.85} />
      </lineSegments>
    </group>
  )
}
