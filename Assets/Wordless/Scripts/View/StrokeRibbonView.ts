import { MAX_STROKE_POINTS } from '../Core/Protocol'
import type { WorldPoint } from '../Core/Protocol'
import { StrokeRibbonMesh } from './StrokeRibbonMesh'

export interface OwnedResourceCounts {
  readonly sceneObjects: number
  readonly materials: number
}

const OUTER_WIDTH_CM = 7
const CORE_WIDTH_CM = 3.6

function snapshotPoints(points: readonly WorldPoint[]): WorldPoint[] {
  if (!Array.isArray(points)) return []
  const result: WorldPoint[] = []
  const length = Math.min(points.length, MAX_STROKE_POINTS)
  for (let index = 0; index < length; index += 1) {
    try {
      const point = points[index]
      const x = point.x
      const y = point.y
      const z = point.z
      if (typeof x !== 'number' || !Number.isFinite(x) ||
          typeof y !== 'number' || !Number.isFinite(y) ||
          typeof z !== 'number' || !Number.isFinite(z)) {
        continue
      }
      result.push({ x, y, z })
    }
    catch {
      continue
    }
  }
  return result
}

function pointsEqual(
  left: readonly WorldPoint[] | null,
  right: readonly WorldPoint[],
): boolean {
  if (left === null || left.length !== right.length) return false
  for (let index = 0; index < left.length; index += 1) {
    if (left[index].x !== right[index].x ||
        left[index].y !== right[index].y ||
        left[index].z !== right[index].z) {
      return false
    }
  }
  return true
}

@component
export class StrokeRibbonView extends BaseScriptComponent {
  @input outerMaterial: Material
  @input coreMaterial: Material
  @input drawHeadVisual: SceneObject

  private outerMesh: StrokeRibbonMesh | null = null
  private coreMesh: StrokeRibbonMesh | null = null
  private readonly ownedSceneObjects: SceneObject[] = []
  private readonly ownedMaterials: Material[] = []
  private lastWorldPoints: readonly WorldPoint[] | null = null
  private hasGeometry = false
  private payoffActive = false

  onAwake(): void {
    this.outerMesh = new StrokeRibbonMesh(OUTER_WIDTH_CM)
    this.coreMesh = new StrokeRibbonMesh(CORE_WIDTH_CM)
    this.createRibbonObject(
      'WORDLESS Ribbon Outer',
      this.outerMesh,
      this.outerMaterial,
    )
    this.createRibbonObject(
      'WORDLESS Ribbon Core',
      this.coreMesh,
      this.coreMaterial,
    )
    this.createEvent('OnDestroyEvent').bind(() => this.onDestroy())
  }

  render(worldPoints: readonly WorldPoint[]): void {
    if (this.outerMesh === null || this.coreMesh === null) return
    const snapshot = snapshotPoints(worldPoints)
    if (pointsEqual(this.lastWorldPoints, snapshot)) return
    this.lastWorldPoints = snapshot

    const inverseWorld = this.getSceneObject()
      .getTransform()
      .getInvertedWorldTransform()
    const localPoints = snapshot.map((point) => {
      const local = inverseWorld.multiplyPoint(new vec3(point.x, point.y, point.z))
      return { x: local.x, y: local.y, z: local.z }
    })
    const hasGeometry = this.outerMesh.rebuild(localPoints)
    const coreHasGeometry = this.coreMesh.rebuild(localPoints)
    this.hasGeometry = hasGeometry && coreHasGeometry
    this.applyVisibility()

    const lastPoint = snapshot.length === 0
      ? null
      : snapshot[snapshot.length - 1]
    if (lastPoint !== null) {
      this.drawHeadVisual.getTransform().setWorldPosition(
        new vec3(lastPoint.x, lastPoint.y, lastPoint.z),
      )
    }
  }

  setPayoffActive(active: boolean): void {
    if (this.payoffActive === active) return
    this.payoffActive = active
    this.applyVisibility()
  }

  getOwnedResourceCounts(): OwnedResourceCounts {
    return {
      sceneObjects: this.ownedSceneObjects.length,
      materials: this.ownedMaterials.length,
    }
  }

  private createRibbonObject(
    name: string,
    ribbon: StrokeRibbonMesh,
    sourceMaterial: Material,
  ): void {
    const sceneObject = global.scene.createSceneObject(name)
    sceneObject.setParent(this.getSceneObject())
    const transform = sceneObject.getTransform()
    transform.setLocalPosition(vec3.zero())
    transform.setLocalRotation(quat.quatIdentity())
    transform.setLocalScale(vec3.one())

    const material = sourceMaterial.clone()
    const visual = sceneObject.createComponent(
      'Component.RenderMeshVisual',
    ) as RenderMeshVisual
    visual.mesh = ribbon.getMesh()
    visual.mainMaterial = material
    visual.meshShadowMode = MeshShadowMode.None
    visual.mainPass.twoSided = true
    sceneObject.enabled = false
    this.ownedSceneObjects.push(sceneObject)
    this.ownedMaterials.push(material)
  }

  private applyVisibility(): void {
    for (const sceneObject of this.ownedSceneObjects) {
      sceneObject.enabled = this.hasGeometry && !this.payoffActive
    }
    this.drawHeadVisual.enabled = !this.payoffActive
  }

  private onDestroy(): void {
    while (this.ownedSceneObjects.length > 0) {
      const sceneObject = this.ownedSceneObjects.pop()
      if (sceneObject) sceneObject.destroy()
    }
    this.ownedMaterials.splice(0, this.ownedMaterials.length)
    this.outerMesh = null
    this.coreMesh = null
    this.lastWorldPoints = null
    this.hasGeometry = false
    this.payoffActive = false
  }
}
