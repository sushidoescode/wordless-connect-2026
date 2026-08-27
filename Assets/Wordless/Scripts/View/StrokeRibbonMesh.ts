import { MAX_STROKE_POINTS } from '../Core/Protocol'
import type { WorldPoint } from '../Core/Protocol'

export type RibbonVertex = readonly [
  px: number,
  py: number,
  pz: number,
  nx: number,
  ny: number,
  nz: number,
  u: number,
  v: number,
]

export interface CrossedRibbonGeometry {
  readonly vertices: readonly RibbonVertex[]
  readonly indices: readonly number[]
  readonly segmentCount: number
}

interface PlainVector {
  readonly x: number
  readonly y: number
  readonly z: number
}

const UINT16_MAX_INDEX = 0xffff
const PARALLEL_REFERENCE_LIMIT = 0.999

function snapshotPoint(value: unknown): WorldPoint | null {
  try {
    if (typeof value !== 'object' || value === null) return null
    const candidate = value as {
      readonly x?: unknown
      readonly y?: unknown
      readonly z?: unknown
    }
    const x = candidate.x
    const y = candidate.y
    const z = candidate.z
    if (typeof x !== 'number' || !Number.isFinite(x) ||
        typeof y !== 'number' || !Number.isFinite(y) ||
        typeof z !== 'number' || !Number.isFinite(z)) {
      return null
    }
    return { x, y, z }
  }
  catch {
    return null
  }
}

function cross(a: PlainVector, b: PlainVector): PlainVector {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

function normalize(value: PlainVector): PlainVector | null {
  const length = Math.sqrt(
    value.x * value.x + value.y * value.y + value.z * value.z,
  )
  if (!Number.isFinite(length) || length === 0) return null
  return {
    x: value.x / length,
    y: value.y / length,
    z: value.z / length,
  }
}

function clean(value: number): number {
  return Object.is(value, -0) || Math.abs(value) < 1e-12 ? 0 : value
}

function offset(point: WorldPoint, side: PlainVector, amount: number): PlainVector {
  return {
    x: clean(point.x + side.x * amount),
    y: clean(point.y + side.y * amount),
    z: clean(point.z + side.z * amount),
  }
}

function vertex(
  position: PlainVector,
  normal: PlainVector,
  u: number,
  v: number,
): RibbonVertex {
  return [
    position.x,
    position.y,
    position.z,
    clean(normal.x),
    clean(normal.y),
    clean(normal.z),
    u,
    v,
  ]
}

function appendQuad(
  vertices: RibbonVertex[],
  indices: number[],
  start: WorldPoint,
  end: WorldPoint,
  side: PlainVector,
  normal: PlainVector,
  halfWidth: number,
): void {
  const base = vertices.length
  if (base + 3 > UINT16_MAX_INDEX) {
    throw new Error('ribbon geometry exceeds UInt16 vertex capacity')
  }
  vertices.push(
    vertex(offset(start, side, -halfWidth), normal, 0, 0),
    vertex(offset(start, side, halfWidth), normal, 0, 1),
    vertex(offset(end, side, -halfWidth), normal, 1, 0),
    vertex(offset(end, side, halfWidth), normal, 1, 1),
  )
  indices.push(
    base, base + 2, base + 1,
    base + 1, base + 2, base + 3,
  )
}

export function buildCrossedRibbonGeometry(
  points: readonly WorldPoint[],
  widthCm: number,
): CrossedRibbonGeometry {
  if (!Number.isFinite(widthCm) || widthCm <= 0) {
    throw new Error('ribbon width must be a positive finite number')
  }

  const vertices: RibbonVertex[] = []
  const indices: number[] = []
  if (!Array.isArray(points)) return { vertices, indices, segmentCount: 0 }

  const sourceLength = Math.min(points.length, MAX_STROKE_POINTS)
  let segmentCount = 0
  const halfWidth = widthCm / 2
  for (let index = 1; index < sourceLength; index += 1) {
    const start = snapshotPoint(points[index - 1])
    const end = snapshotPoint(points[index])
    if (start === null || end === null) continue

    const direction = normalize({
      x: end.x - start.x,
      y: end.y - start.y,
      z: end.z - start.z,
    })
    if (direction === null) continue

    const reference = Math.abs(direction.z) < PARALLEL_REFERENCE_LIMIT
      ? { x: 0, y: 0, z: 1 }
      : { x: 0, y: 1, z: 0 }
    const sideA = normalize(cross(reference, direction))
    if (sideA === null) continue
    const sideB = normalize(cross(direction, sideA))
    if (sideB === null) continue

    appendQuad(
      vertices,
      indices,
      start,
      end,
      sideA,
      sideB,
      halfWidth,
    )
    appendQuad(
      vertices,
      indices,
      start,
      end,
      sideB,
      { x: -sideA.x, y: -sideA.y, z: -sideA.z },
      halfWidth,
    )
    segmentCount += 1
  }

  return { vertices, indices, segmentCount }
}

const RIBBON_VERTEX_LAYOUT = [
  { name: 'position', components: 3 },
  { name: 'normal', components: 3 },
  { name: 'texture0', components: 2 },
]

export class StrokeRibbonMesh {
  private readonly widthCm: number
  private readonly builder: MeshBuilder
  private readonly mesh: RenderMesh

  constructor(widthCm: number) {
    if (!Number.isFinite(widthCm) || widthCm <= 0) {
      throw new Error('ribbon width must be a positive finite number')
    }
    this.widthCm = widthCm
    this.builder = new MeshBuilder(RIBBON_VERTEX_LAYOUT)
    this.builder.topology = MeshTopology.Triangles
    this.builder.indexType = MeshIndexType.UInt16
    this.mesh = this.builder.getMesh()
  }

  rebuild(points: readonly WorldPoint[]): boolean {
    const vertexCount = this.builder.getVerticesCount()
    const indexCount = this.builder.getIndicesCount()
    if (indexCount > 0) this.builder.eraseIndices(0, indexCount)
    if (vertexCount > 0) this.builder.eraseVertices(0, vertexCount)

    const geometry = buildCrossedRibbonGeometry(points, this.widthCm)
    if (geometry.vertices.length === 0) return false

    this.builder.appendVerticesInterleaved(geometry.vertices.flat())
    this.builder.appendIndices(geometry.indices.slice())
    if (!this.builder.isValid()) {
      throw new Error('ribbon mesh data is invalid')
    }
    this.builder.updateMesh()
    return true
  }

  getMesh(): RenderMesh {
    return this.mesh
  }
}
