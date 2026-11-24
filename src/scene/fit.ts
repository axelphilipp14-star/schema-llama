// Cadrage : place la caméra (direction donnée) pour que les 8 coins d'une boîte tiennent dans l'écran, centrés.
import { PerspectiveCamera, Vector3 } from 'three'

export function fitBox(cam: PerspectiveCamera, aspect: number, min: Vector3, max: Vector3, dir: Vector3, margin = 0.92) {
  const c = cam.clone() as PerspectiveCamera
  c.aspect = aspect
  c.updateProjectionMatrix()
  const corners: Vector3[] = []
  for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) corners.push(new Vector3(x, y, z))
  const target = min.clone().add(max).multiplyScalar(0.5)
  const d0 = dir.clone().normalize()
  const v = new Vector3()
  const place = (t: Vector3, d: number) => {
    c.position.copy(t).addScaledVector(d0, d)
    c.lookAt(t)
    c.updateMatrixWorld()
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
    for (const p of corners) { v.copy(p).project(c); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y) }
    return { x0, x1, y0, y1 }
  }
  let d = 10
  for (let it = 0; it < 3; it++) {
    // Distance : recherche dichotomique pour que l'étendue projetée vaille `margin`.
    let lo = 0.5, hi = 500
    for (let k = 0; k < 40; k++) {
      d = (lo + hi) / 2
      const b = place(target, d)
      const ext = Math.max((b.x1 - b.x0) / 2, (b.y1 - b.y0) / 2)
      if (ext > margin) lo = d; else hi = d
    }
    // Recentrage : décale la cible selon les axes droite/haut de la caméra.
    const b = place(target, d)
    const right = new Vector3().setFromMatrixColumn(c.matrixWorld, 0)
    const up = new Vector3().setFromMatrixColumn(c.matrixWorld, 1)
    const halfH = Math.tan((c.fov * Math.PI) / 360) * d
    target.addScaledVector(right, ((b.x0 + b.x1) / 2) * halfH * aspect).addScaledVector(up, ((b.y0 + b.y1) / 2) * halfH)
  }
  return { position: target.clone().addScaledVector(d0, d), target }
}
