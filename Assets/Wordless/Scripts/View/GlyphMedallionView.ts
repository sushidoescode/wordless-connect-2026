import {
  easeOutCubic,
  interpolatePath,
  type GlyphTransitionPoint,
} from '../Core/GlyphTransition'
import { MAX_STROKE_POINTS } from '../Core/Protocol'
import type {
  QuantizedPoint,
  StrokeColorId,
  WorldPoint,
} from '../Core/Protocol'

export interface OwnedGlyphResourceCounts {
  readonly sceneObjects: number
  readonly materials: number
}

export type GlyphLocalPoint = readonly [xCm: number, yCm: number]

export type GlyphVertex = readonly [
  px: number,
  py: number,
  pz: number,
  nx: number,
  ny: number,
  nz: number,
  u: number,
  v: number,
]

export interface GlyphMeshGeometry {
  readonly vertices: readonly GlyphVertex[]
  readonly indices: readonly number[]
  readonly segmentCount: number
}

const GLYPH_DIAMETER_CM = 34
const GLYPH_STROKE_WIDTH_CM = 2.4
const GLYPH_CENTERLINE_DIAMETER_CM =
  GLYPH_DIAMETER_CM - GLYPH_STROKE_WIDTH_CM
const FRAME_INNER_RADIUS_CM = 25
const FRAME_OUTER_RADIUS_CM = 27
const FRAME_SEGMENT_COUNT = 64
const GLYPH_TRANSITION_SECONDS = 0.45
const MEDALLION_RESOURCE_COUNTS: OwnedGlyphResourceCounts = Object.freeze({
  sceneObjects: 4,
  materials: 2,
})

function invalidQuantizedPoints(): never {
  throw new Error('Invalid quantized glyph points')
}

function snapshotQuantizedPoints(value: unknown): readonly QuantizedPoint[] {
  try {
    if (!Array.isArray(value)) return invalidQuantizedPoints()
    const length = value.length
    if (!Number.isSafeInteger(length) ||
        length < 0 ||
        length > MAX_STROKE_POINTS) {
      return invalidQuantizedPoints()
    }

    const snapshot: QuantizedPoint[] = []
    for (let index = 0; index < length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) {
        return invalidQuantizedPoints()
      }
      const candidate = value[index]
      if (!Array.isArray(candidate) ||
          candidate.length !== 2 ||
          !Object.prototype.hasOwnProperty.call(candidate, 0) ||
          !Object.prototype.hasOwnProperty.call(candidate, 1)) {
        return invalidQuantizedPoints()
      }
      const x = candidate[0]
      const y = candidate[1]
      if (typeof x !== 'number' ||
          !Number.isInteger(x) ||
          x < 0 ||
          x > 1000 ||
          typeof y !== 'number' ||
          !Number.isInteger(y) ||
          y < 0 ||
          y > 1000) {
        return invalidQuantizedPoints()
      }
      snapshot.push([x, y])
    }
    return snapshot
  }
  catch {
    return invalidQuantizedPoints()
  }
}

function cleanCoordinate(value: number): number {
  const rounded = Math.round(value * 1e12) / 1e12
  return Object.is(rounded, -0) ? 0 : rounded
}

export function layoutGlyphPoints(
  points: readonly QuantizedPoint[],
): readonly GlyphLocalPoint[] {
  const snapshot = snapshotQuantizedPoints(points)
  if (snapshot.length === 0) return []

  let minimumX = snapshot[0][0]
  let maximumX = minimumX
  let minimumY = snapshot[0][1]
  let maximumY = minimumY
  for (let index = 1; index < snapshot.length; index += 1) {
    const point = snapshot[index]
    minimumX = Math.min(minimumX, point[0])
    maximumX = Math.max(maximumX, point[0])
    minimumY = Math.min(minimumY, point[1])
    maximumY = Math.max(maximumY, point[1])
  }

  const width = maximumX - minimumX
  const height = maximumY - minimumY
  const largerDimension = Math.max(width, height)
  if (largerDimension === 0) {
    return snapshot.map(() => [0, 0] as const)
  }

  const centerX = (minimumX + maximumX) / 2
  const centerY = (minimumY + maximumY) / 2
  const scale = GLYPH_CENTERLINE_DIAMETER_CM / largerDimension
  return snapshot.map((point) => [
    cleanCoordinate((point[0] - centerX) * scale),
    cleanCoordinate((centerY - point[1]) * scale),
  ] as const)
}

export function layoutTransitionSourcePoints(
  points: readonly WorldPoint[],
  toMedallionLocal: (point: WorldPoint) => GlyphTransitionPoint,
): readonly GlyphLocalPoint[] {
  if (!Array.isArray(points) || points.length > MAX_STROKE_POINTS) {
    throw new Error('Invalid world glyph points')
  }
  const result: GlyphLocalPoint[] = []
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]
    const x = point?.x
    const y = point?.y
    const z = point?.z
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      throw new Error('Invalid world glyph points')
    }
    const mapped = toMedallionLocal({ x, y, z })
    const mappedX = mapped[0]
    const mappedY = mapped[1]
    if (!Number.isFinite(mappedX) || !Number.isFinite(mappedY)) {
      throw new Error('Invalid medallion transition point')
    }
    result.push([
      cleanCoordinate(mappedX),
      cleanCoordinate(mappedY),
    ])
  }
  return result
}

function glyphVertex(
  x: number,
  y: number,
  u: number,
  v: number,
  depthCm = 0,
): GlyphVertex {
  return [
    cleanCoordinate(x),
    cleanCoordinate(y),
    cleanCoordinate(depthCm),
    0,
    0,
    1,
    u,
    v,
  ]
}

export function buildMedallionFrameGeometry(): GlyphMeshGeometry {
  const vertices: GlyphVertex[] = []
  const indices: number[] = []
  for (let index = 0; index < FRAME_SEGMENT_COUNT; index += 1) {
    const angle = index / FRAME_SEGMENT_COUNT * Math.PI * 2
    const cosine = Math.cos(angle)
    const sine = Math.sin(angle)
    const u = index / FRAME_SEGMENT_COUNT
    vertices.push(
      glyphVertex(
        cosine * FRAME_INNER_RADIUS_CM,
        sine * FRAME_INNER_RADIUS_CM,
        u,
        0,
      ),
      glyphVertex(
        cosine * FRAME_OUTER_RADIUS_CM,
        sine * FRAME_OUTER_RADIUS_CM,
        u,
        1,
      ),
    )
  }

  for (let index = 0; index < FRAME_SEGMENT_COUNT; index += 1) {
    const next = (index + 1) % FRAME_SEGMENT_COUNT
    const inner = index * 2
    const outer = inner + 1
    const nextInner = next * 2
    const nextOuter = nextInner + 1
    indices.push(
      inner, outer, nextInner,
      outer, nextOuter, nextInner,
    )
  }
  return { vertices, indices, segmentCount: FRAME_SEGMENT_COUNT }
}

function appendGlyphQuad(
  vertices: GlyphVertex[],
  indices: number[],
  start: GlyphLocalPoint,
  end: GlyphLocalPoint,
  halfWidth: number,
  depthCm: number,
): boolean {
  const deltaX = end[0] - start[0]
  const deltaY = end[1] - start[1]
  const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  if (!Number.isFinite(length) || length === 0) return false

  const sideX = -deltaY / length * halfWidth
  const sideY = deltaX / length * halfWidth
  const base = vertices.length
  vertices.push(
    glyphVertex(start[0] - sideX, start[1] - sideY, 0, 0, depthCm),
    glyphVertex(start[0] + sideX, start[1] + sideY, 0, 1, depthCm),
    glyphVertex(end[0] - sideX, end[1] - sideY, 1, 0, depthCm),
    glyphVertex(end[0] + sideX, end[1] + sideY, 1, 1, depthCm),
  )
  indices.push(
    base, base + 2, base + 1,
    base + 1, base + 2, base + 3,
  )
  return true
}

function appendPointPrimitive(
  vertices: GlyphVertex[],
  indices: number[],
  point: GlyphLocalPoint,
  halfWidth: number,
  depthCm: number,
): void {
  const base = vertices.length
  vertices.push(
    glyphVertex(point[0] - halfWidth, point[1] - halfWidth, 0, 0, depthCm),
    glyphVertex(point[0] - halfWidth, point[1] + halfWidth, 0, 1, depthCm),
    glyphVertex(point[0] + halfWidth, point[1] - halfWidth, 1, 0, depthCm),
    glyphVertex(point[0] + halfWidth, point[1] + halfWidth, 1, 1, depthCm),
  )
  indices.push(
    base, base + 2, base + 1,
    base + 1, base + 2, base + 3,
  )
}

export function buildGlyphMeshGeometry(
  points: readonly GlyphLocalPoint[],
  strokeWidthCm: number,
  depthCm = 0,
): GlyphMeshGeometry {
  if (!Number.isFinite(strokeWidthCm) || strokeWidthCm <= 0) {
    throw new Error('Glyph stroke width must be a positive finite number')
  }
  if (!Number.isFinite(depthCm)) {
    throw new Error('Glyph depth must be finite')
  }

  const vertices: GlyphVertex[] = []
  const indices: number[] = []
  if (!Array.isArray(points) || points.length === 0) {
    return { vertices, indices, segmentCount: 0 }
  }

  const halfWidth = strokeWidthCm / 2
  let segmentCount = 0
  for (let index = 1; index < points.length; index += 1) {
    if (appendGlyphQuad(
      vertices,
      indices,
      points[index - 1],
      points[index],
      halfWidth,
      depthCm,
    )) {
      segmentCount += 1
    }
  }
  if (segmentCount === 0) {
    appendPointPrimitive(vertices, indices, points[0], halfWidth, depthCm)
  }
  return { vertices, indices, segmentCount }
}

const GLYPH_VERTEX_LAYOUT = [
  { name: 'position', components: 3 },
  { name: 'normal', components: 3 },
  { name: 'texture0', components: 2 },
]

@component
export class GlyphMedallionView extends BaseScriptComponent {
  @input medallionRoot: SceneObject
  @input frameVisual: RenderMeshVisual
  @input glyphVisual: RenderMeshVisual
  @input revealedWordLabel: Text
  @input ivoryFrameMaterial: Material
  @input violetGlyphMaterial: Material
  @input lemonGlyphMaterial: Material
  @input mintGlyphMaterial: Material

  private glyphBuilder: MeshBuilder | null = null
  private frameBuilder: MeshBuilder | null = null
  private transition: {
    readonly from: readonly GlyphLocalPoint[]
    readonly to: readonly GlyphLocalPoint[]
    readonly fromDepthCm: number
    readonly startedAtSeconds: number
  } | null = null

  onAwake(): void {
    this.assertBindings()
    this.glyphBuilder = this.createBuilder()
    this.frameBuilder = this.createBuilder()
    this.frameVisual.mainMaterial = this.ivoryFrameMaterial
    this.frameVisual.meshShadowMode = MeshShadowMode.None
    this.frameVisual.mesh = this.frameBuilder.getMesh()
    this.writeGeometry(this.frameBuilder, buildMedallionFrameGeometry())
    this.glyphVisual.mesh = this.glyphBuilder.getMesh()
    this.glyphVisual.mainMaterial = this.violetGlyphMaterial
    this.glyphVisual.meshShadowMode = MeshShadowMode.None
    this.createEvent('UpdateEvent').bind(() => this.updateTransition())
    this.createEvent('OnDestroyEvent').bind(() => this.onDestroy())
    this.hide()
  }

  hide(): void {
    this.transition = null
    this.medallionRoot.enabled = false
    this.glyphVisual.enabled = false
    this.revealedWordLabel.text = ''
  }

  render(
    sourcePoints: readonly WorldPoint[],
    glyphPoints: readonly QuantizedPoint[],
    revealedWord: string,
    colorId: StrokeColorId,
  ): void {
    this.glyphVisual.mainMaterial = this.glyphMaterial(colorId)
    const inverseGlyphWorld = this.glyphVisual
      .getSceneObject()
      .getTransform()
      .getInvertedWorldTransform()
    let fromDepthCm = 0
    let hasDepth = false
    const from = layoutTransitionSourcePoints(sourcePoints, (point) => {
      const local = inverseGlyphWorld.multiplyPoint(
        new vec3(point.x, point.y, point.z),
      )
      if (!Number.isFinite(local.z)) {
        throw new Error('Invalid medallion transition depth')
      }
      const depth = cleanCoordinate(local.z)
      if (hasDepth && Math.abs(depth - fromDepthCm) > 1e-4) {
        throw new Error('World glyph points must share one display plane')
      }
      fromDepthCm = depth
      hasDepth = true
      return [local.x, local.y]
    })
    const to = layoutGlyphPoints(glyphPoints)
    const initial = interpolatePath(from, to, 0)
    const hasGeometry = this.rebuild(initial, fromDepthCm)
    this.revealedWordLabel.text = revealedWord
    this.glyphVisual.enabled = hasGeometry
    this.medallionRoot.enabled = true
    this.transition = hasGeometry
      ? { from, to, fromDepthCm, startedAtSeconds: this.nowSeconds() }
      : null
  }

  getOwnedResourceCounts(): OwnedGlyphResourceCounts {
    return MEDALLION_RESOURCE_COUNTS
  }

  private rebuild(
    points: readonly GlyphLocalPoint[],
    depthCm = 0,
  ): boolean {
    const builder = this.glyphBuilder
    if (builder === null) return false

    const indexCount = builder.getIndicesCount()
    const vertexCount = builder.getVerticesCount()
    if (indexCount > 0) builder.eraseIndices(0, indexCount)
    if (vertexCount > 0) builder.eraseVertices(0, vertexCount)

    const geometry = buildGlyphMeshGeometry(
      points,
      GLYPH_STROKE_WIDTH_CM,
      depthCm,
    )
    if (geometry.vertices.length === 0) return false
    this.writeGeometry(builder, geometry)
    return true
  }

  private updateTransition(): void {
    const transition = this.transition
    if (transition === null) return
    const elapsedSeconds = Math.max(
      0,
      this.nowSeconds() - transition.startedAtSeconds,
    )
    const progress = Math.min(1, elapsedSeconds / GLYPH_TRANSITION_SECONDS)
    const easedProgress = easeOutCubic(progress)
    const depthCm = progress >= 1
      ? 0
      : transition.fromDepthCm * (1 - easedProgress)
    const hasGeometry = this.rebuild(interpolatePath(
      transition.from,
      transition.to,
      progress,
    ), depthCm)
    this.glyphVisual.enabled = hasGeometry
    if (progress >= 1) this.transition = null
  }

  private nowSeconds(): number {
    const value = getTime()
    return Number.isFinite(value) && value >= 0 ? value : 0
  }

  private glyphMaterial(colorId: StrokeColorId): Material {
    switch (colorId) {
      case 'lemon': return this.lemonGlyphMaterial
      case 'mint': return this.mintGlyphMaterial
      case 'violet': return this.violetGlyphMaterial
    }
  }

  private createBuilder(): MeshBuilder {
    const builder = new MeshBuilder(GLYPH_VERTEX_LAYOUT)
    builder.topology = MeshTopology.Triangles
    builder.indexType = MeshIndexType.UInt16
    return builder
  }

  private writeGeometry(
    builder: MeshBuilder,
    geometry: GlyphMeshGeometry,
  ): void {
    builder.appendVerticesInterleaved(geometry.vertices.flat())
    builder.appendIndices(geometry.indices.slice())
    if (!builder.isValid()) {
      throw new Error('Glyph medallion mesh data is invalid')
    }
    builder.updateMesh()
  }

  private onDestroy(): void {
    this.transition = null
    this.glyphBuilder = null
    this.frameBuilder = null
  }

  private assertBindings(): void {
    if (!this.medallionRoot ||
        !this.frameVisual ||
        !this.glyphVisual ||
        !this.revealedWordLabel ||
        !this.ivoryFrameMaterial ||
        !this.violetGlyphMaterial ||
        !this.lemonGlyphMaterial ||
        !this.mintGlyphMaterial) {
      throw new Error(
        'GlyphMedallionView requires root, frame, glyph, word, and four material bindings',
      )
    }
  }
}
